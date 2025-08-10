import { execa } from 'execa'
import which from 'which'
import type { PushMode } from './types.js'

export async function ensureTools(): Promise<{ git: string; gh: string }> {
	const git = await which('git')
	const gh = await which('gh')
	return { git, gh }
}

export async function git(cwd: string, args: string[]) {
	const { stdout } = await execa('git', args, { cwd })
	return stdout.trim()
}

export async function gh(cwd: string, args: string[]) {
	const { stdout } = await execa('gh', args, { cwd })
	return stdout.trim()
}

export async function getCurrentBranch(cwd: string): Promise<string> {
	try {
		const result = await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
		return result
	} catch {
		// If we can't get the current branch, return empty string
		return ''
	}
}

export async function getGitRoot(cwd: string): Promise<string | null> {
	try {
		const result = await git(cwd, ['rev-parse', '--show-toplevel'])
		return result
	} catch {
		// Not in a git repository
		return null
	}
}

export async function getDefaultBranch(cwd: string): Promise<string> {
	try {
		// Try to get the default branch from GitHub
		const result = await gh(cwd, ['repo', 'view', '--json', 'defaultBranchRef'])
		const data = JSON.parse(result)
		return data.defaultBranchRef?.name || 'main'
	} catch {
		// Fallback to git's default branch detection
		try {
			const result = await git(cwd, ['symbolic-ref', 'refs/remotes/origin/HEAD'])
			return result.replace('refs/remotes/origin/', '')
		} catch {
			// Final fallback
			return 'main'
		}
	}
}

export async function pushBranch(opts: {
	cwd: string
	branch: string
	base?: string // only needed if rebase is true
	rebase?: boolean // whether to rebase onto base branch
	remote: string
	pushMode: PushMode
}) {
	const { cwd, branch, base, rebase, remote, pushMode } = opts

	// Checkout the branch locally
	await git(cwd, ['checkout', branch])

	// Check if the branch exists on remote
	const lsRemoteOutput = await git(cwd, ['ls-remote', '--heads', remote, branch])
	const branchExistsOnRemote = lsRemoteOutput.length > 0

	// If branch exists on remote, fetch and merge it
	if (branchExistsOnRemote) {
		await git(cwd, ['fetch', remote, branch])
		// Merge the remote branch (equivalent to pull but doesn't require upstream tracking)
		await git(cwd, ['merge', '--ff-only', `${remote}/${branch}`])
	} else {
		// Branch doesn't exist on remote - unset any stale upstream tracking to avoid push errors
		try {
			await git(cwd, ['branch', '--unset-upstream'])
		} catch {
			// Branch might not have upstream set, that's fine
		}
	}

	// Only rebase if explicitly requested
	if (rebase && base) {
		// Fetch the base branch from remote to ensure we have latest
		await git(cwd, ['fetch', remote, base])

		try {
			await git(cwd, ['rebase', `${remote}/${base}`])
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e)
			throw new Error(`Rebase failed: ${msg}`)
		}
	}

	// Push the branch to remote
	const pushArgs = ['push']

	// If branch doesn't exist on remote, don't use --force-with-lease as it may fail with stale tracking info
	if (branchExistsOnRemote) {
		if (pushMode === 'force-with-lease') pushArgs.push('--force-with-lease')
		if (pushMode === 'ff-only') pushArgs.push('--ff-only')
		if (pushMode === 'force') pushArgs.push('--force')
	}
	// For new branches, just push normally (or with --force if specified)
	else if (pushMode === 'force') {
		pushArgs.push('--force')
	}

	pushArgs.push(remote, branch)

	await git(cwd, pushArgs)
}

export async function createOrUpdatePr(opts: {
	cwd: string
	branch: string
	base: string
	title: string
	body: string
	labels?: string[]
	reviewers?: string[]
	assignees?: string[]
	repo?: string // optional owner/name
	draft?: boolean // whether to open PR as a draft
}) {
	const { cwd, branch, base, title, body, labels, reviewers, assignees, repo, draft } = opts

	const common = repo ? ['--repo', repo] : []

	// Create new PR (we've already checked it doesn't exist in run.ts)
	const args = ['pr', 'create', '--title', title, '--base', base, '--head', branch, '--body', body]

	// Add draft flag if specified
	if (draft) {
		args.push('--draft')
	}

	args.push(...common)
	const url = await gh(cwd, args)

	// Add labels, reviewers, and assignees if specified
	if (labels?.length) await gh(cwd, ['pr', 'edit', url, '--add-label', labels.join(','), ...common])
	if (reviewers?.length) await gh(cwd, ['pr', 'edit', url, '--add-reviewer', reviewers.join(','), ...common])
	if (assignees?.length) await gh(cwd, ['pr', 'edit', url, '--add-assignee', assignees.join(','), ...common])

	return url
}
