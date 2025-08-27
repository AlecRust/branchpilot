import path from 'node:path'
import { type FSWatcher, watch as watchFiles } from 'chokidar'
import { differenceInMilliseconds, formatRelative, parseISO } from 'date-fns'
import { enGB, enUS } from 'date-fns/locale'
import { loadGlobalConfig, loadRepoConfig } from '../utils/config.js'
import { ensureGit } from '../utils/git.js'
import { ensureGh } from '../utils/github.js'
import { logger, setVerbose } from '../utils/logger.js'
import { withSpinner } from '../utils/spinner.js'
import { loadAllTickets } from '../utils/tickets.js'
import type { GlobalConfig } from '../utils/types.js'
import { run } from './run.js'

type WatchOptions = {
	dirs?: string[]
	verbose?: boolean
}

export async function watch(options: WatchOptions): Promise<void> {
	setVerbose(options.verbose ?? false)

	const globalConfig = await loadGlobalConfig(undefined, logger)
	const repoConfig = await loadRepoConfig(process.cwd(), logger)
	const config: GlobalConfig = { ...globalConfig, ...repoConfig }

	const dirsToWatch = options.dirs || config.dirs || ['.']

	try {
		await ensureGit()
		await ensureGh()
	} catch (e) {
		logger.error(`Tools missing: ${e instanceof Error ? e.message : String(e)}`)
		throw e
	}

	logger.info(`Starting file watcher for: ${dirsToWatch.join(', ')}`)
	logger.info('Press Ctrl+C to stop')

	let isShuttingDown = false
	let isProcessing = false
	let currentTimer: NodeJS.Timeout | null = null
	let safetyInterval: NodeJS.Timeout | null = null
	let watcher: FSWatcher | null = null
	let lastChangeTime: Date | null = null

	const shutdown = () => {
		if (isShuttingDown) return
		isShuttingDown = true

		if (currentTimer) {
			clearTimeout(currentTimer)
			currentTimer = null
		}

		if (safetyInterval) {
			clearInterval(safetyInterval)
			safetyInterval = null
		}

		if (watcher) {
			watcher.close()
			watcher = null
		}

		logger.info('Shutting down...')
		process.exit(0)
	}

	process.on('SIGINT', shutdown)
	process.on('SIGTERM', shutdown)

	const processTickets = async () => {
		if (isProcessing || isShuttingDown) {
			logger.debug('Already processing or shutting down, skipping')
			return
		}

		isProcessing = true

		try {
			logger.debug('Processing due tickets...')

			const result = await run({
				dirs: dirsToWatch,
				verbose: options.verbose ?? false,
			})

			if (result !== 0) {
				logger.warn('Processing completed with errors')
			} else {
				logger.debug('Processing completed successfully')
			}
		} catch (error) {
			logger.error(`Error processing tickets: ${error instanceof Error ? error.message : String(error)}`)
		} finally {
			isProcessing = false

			if (!isShuttingDown) {
				await scheduleNext()
			}
		}
	}

	const scheduleNext = async () => {
		if (currentTimer) {
			clearTimeout(currentTimer)
			currentTimer = null
		}

		if (isShuttingDown) return

		logger.debug('Loading tickets to schedule next run...')

		const allTickets = await loadAllTickets(dirsToWatch, config, logger)
		const pendingTickets = allTickets
			.filter((t) => t.status === 'pending' && t.dueUtcISO)
			.sort((a, b) => {
				// We've already filtered for tickets with dueUtcISO above
				if (!a.dueUtcISO || !b.dueUtcISO) return 0
				const dateA = parseISO(a.dueUtcISO)
				const dateB = parseISO(b.dueUtcISO)
				return dateA.getTime() - dateB.getTime()
			})

		const overdueTickets = allTickets.filter((t) => t.status === 'ready')

		if (overdueTickets.length > 0) {
			logger.info(`Found ${overdueTickets.length} overdue tickets, processing immediately...`)
			await processTickets()
			return
		}

		if (pendingTickets.length === 0) {
			logger.debug('No pending tickets found')
			return
		}

		const nextTicket = pendingTickets[0]
		if (!nextTicket || !nextTicket.dueUtcISO) {
			logger.debug('Next ticket has no valid due date')
			return
		}

		const now = new Date()
		const dueDate = parseISO(nextTicket.dueUtcISO)
		const msUntilDue = differenceInMilliseconds(dueDate, now)

		if (msUntilDue <= 0) {
			logger.debug('Next ticket is already due, processing immediately')
			await processTickets()
			return
		}

		const maxDelay = 2147483647 // Max safe timeout value in JavaScript
		const delay = Math.min(msUntilDue, maxDelay)

		const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
		const locale = systemLocale.startsWith('en-US') ? enUS : enGB
		const relativeTime = formatRelative(dueDate, now, { locale })
		logger.info(`Next ticket "${nextTicket.branch}" scheduled for ${relativeTime}`)

		currentTimer = setTimeout(async () => {
			currentTimer = null
			logger.info('Timer fired, processing tickets...')
			await processTickets()
		}, delay)
	}

	const handleFileChange = async () => {
		const now = new Date()

		if (lastChangeTime && now.getTime() - lastChangeTime.getTime() < 500) {
			logger.debug('Ignoring change (debouncing)')
			return
		}

		lastChangeTime = now

		logger.debug('File change detected, rescheduling...')

		setTimeout(async () => {
			if (!isProcessing && !isShuttingDown) {
				await scheduleNext()
			}
		}, 500)
	}

	const setupWatcher = (dirs: string[]): FSWatcher => {
		const patterns = dirs.map((d) => path.join(d, '**/*.md'))

		logger.debug(`Watching patterns: ${patterns.join(', ')}`)

		const watcher = watchFiles(patterns, {
			persistent: true,
			ignoreInitial: true,
			ignored: ['**/node_modules/**', '**/.git/**', '**/.DS_Store'],
		})

		watcher.on('add', handleFileChange)
		watcher.on('change', handleFileChange)
		watcher.on('unlink', handleFileChange)
		watcher.on('error', (error) => {
			logger.error(`Watcher error: ${error instanceof Error ? error.message : String(error)}`)
		})

		return watcher
	}

	const setupSafetyRescan = () => {
		const intervalMs = 3600000 // 1 hour

		safetyInterval = setInterval(async () => {
			logger.debug('Running safety rescan...')

			if (!isProcessing && !isShuttingDown) {
				await scheduleNext()
			}
		}, intervalMs)
	}

	// Initial scan
	await withSpinner(() => scheduleNext(), 'Performing initial scan...', options.verbose ?? false)

	// Setup watcher
	watcher = setupWatcher(dirsToWatch)

	// Setup safety rescan
	setupSafetyRescan()

	// Keep process alive
	await new Promise(() => {})
}
