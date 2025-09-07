import { simpleGit } from 'simple-git'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import which from 'which'
import { ensureGit, getCurrentBranch, getGitRoot, hasUncommittedChanges, isGitRepository, pushBranch } from './git.js'

vi.mock('simple-git')
vi.mock('which')

describe('git', () => {
	const mockGit = {
		revparse: vi.fn(),
		status: vi.fn(),
		checkout: vi.fn(),
		fetch: vi.fn(),
		merge: vi.fn(),
		rebase: vi.fn(),
		push: vi.fn(),
		listRemote: vi.fn(),
		raw: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as ReturnType<typeof simpleGit>)
	})

	describe('ensureGit', () => {
		it('finds git tool', async () => {
			vi.mocked(which).mockResolvedValueOnce('/usr/bin/git')

			const result = await ensureGit()
			expect(result).toBe('/usr/bin/git')
			expect(which).toHaveBeenCalledWith('git')
		})

		it('throws when git is missing', async () => {
			vi.mocked(which).mockRejectedValue(new Error('not found'))
			await expect(ensureGit()).rejects.toThrow()
		})
	})

	describe('getCurrentBranch', () => {
		it('gets current branch name', async () => {
			mockGit.revparse.mockResolvedValue('feature/test')

			const result = await getCurrentBranch('/repo')

			expect(result).toBe('feature/test')
			expect(simpleGit).toHaveBeenCalledWith('/repo')
			expect(mockGit.revparse).toHaveBeenCalledWith(['--abbrev-ref', 'HEAD'])
		})

		it('returns empty string when command fails', async () => {
			mockGit.revparse.mockRejectedValue(new Error('not a git repo'))

			const result = await getCurrentBranch('/repo')

			expect(result).toBe('')
		})
	})

	describe('getGitRoot', () => {
		it('gets git root directory', async () => {
			mockGit.revparse.mockResolvedValue('/path/to/repo')

			const result = await getGitRoot('/repo/subdir')

			expect(result).toBe('/path/to/repo')
			expect(mockGit.revparse).toHaveBeenCalledWith(['--show-toplevel'])
		})

		it('returns null when not in git repo', async () => {
			mockGit.revparse.mockRejectedValue(new Error('not a git repo'))

			const result = await getGitRoot('/not-repo')

			expect(result).toBe(null)
		})
	})

	describe('isGitRepository', () => {
		it('returns true when in git repository', async () => {
			mockGit.revparse.mockResolvedValue('.git')

			const result = await isGitRepository('/repo')

			expect(result).toBe(true)
			expect(mockGit.revparse).toHaveBeenCalledWith(['--git-dir'])
		})

		it('returns false when not in git repository', async () => {
			mockGit.revparse.mockRejectedValue(new Error('not a git repo'))

			const result = await isGitRepository('/not-repo')

			expect(result).toBe(false)
		})
	})

	describe('hasUncommittedChanges', () => {
		it('returns true when there are uncommitted changes', async () => {
			mockGit.status.mockResolvedValue({ files: [{ path: 'file.txt' }, { path: 'new-file.js' }] })

			const result = await hasUncommittedChanges('/repo')

			expect(result).toBe(true)
			expect(simpleGit).toHaveBeenCalledWith('/repo')
			expect(mockGit.status).toHaveBeenCalled()
		})

		it('returns false when working tree is clean', async () => {
			mockGit.status.mockResolvedValue({ files: [] })

			const result = await hasUncommittedChanges('/repo')

			expect(result).toBe(false)
		})

		it('returns true when git status fails', async () => {
			mockGit.status.mockRejectedValue(new Error('not a git repository'))

			const result = await hasUncommittedChanges('/repo')

			expect(result).toBe(true)
		})
	})

	describe('pushBranch rebase behavior', () => {
		it('uses forced replay rebase to reset timestamps', async () => {
			// Arrange
			// Working tree clean -> no stash
			mockGit.status.mockResolvedValue({ files: [] })
			// No remote branch exists
			mockGit.listRemote.mockResolvedValue('')
			// Base fetch ok
			mockGit.fetch.mockResolvedValue(undefined)
			mockGit.checkout.mockResolvedValue(undefined)
			mockGit.merge.mockResolvedValue(undefined)
			mockGit.rebase.mockResolvedValue(undefined)
			mockGit.push.mockResolvedValue(undefined)
			mockGit.revparse.mockResolvedValue('original-branch')

			// Act
			await pushBranch({
				cwd: '/repo',
				branch: 'feature/test',
				remote: 'origin',
				pushMode: 'force-with-lease',
				base: 'main',
				rebase: true,
			})

			// Assert - rebase should be called with --onto <base> <base>
			expect(mockGit.rebase).toHaveBeenCalledWith(['--onto', 'origin/main', 'origin/main'])
		})

		it('does nothing when rebase not requested', async () => {
			mockGit.status.mockResolvedValue({ files: [] })
			mockGit.listRemote.mockResolvedValue('')
			mockGit.checkout.mockResolvedValue(undefined)
			mockGit.push.mockResolvedValue(undefined)
			mockGit.revparse.mockResolvedValue('original-branch')

			await pushBranch({
				cwd: '/repo',
				branch: 'feature/test',
				remote: 'origin',
				pushMode: 'force-with-lease',
			})

			expect(mockGit.rebase).not.toHaveBeenCalled()
		})
	})
})
