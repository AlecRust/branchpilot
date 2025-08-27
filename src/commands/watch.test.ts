import type { FSWatcher } from 'chokidar'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LoadedTicket } from '../utils/types.js'
import { watch } from './watch.js'

vi.mock('../utils/config.js', () => ({
	loadGlobalConfig: vi.fn().mockResolvedValue({}),
	loadRepoConfig: vi.fn().mockResolvedValue({}),
}))

vi.mock('../utils/git.js', () => ({
	ensureGit: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../utils/github.js', () => ({
	ensureGh: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../utils/logger.js', () => ({
	logger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
	},
	setVerbose: vi.fn(),
}))

vi.mock('../utils/spinner.js', () => ({
	withSpinner: vi.fn(async (fn) => fn()),
}))

vi.mock('../utils/tickets.js', () => ({
	loadAllTickets: vi.fn(),
}))

vi.mock('./run.js', () => ({
	run: vi.fn(),
}))

vi.mock('chokidar', () => ({
	watch: vi.fn(() => ({
		on: vi.fn(),
		close: vi.fn(),
	})),
}))

describe('watch', () => {
	let originalExit: typeof process.exit
	let exitMock: ReturnType<typeof vi.fn>

	beforeEach(() => {
		vi.clearAllMocks()
		originalExit = process.exit
		exitMock = vi.fn()
		// @ts-expect-error - mocking process.exit for testing
		process.exit = exitMock
	})

	afterEach(() => {
		process.exit = originalExit
	})

	it('should handle missing tools gracefully', async () => {
		const { ensureGit } = await import('../utils/git.js')
		vi.mocked(ensureGit).mockRejectedValueOnce(new Error('git not found'))

		const promise = watch({ verbose: false })

		await expect(promise).rejects.toThrow('git not found')
	})

	it('should process overdue tickets immediately on startup', async () => {
		const { loadAllTickets } = await import('../utils/tickets.js')
		const { run } = await import('./run.js')

		vi.mocked(loadAllTickets).mockResolvedValueOnce([
			{
				file: 'test.md',
				relativePath: 'test.md',
				branch: 'test-branch',
				when: '2024-01-01',
				status: 'ready' as const,
				isDue: true,
				daysUntilDue: -1,
			} as LoadedTicket,
		])

		vi.mocked(run).mockResolvedValueOnce(0)

		// Mock subsequent calls to loadAllTickets to prevent errors
		vi.mocked(loadAllTickets).mockResolvedValue([])

		// Start the command in the background
		const promise = watch({ verbose: false })

		// Wait a bit for initial processing
		await new Promise((resolve) => setTimeout(resolve, 100))

		// Verify run was called
		expect(run).toHaveBeenCalledWith({
			dirs: ['.'],
			verbose: false,
		})

		// Clean up by triggering shutdown
		process.emit('SIGINT', 'SIGINT')

		// Wait for promise to settle
		await Promise.race([promise.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 100))])
	})

	it('should schedule future tickets with a timer', async () => {
		const { loadAllTickets } = await import('../utils/tickets.js')

		const futureDate = new Date()
		futureDate.setHours(futureDate.getHours() + 1)

		vi.mocked(loadAllTickets).mockResolvedValue([
			{
				file: 'test.md',
				relativePath: 'test.md',
				branch: 'test-branch',
				when: futureDate.toISOString(),
				dueUtcISO: futureDate.toISOString(),
				status: 'pending' as const,
				isDue: false,
				daysUntilDue: 0,
			} as LoadedTicket,
		])

		const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

		// Start the command in the background
		const promise = watch({ verbose: false })

		// Wait a bit for initial processing
		await new Promise((resolve) => setTimeout(resolve, 100))

		// Verify setTimeout was called for scheduling
		expect(setTimeoutSpy).toHaveBeenCalled()

		// Clean up
		process.emit('SIGINT', 'SIGINT')
		await Promise.race([promise.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 100))])

		setTimeoutSpy.mockRestore()
	})

	it('should setup file watcher for markdown files', async () => {
		const chokidar = await import('chokidar')
		const { loadAllTickets } = await import('../utils/tickets.js')

		vi.mocked(loadAllTickets).mockResolvedValue([])

		const watchMock = {
			on: vi.fn().mockReturnThis(),
			close: vi.fn(),
		} as unknown as FSWatcher
		vi.mocked(chokidar.watch).mockReturnValue(watchMock)

		// Start the command
		const promise = watch({ dirs: ['tickets'], verbose: false })

		// Wait for initialization
		await new Promise((resolve) => setTimeout(resolve, 100))

		// Verify watcher was created with correct patterns
		expect(chokidar.watch).toHaveBeenCalledWith(
			['tickets/**/*.md'],
			expect.objectContaining({
				persistent: true,
				ignoreInitial: true,
			}),
		)

		// Verify event handlers were registered
		expect(watchMock.on).toHaveBeenCalledWith('add', expect.any(Function))
		expect(watchMock.on).toHaveBeenCalledWith('change', expect.any(Function))
		expect(watchMock.on).toHaveBeenCalledWith('unlink', expect.any(Function))
		expect(watchMock.on).toHaveBeenCalledWith('error', expect.any(Function))

		// Clean up
		process.emit('SIGINT', 'SIGINT')
		await Promise.race([promise.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 100))])
	})

	it('should setup safety rescan interval', async () => {
		const { loadAllTickets } = await import('../utils/tickets.js')
		vi.mocked(loadAllTickets).mockResolvedValue([])

		const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')

		// Start the command
		const promise = watch({ verbose: false })

		// Wait for initialization
		await new Promise((resolve) => setTimeout(resolve, 100))

		// Verify setInterval was called for safety rescan
		expect(setIntervalSpy).toHaveBeenCalledWith(
			expect.any(Function),
			3600000, // 1 hour
		)

		// Clean up
		process.emit('SIGINT', 'SIGINT')
		await Promise.race([promise.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 100))])

		setIntervalSpy.mockRestore()
	})

	it('should handle SIGINT gracefully', async () => {
		const { loadAllTickets } = await import('../utils/tickets.js')
		vi.mocked(loadAllTickets).mockResolvedValue([])

		// Start the command
		watch({ verbose: false })

		// Wait for initialization
		await new Promise((resolve) => setTimeout(resolve, 100))

		// Send SIGINT
		process.emit('SIGINT', 'SIGINT')

		// Wait a bit
		await new Promise((resolve) => setTimeout(resolve, 100))

		// Verify exit was called
		expect(exitMock).toHaveBeenCalledWith(0)
	})
})
