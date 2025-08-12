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
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('✔ git: /usr/bin/git'))
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('✔ gh:  /usr/bin/gh'))
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('✔ gh auth'))
		})

		it('should return false when git or gh is missing', async () => {
			vi.mocked(git.ensureGit).mockRejectedValue(new Error('git not found'))

			const result = await runDoctor()

			expect(result).toBe(false)
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('✖ Missing git and/or gh on PATH'))
		})

		it('should return false when gh auth is not configured', async () => {
			vi.mocked(git.ensureGit).mockResolvedValue('/usr/bin/git')
			vi.mocked(github.ensureGh).mockResolvedValue('/usr/bin/gh')
			vi.mocked(github.gh).mockRejectedValue(new Error('Not authenticated'))

			const result = await runDoctor()

			expect(result).toBe(false)
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('✔ git: /usr/bin/git'))
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('✔ gh:  /usr/bin/gh'))
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('✖ gh auth not set up'))
		})

		it('should show warning when gh auth status is unclear', async () => {
			vi.mocked(git.ensureGit).mockResolvedValue('/usr/bin/git')
			vi.mocked(github.ensureGh).mockResolvedValue('/usr/bin/gh')
			vi.mocked(github.gh).mockResolvedValue('Some unclear output')

			const result = await runDoctor()

			expect(result).toBe(true)
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('! gh auth status unclear'))
		})

		it('should handle both missing tools and missing auth', async () => {
			vi.mocked(git.ensureGit).mockRejectedValue(new Error('git not found'))
			vi.mocked(github.ensureGh).mockRejectedValue(new Error('gh not found'))

			const result = await runDoctor()

			expect(result).toBe(false)
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('✖ Missing git and/or gh on PATH'))
			expect(github.gh).not.toHaveBeenCalled()
		})
	})
})
