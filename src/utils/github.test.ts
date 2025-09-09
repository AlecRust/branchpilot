import { execa } from 'execa'
import { simpleGit } from 'simple-git'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import which from 'which'
import * as githubModule from './github.js'
import { createOrUpdatePr, ensureGh, getDefaultBranch, gh } from './github.js'

vi.mock('execa')
vi.mock('simple-git')
vi.mock('which')

describe('github', () => {
	const mockGit = {
		raw: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as ReturnType<typeof simpleGit>)
	})

	const mockExecaResult = (stdout = '') =>
		({
			stdout,
			stderr: '',
			exitCode: 0,
			failed: false,
			command: '',
			escapedCommand: '',
			timedOut: false,
			isCanceled: false,
			all: undefined,
			stdio: [undefined, stdout, ''],
			ipcOutput: [],
			pipedFrom: [],
			cwd: '',
			duration: 0,
			durationMs: 0,
			isGracefullyCanceled: false,
			isMaxBuffer: false,
			isTerminated: false,
			isForcefullyTerminated: false,
		}) as unknown as ReturnType<typeof execa>

	describe('ensureGh', () => {
		it('finds gh tool', async () => {
			vi.mocked(which).mockResolvedValueOnce('/usr/bin/gh')

			const result = await ensureGh()
			expect(result).toBe('/usr/bin/gh')
			expect(which).toHaveBeenCalledWith('gh')
		})

		it('throws when gh is missing', async () => {
			vi.mocked(which).mockRejectedValue(new Error('not found'))
			await expect(ensureGh()).rejects.toThrow()
		})
	})

	describe('gh command', () => {
		it('executes commands and returns trimmed output', async () => {
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('  output  \n') as any)

			const result = await gh('/repo', ['status'])

			expect(execa).toHaveBeenCalledWith('gh', ['status'], { cwd: '/repo', stdin: 'ignore', timeout: 5000 })
			expect(result).toBe('output')
		})

		it('prevents interactive input for all commands', async () => {
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('authenticated') as any)

			await gh('/repo', ['auth', 'status'])

			expect(execa).toHaveBeenCalledWith('gh', ['auth', 'status'], { cwd: '/repo', stdin: 'ignore', timeout: 5000 })
		})
	})

	describe('getDefaultBranch', () => {
		it('gets default branch from GitHub', async () => {
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('{"defaultBranchRef":{"name":"develop"}}') as any)

			const result = await getDefaultBranch('/repo')

			expect(result).toBe('develop')
			expect(execa).toHaveBeenCalledWith('gh', ['repo', 'view', '--json', 'defaultBranchRef'], {
				cwd: '/repo',
				stdin: 'ignore',
				timeout: 5000,
			})
		})

		it('falls back to main when all methods fail', async () => {
			vi.mocked(execa).mockRejectedValueOnce(new Error('gh not authenticated'))
			mockGit.raw.mockRejectedValueOnce(new Error('no remote HEAD'))

			const result = await getDefaultBranch('/repo')

			expect(result).toBe('main')
		})
	})

	describe('createOrUpdatePr', () => {
		it('builds basic PR command', async () => {
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('url') as any)

			await createOrUpdatePr({
				cwd: '/repo',
				branch: 'feature',
				base: 'main',
				title: 'Title',
				body: 'Body',
			})

			expect(execa).toHaveBeenCalledWith(
				'gh',
				['pr', 'create', '--head', 'feature', '--base', 'main', '--title', 'Title', '--body', 'Body'],
				{ cwd: '/repo', stdin: 'ignore', timeout: 5000 },
			)
		})

		it('adds optional fields when provided', async () => {
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('url') as any)

			await createOrUpdatePr({
				cwd: '/repo',
				branch: 'feature',
				base: 'main',
				title: 'Title',
				body: 'Body',
				labels: ['bug'],
				draft: true,
			})

			const args = vi.mocked(execa).mock.calls[0]?.[1]
			expect(args).toContain('--label')
			expect(args).toContain('bug')
			expect(args).toContain('--draft')
		})

		it('skips empty arrays', async () => {
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('url') as any)

			await createOrUpdatePr({
				cwd: '/repo',
				branch: 'feature',
				base: 'main',
				title: 'Title',
				body: 'Body',
				labels: [],
			})

			const args = vi.mocked(execa).mock.calls[0]?.[1]
			expect(args).not.toContain('--label')
		})

		it('uses --fill when title and body are not provided', async () => {
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('url') as any)

			await createOrUpdatePr({
				cwd: '/repo',
				branch: 'feature',
				base: 'main',
			})

			const args = vi.mocked(execa).mock.calls[0]?.[1]
			expect(args).toContain('--fill')
			expect(args).not.toContain('--title')
			expect(args).not.toContain('--body')
		})

		it('uses title without body when only title is provided', async () => {
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('url') as any)

			await createOrUpdatePr({
				cwd: '/repo',
				branch: 'feature',
				base: 'main',
				title: 'Custom Title',
			})

			const args = vi.mocked(execa).mock.calls[0]?.[1]
			expect(args).toContain('--title')
			expect(args).toContain('Custom Title')
			expect(args).not.toContain('--body')
			expect(args).not.toContain('--fill')
		})

		it('enables auto-merge using an allowed method (prefers squash)', async () => {
			// 1) pr create -> returns PR URL
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('https://github.com/owner/repo/pull/123') as any)

			// 2) repo view -> allowed methods only squash
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(
				mockExecaResult(
					JSON.stringify({ mergeCommitAllowed: false, rebaseMergeAllowed: false, squashMergeAllowed: true }),
				) as any,
			)

			// 3) pr merge -> success
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('') as any)

			await createOrUpdatePr({
				cwd: '/repo',
				branch: 'feature',
				base: 'main',
				autoMerge: true,
				repo: 'owner/repo',
			})

			// Validate auto-merge call
			const mergeArgs = vi.mocked(execa).mock.calls[2]?.[1] as string[]
			expect(mergeArgs.slice(0, 3)).toEqual(['pr', 'merge', 'https://github.com/owner/repo/pull/123'])
			expect(mergeArgs).toContain('--auto')
			expect(mergeArgs).toContain('--squash')
			expect(mergeArgs).toContain('--repo')
			expect(mergeArgs).toContain('owner/repo')
		})

		it('enables auto-merge with merge commit when allowed', async () => {
			// 1) pr create -> returns PR URL
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('https://github.com/owner/repo/pull/456') as any)

			// 2) repo view -> only merge commit allowed
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(
				mockExecaResult(
					JSON.stringify({ mergeCommitAllowed: true, rebaseMergeAllowed: false, squashMergeAllowed: false }),
				) as any,
			)

			// 3) pr merge -> success
			// biome-ignore lint/suspicious/noExplicitAny: complex execa mock typing
			vi.mocked(execa).mockResolvedValueOnce(mockExecaResult('') as any)

			await createOrUpdatePr({
				cwd: '/repo',
				branch: 'feature',
				base: 'main',
				autoMerge: true,
			})

			const mergeArgs = vi.mocked(execa).mock.calls[2]?.[1] as string[]
			expect(mergeArgs).toContain('--auto')
			expect(mergeArgs).toContain('--merge')
			// ensure we didn't pick other methods
			expect(mergeArgs).not.toContain('--squash')
			expect(mergeArgs).not.toContain('--rebase')
		})
	})
})
