import ms from 'ms'
import { loadGlobalConfig, loadRepoConfig } from '../utils/config.js'
import { ensureGit } from '../utils/git.js'
import { ensureGh } from '../utils/github.js'
import { logger, setVerbose } from '../utils/logger.js'
import type { GlobalConfig } from '../utils/types.js'
import { run } from './run.js'

export type WatchOptions = {
	dirs?: string[]
	verbose?: boolean
	interval?: string
	once?: boolean // For testing - run one cycle then exit
}

export async function watch(options: WatchOptions): Promise<void> {
	setVerbose(options.verbose ?? false)

	const globalConfig = await loadGlobalConfig(undefined, logger)
	const repoConfig = await loadRepoConfig(process.cwd(), logger)
	const config: GlobalConfig = { ...globalConfig, ...repoConfig }

	const dirsToWatch = options.dirs || config.dirs || ['.']
	const intervalStr = options.interval || '15m'
	const intervalMs = parseInterval(intervalStr)

	try {
		await ensureGit()
		await ensureGh()
	} catch (e) {
		logger.error(`Tools missing: ${e instanceof Error ? e.message : String(e)}`)
		throw e
	}

	logger.info(`Watching ${dirsToWatch.join(', ')} every ${ms(intervalMs, { long: true })}`)
	logger.info('Press Ctrl+C to stop')

	let isShuttingDown = false
	let currentTimeout: NodeJS.Timeout | null = null

	const shutdown = () => {
		if (isShuttingDown) return
		isShuttingDown = true
		if (currentTimeout) clearTimeout(currentTimeout)
		logger.info('Shutting down watch mode...')
		process.exit(0)
	}

	process.on('SIGINT', shutdown)
	process.on('SIGTERM', shutdown)

	let cycleCount = 0
	while (!isShuttingDown) {
		cycleCount++
		const timestamp = new Date().toISOString()

		try {
			logger.debug(`[${timestamp}] Starting check cycle ${cycleCount}`)

			const result = await run({
				dirs: dirsToWatch,
				verbose: options.verbose ?? false,
			})

			if (result !== 0) {
				logger.warn('Processing completed with errors')
			} else {
				logger.debug('Check cycle completed successfully')
			}
		} catch (error) {
			logger.error(`Watch cycle error: ${error instanceof Error ? error.message : String(error)}`)
		}

		if (options.once) {
			logger.debug('Exiting after one cycle (test mode)')
			break
		}

		if (!isShuttingDown) {
			logger.debug(`Next check in ${ms(intervalMs, { long: true })}`)
			await new Promise<void>((resolve) => {
				currentTimeout = setTimeout(() => {
					currentTimeout = null
					resolve()
				}, intervalMs)
			})
		}
	}

	if (currentTimeout) clearTimeout(currentTimeout)
}

function parseInterval(intervalStr: string): number {
	// ms returns a number for valid strings, undefined/NaN for invalid
	const parsed = ms(intervalStr as ms.StringValue)

	if (typeof parsed !== 'number' || Number.isNaN(parsed)) {
		throw new Error(`Invalid interval: ${intervalStr}. Use formats like "5m", "1h", "30s"`)
	}

	if (parsed < 60000) {
		throw new Error(`Invalid interval: ${intervalStr}. Minimum interval is 1m`)
	}

	return parsed
}
