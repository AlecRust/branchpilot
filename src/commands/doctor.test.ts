import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as git from '../utils/git.js'
import * as github from '../utils/github.js'
import { logger } from '../utils/logger.js'
import { runDoctor } from './doctor.js'

vi.mock('../utils/git.js')
vi.mock('../utils/github.js')

describe('doctor', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('runDoctor', () => {
		it('should return true when all tools are present and auth is configured', async () => {
			vi.mocked(git.ensureGit).mockResolvedValue('/usr/bin/git')
			vi.mocked(github.ensureGh).mockResolvedValue('/usr/bin/gh')
			vi.mocked(github.gh).mockResolvedValue('Logged in to github.com as user')

			const result = await runDoctor()

			expect(result).toBe(true)
			expect(logger.success).toHaveBeenCalledWith('git: /usr/bin/git')
			expect(logger.success).toHaveBeenCalledWith('gh:  /usr/bin/gh')
			expect(logger.success).toHaveBeenCalledWith('gh auth')
		})

		it('should return false when git or gh is missing', async () => {
			vi.mocked(git.ensureGit).mockRejectedValue(new Error('git not found'))

			const result = await runDoctor()

			expect(result).toBe(false)
			expect(logger.error).toHaveBeenCalledWith('Missing git and/or gh on PATH')
		})

		it('should return false when gh auth is not configured', async () => {
			vi.mocked(git.ensureGit).mockResolvedValue('/usr/bin/git')
			vi.mocked(github.ensureGh).mockResolvedValue('/usr/bin/gh')
			vi.mocked(github.gh).mockRejectedValue(new Error('Not authenticated'))

			const result = await runDoctor()

			expect(result).toBe(false)
			expect(logger.success).toHaveBeenCalledWith('git: /usr/bin/git')
			expect(logger.success).toHaveBeenCalledWith('gh:  /usr/bin/gh')
			expect(logger.error).toHaveBeenCalledWith('gh auth not set up. Run: gh auth login')
		})

		it('should show warning when gh auth status is unclear', async () => {
			vi.mocked(git.ensureGit).mockResolvedValue('/usr/bin/git')
			vi.mocked(github.ensureGh).mockResolvedValue('/usr/bin/gh')
			vi.mocked(github.gh).mockResolvedValue('Some unclear output')

			const result = await runDoctor()

			expect(result).toBe(true)
			expect(logger.warn).toHaveBeenCalledWith('gh auth status unclear')
		})

		it('should handle both missing tools and missing auth', async () => {
			vi.mocked(git.ensureGit).mockRejectedValue(new Error('git not found'))
			vi.mocked(github.ensureGh).mockRejectedValue(new Error('gh not found'))

			const result = await runDoctor()

			expect(result).toBe(false)
			expect(logger.error).toHaveBeenCalledWith('Missing git and/or gh on PATH')
			expect(github.gh).not.toHaveBeenCalled()
		})
	})
})
