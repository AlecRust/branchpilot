import { simpleGit } from 'simple-git'
import which from 'which'
import type { PushMode } from './types.js'

export async function ensureGit(): Promise<string> {
	return await which('git')
}

export async function getCurrentBranch(cwd: string): Promise<string> {
	try {
		const git = simpleGit(cwd)
		const result = await git.revparse(['--abbrev-ref', 'HEAD'])
		return result.trim()
	} catch {
		return ''
	}
}

export async function getGitRoot(cwd: string): Promise<string | null> {
	try {
		const git = simpleGit(cwd)
		const result = await git.revparse(['--show-toplevel'])
		return result.trim()
	} catch {
		return null
	}
}

export async function isGitRepository(cwd: string): Promise<boolean> {
	try {
		const git = simpleGit(cwd)
		await git.revparse(['--git-dir'])
		return true
	} catch {
		return false
	}
}

export async function hasUncommittedChanges(cwd: string): Promise<boolean> {
	try {
		const git = simpleGit(cwd)
		const status = await git.status()
		return status.files.length > 0
	} catch {
		return true
	}
}

export async function hasUnmergedCommits(cwd: string, branch: string, base: string, remote: string): Promise<boolean> {
	const git = simpleGit(cwd)

	try {
		await git.revparse(['--verify', branch])
	} catch {
		return false
	}

	try {
		await git.revparse(['--verify', `${remote}/${base}`])
	} catch {
		return true
	}

	try {
		const result = await git.raw(['rev-list', '--count', `${remote}/${base}..${branch}`])
		return Number.parseInt(result.trim(), 10) > 0
	} catch {
		return true
	}
}

export async function isBranchMerged(cwd: string, branch: string, base: string, remote: string): Promise<boolean> {
	const git = simpleGit(cwd)

	try {
		await git.revparse(['--verify', branch])
	} catch {
		return false
	}

	try {
		const result = await git.raw(['branch', '--merged', `${remote}/${base}`])
		return result.includes(branch)
	} catch {
		return false
	}
}

export async function pushBranch(opts: {
	cwd: string
	branch: string
	remote: string
	pushMode: PushMode
	base?: string
	rebase?: boolean
}): Promise<void> {
	const { cwd, branch, remote, pushMode } = opts
	const git = simpleGit(cwd)

	const originalBranch = await getCurrentBranch(cwd)
	const hasChanges = await hasUncommittedChanges(cwd)
	const stashName = hasChanges ? `branchpilot-${Date.now()}` : null

	try {
		if (stashName) {
			await git.stash(['push', '-m', stashName, '--include-untracked'])
		}

		await git.checkout(branch)

		const remoteBranchExists = await git
			.listRemote(['--heads', remote, branch])
			.then(() => true)
			.catch(() => false)

		if (remoteBranchExists) {
			await git.fetch(remote, branch)
			await git.merge([`${remote}/${branch}`, '--ff-only'])
		}

		if (opts.rebase && opts.base) {
			await git.fetch(remote, opts.base)
			await git.rebase([`${remote}/${opts.base}`])
		}

		const pushOptions: string[] = []
		if (pushMode === 'force-with-lease') {
			pushOptions.push('--force-with-lease')
		} else if (pushMode === 'force') {
			pushOptions.push('--force')
		}

		await git.push(remote, branch, pushOptions)
	} finally {
		if (originalBranch && originalBranch !== branch) {
			await git.checkout(originalBranch).catch(() => {})
		}

		if (stashName) {
			const stashList = await git.stashList()
			const stashEntry = stashList.all.find((entry) => entry.message?.includes(stashName))
			if (stashEntry) {
				await git.stash(['pop', `stash@{${stashList.all.indexOf(stashEntry)}}`]).catch(() => {})
			}
		}
	}
}
