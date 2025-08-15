import { execa } from 'execa'
import { simpleGit } from 'simple-git'
import which from 'which'
import { logger } from './logger.js'

export async function ensureGh(): Promise<string> {
	return await which('gh')
}

export async function gh(cwd: string, args: string[]) {
	const options = args.includes('auth') ? { cwd, timeout: 8000 } : { cwd }
	const { stdout } = await execa('gh', args, options)
	return stdout.trim()
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
	title: string
	body: string
	labels?: string[]
	reviewers?: string[]
	assignees?: string[]
	repo?: string
	draft?: boolean
	autoMerge?: boolean
}): Promise<string> {
	const { cwd, branch, base, title, body } = opts

	const args = ['pr', 'create', '--head', branch, '--base', base, '--title', title, '--body', body]

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
			await gh(cwd, ['pr', 'merge', prUrl, '--auto', '--merge'])
		} catch (error) {
			logger.warn(`Could not enable auto-merge: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	return result
}
