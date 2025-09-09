import { execa } from 'execa'
import { simpleGit } from 'simple-git'
import which from 'which'
import { logger } from './logger.js'

export async function ensureGh(): Promise<string> {
	return await which('gh')
}

export async function gh(cwd: string, args: string[], timeout = 5000) {
	// Use 'ignore' for stdin to prevent any commands from waiting for input
	const { stdout } = await execa('gh', args, {
		cwd,
		stdin: 'ignore',
		timeout,
	})
	return stdout.trim()
}

type MergeMethod = '--merge' | '--squash' | '--rebase'

async function detectAllowedMergeMethod(cwd: string, repo?: string): Promise<MergeMethod | null> {
	try {
		const args = ['repo', 'view']
		if (repo) {
			args.push('--repo', repo)
		}
		args.push('--json', 'mergeCommitAllowed,rebaseMergeAllowed,squashMergeAllowed')
		const result = await gh(cwd, args)
		const data = JSON.parse(result) as {
			mergeCommitAllowed?: boolean
			rebaseMergeAllowed?: boolean
			squashMergeAllowed?: boolean
		}

		// Prefer squash when available; then merge; then rebase
		if (data.squashMergeAllowed) return '--squash'
		if (data.mergeCommitAllowed) return '--merge'
		if (data.rebaseMergeAllowed) return '--rebase'
	} catch (error) {
		// If we cannot detect, fall through and return null; caller will handle
		logger.debug(`Could not detect allowed merge methods: ${error instanceof Error ? error.message : String(error)}`)
	}
	return null
}

export async function getDefaultBranch(cwd: string): Promise<string> {
	try {
		const result = await gh(cwd, ['repo', 'view', '--json', 'defaultBranchRef'])
		const data = JSON.parse(result)
		return data.defaultBranchRef?.name || 'main'
	} catch {
		try {
			const git = simpleGit(cwd)
			const result = await git.raw(['symbolic-ref', 'refs/remotes/origin/HEAD'])
			const branch = result.trim().replace('refs/remotes/origin/', '')
			return branch
		} catch {
			return 'main'
		}
	}
}

export async function createOrUpdatePr(opts: {
	cwd: string
	branch: string
	base: string
	title?: string
	body?: string
	labels?: string[]
	reviewers?: string[]
	assignees?: string[]
	repo?: string
	draft?: boolean
	autoMerge?: boolean
}): Promise<string> {
	const { cwd, branch, base, title, body } = opts

	const args = ['pr', 'create', '--head', branch, '--base', base]

	if (title) {
		args.push('--title', title)
	}

	if (body) {
		args.push('--body', body)
	}

	// If neither title nor body is provided, use --fill to auto-generate from commits
	if (!title && !body) {
		args.push('--fill')
	}

	if (opts.labels && opts.labels.length > 0) {
		args.push('--label', ...opts.labels)
	}

	if (opts.reviewers && opts.reviewers.length > 0) {
		args.push('--reviewer', ...opts.reviewers)
	}

	if (opts.assignees && opts.assignees.length > 0) {
		args.push('--assignee', ...opts.assignees)
	}

	if (opts.repo) {
		args.push('--repo', opts.repo)
	}

	if (opts.draft) {
		args.push('--draft')
	}

	const result = await gh(cwd, args)

	if (opts.autoMerge) {
		const prUrl = result.trim()
		try {
			// Pick a merge method allowed by the repo
			const method = await detectAllowedMergeMethod(cwd, opts.repo)
			if (!method) {
				logger.warn('Could not enable auto-merge: no merge methods allowed on repository')
			} else {
				const mergeArgs = ['pr', 'merge', prUrl, '--auto', method]
				if (opts.repo) {
					mergeArgs.push('--repo', opts.repo)
				}
				// Give the gh call a bit more time just in case
				await gh(cwd, mergeArgs, 15000)
			}
		} catch (error) {
			logger.warn(`Could not enable auto-merge: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	return result
}
