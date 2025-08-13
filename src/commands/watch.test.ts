import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as config from '../utils/config.js'
import * as git from '../utils/git.js'
import * as github from '../utils/github.js'
import { logger } from '../utils/logger.js'
import * as runModule from './run.js'
import { runWatch } from './watch.js'

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
		vi.mocked(runModule.runOnce).mockResolvedValue(0)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should validate interval format', async () => {
		await expect(
			runWatch({
				interval: 'invalid',
				once: true,
			}),
		).rejects.toThrow('Invalid interval: invalid')

		await expect(
			runWatch({
				interval: '30s',
				once: true,
			}),
		).rejects.toThrow('Invalid interval: 30s. Minimum interval is 1m')
	})

	it('should accept valid interval formats', async () => {
		const validIntervals = ['1m', '5m', '1h', '1d']

		for (const interval of validIntervals) {
			vi.clearAllMocks()
			await runWatch({
				interval,
				once: true,
			})

			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('every'))
		}
	})

	it('should use default interval of 15m when not specified', async () => {
		await runWatch({
			once: true,
		})

		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('every 15 minutes'))
	})

	it('should use configured directories', async () => {
		const dirs = ['src', 'docs']

		await runWatch({
			dirs,
			once: true,
		})

		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('src, docs'))
		expect(runModule.runOnce).toHaveBeenCalledWith({
			dirs,
			verbose: false,
		})
	})

	it('should use directories from config when not specified', async () => {
		vi.mocked(config.loadRepoConfig).mockResolvedValue({
			dirs: ['config-dir'],
		})

		await runWatch({
			once: true,
		})

		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('config-dir'))
	})

	it('should handle runOnce errors gracefully', async () => {
		vi.mocked(runModule.runOnce).mockResolvedValue(1)

		await runWatch({
			once: true,
		})

		expect(logger.warn).toHaveBeenCalledWith('Processing completed with errors')
	})

	it('should handle runOnce exceptions gracefully', async () => {
		vi.mocked(runModule.runOnce).mockRejectedValue(new Error('Test error'))

		await runWatch({
			once: true,
		})

		expect(logger.error).toHaveBeenCalledWith('Watch cycle error: Test error')
	})

	it('should exit after one cycle in test mode', async () => {
		await runWatch({
			once: true,
		})

		expect(runModule.runOnce).toHaveBeenCalledTimes(1)
		expect(logger.debug).toHaveBeenCalledWith('Exiting after one cycle (test mode)')
	})

	it('should fail if required tools are missing', async () => {
		vi.mocked(git.ensureGit).mockRejectedValue(new Error('git not found'))

		await expect(
			runWatch({
				once: true,
			}),
		).rejects.toThrow('git not found')

		expect(logger.error).toHaveBeenCalledWith('Tools missing: git not found')
	})

	it('should enable verbose mode when specified', async () => {
		const { setVerbose } = await import('../utils/logger.js')

		await runWatch({
			verbose: true,
			once: true,
		})

		expect(setVerbose).toHaveBeenCalledWith(true)
		expect(runModule.runOnce).toHaveBeenCalledWith({
			dirs: ['.'],
			verbose: true,
		})
	})
})
