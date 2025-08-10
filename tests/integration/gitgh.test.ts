import { execa } from 'execa'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import which from 'which'
import {
	createOrUpdatePr,
	ensureTools,
	getCurrentBranch,
	getDefaultBranch,
	getGitRoot,
	git,
	pushBranch,
} from '../../src/core/gitgh.js'

vi.mock('execa')
vi.mock('which')

describe('gitgh', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	const mockExecaResult = (stdout = '', stderr = '') => ({
		stdout,
		stderr,
		exitCode: 0,
		failed: false,
		command: '',
		escapedCommand: '',
		timedOut: false,
		killed: false,
		isCanceled: false,
	})

	describe('ensureTools', () => {
		it('finds git and gh tools', async () => {
			vi.mocked(which).mockImplementation(async (cmd) => {
				if (cmd === 'git') return '/usr/bin/git'
				if (cmd === 'gh') return '/usr/bin/gh'
				throw new Error('Not found')
			})

			const result = await ensureTools()
			expect(result).toEqual({ git: '/usr/bin/git', gh: '/usr/bin/gh' })
		})

		it('throws when tools missing', async () => {
			vi.mocked(which).mockRejectedValue(new Error('not found'))
			await expect(ensureTools()).rejects.toThrow()
		})
	})

	describe('git and gh commands', () => {
		it('executes commands and returns trimmed output', async () => {
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('  output  \n'))

			const result = await git('/repo', ['status'])

			expect(execa).toHaveBeenCalledWith('git', ['status'], { cwd: '/repo' })
			expect(result).toBe('output')
		})
	})

	describe('pushBranch', () => {
		it('performs push without rebase by default', async () => {
			vi.mocked(execa)
				.mockResolvedValueOnce(mockExecaResult('success')) // checkout
				.mockResolvedValueOnce(mockExecaResult('refs/heads/feature/test')) // ls-remote (branch exists)
				.mockResolvedValueOnce(mockExecaResult('success')) // fetch branch
				.mockResolvedValueOnce(mockExecaResult('success')) // merge
				.mockResolvedValueOnce(mockExecaResult('success')) // push

			await pushBranch({
				cwd: '/repo',
				branch: 'feature/test',
				remote: 'origin',
				pushMode: 'force-with-lease',
			})

			const calls = vi.mocked(execa).mock.calls
			expect(calls[0]).toEqual(['git', ['checkout', 'feature/test'], { cwd: '/repo' }])
			expect(calls[1]).toEqual(['git', ['ls-remote', '--heads', 'origin', 'feature/test'], { cwd: '/repo' }])
			expect(calls[2]).toEqual(['git', ['fetch', 'origin', 'feature/test'], { cwd: '/repo' }])
			expect(calls[3]).toEqual(['git', ['merge', '--ff-only', 'origin/feature/test'], { cwd: '/repo' }])
			expect(calls[4]).toEqual(['git', ['push', '--force-with-lease', 'origin', 'feature/test'], { cwd: '/repo' }])
		})

		it('performs rebase when requested', async () => {
			vi.mocked(execa)
				.mockResolvedValueOnce(mockExecaResult('success')) // checkout
				.mockResolvedValueOnce(mockExecaResult('refs/heads/feature/test')) // ls-remote (branch exists)
				.mockResolvedValueOnce(mockExecaResult('success')) // fetch branch
				.mockResolvedValueOnce(mockExecaResult('success')) // merge
				.mockResolvedValueOnce(mockExecaResult('success')) // fetch base
				.mockResolvedValueOnce(mockExecaResult('success')) // rebase
				.mockResolvedValueOnce(mockExecaResult('success')) // push

			await pushBranch({
				cwd: '/repo',
				branch: 'feature/test',
				base: 'main',
				rebase: true,
				remote: 'origin',
				pushMode: 'force-with-lease',
			})

			const calls = vi.mocked(execa).mock.calls
			expect(calls[0]).toEqual(['git', ['checkout', 'feature/test'], { cwd: '/repo' }])
			expect(calls[1]).toEqual(['git', ['ls-remote', '--heads', 'origin', 'feature/test'], { cwd: '/repo' }])
			expect(calls[2]).toEqual(['git', ['fetch', 'origin', 'feature/test'], { cwd: '/repo' }])
			expect(calls[3]).toEqual(['git', ['merge', '--ff-only', 'origin/feature/test'], { cwd: '/repo' }])
			expect(calls[4]).toEqual(['git', ['fetch', 'origin', 'main'], { cwd: '/repo' }])
			expect(calls[5]).toEqual(['git', ['rebase', 'origin/main'], { cwd: '/repo' }])
			expect(calls[6]).toEqual(['git', ['push', '--force-with-lease', 'origin', 'feature/test'], { cwd: '/repo' }])
		})

		it('handles different push modes', async () => {
			vi.mocked(execa).mockResolvedValue(mockExecaResult('success'))

			// Test ff-only
			await pushBranch({
				cwd: '/repo',
				branch: 'test',
				remote: 'origin',
				pushMode: 'ff-only',
			})

			let lastCall = vi.mocked(execa).mock.calls.at(-1)
			expect(lastCall?.[1]).toContain('--ff-only')

			// Test force
			await pushBranch({
				cwd: '/repo',
				branch: 'test',
				remote: 'origin',
				pushMode: 'force',
			})

			lastCall = vi.mocked(execa).mock.calls.at(-1)
			expect(lastCall?.[1]).toContain('--force')
		})

		it('handles local-only branches', async () => {
			vi.mocked(execa)
				.mockResolvedValueOnce(mockExecaResult('success')) // checkout
				.mockResolvedValueOnce(mockExecaResult('')) // ls-remote returns empty (branch doesn't exist)
				.mockImplementationOnce(() => Promise.reject(new Error('no upstream'))) // branch --unset-upstream (might fail)
				.mockResolvedValueOnce(mockExecaResult('success')) // push

			await pushBranch({
				cwd: '/repo',
				branch: 'new-feature',
				remote: 'origin',
				pushMode: 'force-with-lease',
			})

			const calls = vi.mocked(execa).mock.calls
			expect(calls[0]).toEqual(['git', ['checkout', 'new-feature'], { cwd: '/repo' }])
			expect(calls[1]).toEqual(['git', ['ls-remote', '--heads', 'origin', 'new-feature'], { cwd: '/repo' }])
			expect(calls[2]).toEqual(['git', ['branch', '--unset-upstream'], { cwd: '/repo' }])
			// For new branches, we don't use --force-with-lease to avoid stale tracking issues
			expect(calls[3]).toEqual(['git', ['push', 'origin', 'new-feature'], { cwd: '/repo' }])
		})

		it('handles rebase failures', async () => {
			vi.mocked(execa)
				.mockResolvedValueOnce(mockExecaResult('ok')) // checkout
				.mockResolvedValueOnce(mockExecaResult('refs/heads/test')) // ls-remote (branch exists)
				.mockResolvedValueOnce(mockExecaResult('ok')) // fetch branch
				.mockResolvedValueOnce(mockExecaResult('ok')) // merge
				.mockResolvedValueOnce(mockExecaResult('ok')) // fetch base
				.mockRejectedValueOnce(new Error('Merge conflict')) // rebase fails

			await expect(
				pushBranch({
					cwd: '/repo',
					branch: 'test',
					base: 'main',
					rebase: true,
					remote: 'origin',
					pushMode: 'force-with-lease',
				}),
			).rejects.toThrow('Rebase failed')
		})
	})

	describe('getCurrentBranch', () => {
		it('gets current branch name', async () => {
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('feature/test'))

			const result = await getCurrentBranch('/repo')

			expect(result).toBe('feature/test')
			expect(execa).toHaveBeenCalledWith('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: '/repo' })
		})

		it('returns empty string when git command fails', async () => {
			vi.mocked(execa).mockRejectedValueOnce(new Error('not a git repository'))

			const result = await getCurrentBranch('/repo')

			expect(result).toBe('')
		})
	})

	describe('getGitRoot', () => {
		it('returns git repository root', async () => {
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('/path/to/repo'))

			const result = await getGitRoot('/path/to/repo/subdir')

			expect(result).toBe('/path/to/repo')
			expect(execa).toHaveBeenCalledWith('git', ['rev-parse', '--show-toplevel'], { cwd: '/path/to/repo/subdir' })
		})

		it('returns null when not in a git repository', async () => {
			vi.mocked(execa).mockRejectedValueOnce(new Error('not a git repository'))

			const result = await getGitRoot('/not/a/repo')

			expect(result).toBeNull()
		})
	})

	describe('getDefaultBranch', () => {
		it('gets default branch from GitHub', async () => {
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('{"defaultBranchRef":{"name":"develop"}}'))

			const result = await getDefaultBranch('/repo')

			expect(result).toBe('develop')
			expect(execa).toHaveBeenCalledWith('gh', ['repo', 'view', '--json', 'defaultBranchRef'], { cwd: '/repo' })
		})

		it('falls back to git when gh fails', async () => {
			vi.mocked(execa)
				.mockRejectedValueOnce(new Error('gh not authenticated'))
				.mockResolvedValueOnce(mockExecaResult('refs/remotes/origin/master'))

			const result = await getDefaultBranch('/repo')

			expect(result).toBe('master')
			const calls = vi.mocked(execa).mock.calls
			expect(calls[0]).toEqual(['gh', ['repo', 'view', '--json', 'defaultBranchRef'], { cwd: '/repo' }])
			expect(calls[1]).toEqual(['git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: '/repo' }])
		})

		it('falls back to main when all methods fail', async () => {
			vi.mocked(execa)
				.mockRejectedValueOnce(new Error('gh not authenticated'))
				.mockRejectedValueOnce(new Error('no remote HEAD'))

			const result = await getDefaultBranch('/repo')

			expect(result).toBe('main')
		})
	})

	describe('createOrUpdatePr', () => {
		it('creates new PR', async () => {
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('https://github.com/owner/repo/pull/123'))

			const url = await createOrUpdatePr({
				cwd: '/repo',
				branch: 'feature/test',
				base: 'main',
				title: 'Test PR',
				body: 'Test body',
			})

			expect(url).toBe('https://github.com/owner/repo/pull/123')
			const createCall = vi.mocked(execa).mock.calls[0]
			expect(createCall[0]).toBe('gh')
			expect(createCall[1]).toContain('pr')
			expect(createCall[1]).toContain('create')
		})

		it('adds labels, reviewers, and assignees', async () => {
			vi.mocked(execa)
				.mockResolvedValueOnce(mockExecaResult('https://github.com/owner/repo/pull/124'))
				.mockResolvedValue(mockExecaResult('success'))

			await createOrUpdatePr({
				cwd: '/repo',
				branch: 'test',
				base: 'main',
				title: 'Test',
				body: 'Body',
				labels: ['bug'],
				reviewers: ['alice'],
				assignees: ['bob'],
			})

			const calls = vi.mocked(execa).mock.calls
			expect(calls[1][1]).toContain('--add-label')
			expect(calls[2][1]).toContain('--add-reviewer')
			expect(calls[3][1]).toContain('--add-assignee')
		})
	})
})
