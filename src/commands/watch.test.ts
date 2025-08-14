import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as config from '../utils/config.js'
import * as git from '../utils/git.js'
import * as github from '../utils/github.js'
import { logger } from '../utils/logger.js'
import * as runModule from './run.js'
import { watch } from './watch.js'

vi.mock('../utils/config.js')
vi.mock('../utils/git.js')
vi.mock('../utils/github.js')
vi.mock('../utils/logger.js', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		success: vi.fn(),
	},
	setVerbose: vi.fn(),
}))
vi.mock('./run.js')

describe('watch command', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.clearAllTimers()
		vi.useFakeTimers()

		vi.mocked(config.loadGlobalConfig).mockResolvedValue({})
		vi.mocked(config.loadRepoConfig).mockResolvedValue({})
		vi.mocked(git.ensureGit).mockResolvedValue('git')
		vi.mocked(github.ensureGh).mockResolvedValue('gh')
		vi.mocked(runModule.run).mockResolvedValue(0)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should validate interval format', async () => {
		await expect(
			watch({
				interval: 'invalid',
				once: true,
			}),
		).rejects.toThrow('Invalid interval: invalid')

		await expect(
			watch({
				interval: '30s',
				once: true,
			}),
		).rejects.toThrow('Invalid interval: 30s. Minimum interval is 1m')
	})

	it('should accept valid interval formats', async () => {
		const validIntervals = ['1m', '5m', '1h', '1d']

		for (const interval of validIntervals) {
			vi.clearAllMocks()
			await watch({
				interval,
				once: true,
			})

			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('every'))
		}
	})

	it('should use default interval of 15m when not specified', async () => {
		await watch({
			once: true,
		})

		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('every 15 minutes'))
	})

	it('should use configured directories', async () => {
		const dirs = ['src', 'docs']

		await watch({
			dirs,
			once: true,
		})

		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('src, docs'))
		expect(runModule.run).toHaveBeenCalledWith({
			dirs,
			verbose: false,
		})
	})

	it('should use directories from config when not specified', async () => {
		vi.mocked(config.loadRepoConfig).mockResolvedValue({
			dirs: ['config-dir'],
		})

		await watch({
			once: true,
		})

		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('config-dir'))
	})

	it('should handle run errors gracefully', async () => {
		vi.mocked(runModule.run).mockResolvedValue(1)

		await watch({
			once: true,
		})

		expect(logger.warn).toHaveBeenCalledWith('Processing completed with errors')
	})

	it('should handle run exceptions gracefully', async () => {
		vi.mocked(runModule.run).mockRejectedValue(new Error('Test error'))

		await watch({
			once: true,
		})

		expect(logger.error).toHaveBeenCalledWith('Watch cycle error: Test error')
	})

	it('should exit after one cycle in test mode', async () => {
		await watch({
			once: true,
		})

		expect(runModule.run).toHaveBeenCalledTimes(1)
		expect(logger.debug).toHaveBeenCalledWith('Exiting after one cycle (test mode)')
	})

	it('should fail if required tools are missing', async () => {
		vi.mocked(git.ensureGit).mockRejectedValue(new Error('git not found'))

		await expect(
			watch({
				once: true,
			}),
		).rejects.toThrow('git not found')

		expect(logger.error).toHaveBeenCalledWith('Tools missing: git not found')
	})

	it('should enable verbose mode when specified', async () => {
		const { setVerbose } = await import('../utils/logger.js')

		await watch({
			verbose: true,
			once: true,
		})

		expect(setVerbose).toHaveBeenCalledWith(true)
		expect(runModule.run).toHaveBeenCalledWith({
			dirs: ['.'],
			verbose: true,
		})
	})
})
