import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import type { RunOnceArgs } from './utils/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageJson = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
const { version } = packageJson

const program = new Command()

program
	.name('branchpilot')
	.description('CLI tool for scheduling Pull Requests from local Git branches.')
	.version(version)
	.showHelpAfterError('(add --help for additional information)')

program
	.command('run')
	.alias('process')
	.description('Process due tickets and create PRs')
	.option('-d, --dir <directories...>', 'Directories to scan for tickets (defaults to current directory)')
	.option('-c, --config <path>', 'Path to custom config file')
	.option('-v, --verbose', 'Show detailed output including skipped tickets')
	.action(async (options) => {
		try {
			const { run } = await import('./commands/run.js')

			const args: RunOnceArgs = {
				verbose: options.verbose ?? false,
			}
			if (options.dir && options.dir.length > 0) {
				args.dirs = options.dir
			}
			if (options.config) {
				args.configPath = options.config
			}

			const code = await run(args)
			process.exitCode = code
		} catch (error) {
			const { setVerbose, logger } = await import('./utils/logger.js')
			setVerbose(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program
	.command('init')
	.alias('setup')
	.description('Initialize branchpilot in the current directory')
	.option('-f, --force', 'Reinitialize even if already initialized')
	.option('-v, --verbose', 'Show detailed output')
	.action(async (options) => {
		try {
			const { init } = await import('./commands/init.js')

			const result = await init({
				force: options.force ?? false,
				verbose: options.verbose ?? false,
			})
			process.exitCode = result.success ? 0 : 1
		} catch (error) {
			const { setVerbose, logger } = await import('./utils/logger.js')
			setVerbose(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program
	.command('list')
	.alias('ls')
	.alias('status')
	.description('List all tickets in configured directories')
	.option('-d, --dir <directories...>', 'Directories to scan for tickets (defaults to configured dirs)')
	.option('-v, --verbose', 'Show detailed output')
	.action(async (options) => {
		try {
			const { list } = await import('./commands/list.js')

			await list({
				dirs: options.dir,
				verbose: options.verbose ?? false,
			})
			process.exitCode = 0
		} catch (error) {
			const { setVerbose, logger } = await import('./utils/logger.js')
			setVerbose(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program
	.command('watch')
	.description('Start file watcher to process tickets immediately when due')
	.option('-d, --dir <directories...>', 'Directories to scan for tickets (defaults to current directory)')
	.option('-v, --verbose', 'Show detailed output')
	.action(async (options) => {
		try {
			const { watch } = await import('./commands/watch.js')

			await watch({
				dirs: options.dir,
				verbose: options.verbose ?? false,
			})
			process.exitCode = 0
		} catch (error) {
			const { setVerbose, logger } = await import('./utils/logger.js')
			setVerbose(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program
	.command('doctor')
	.alias('check')
	.description('Check environment and tools')
	.option('-v, --verbose', 'Show detailed output')
	.action(async (options) => {
		try {
			const { doctor } = await import('./commands/doctor.js')

			const ok = await doctor(options.verbose ?? false)
			process.exitCode = ok ? 0 : 1
		} catch (error) {
			const { setVerbose, logger } = await import('./utils/logger.js')
			setVerbose(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program.parse()
