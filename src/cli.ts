import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { runDoctor } from './commands/doctor.js'
import { runInit } from './commands/init.js'
import { listTickets } from './commands/list.js'
import { runOnce } from './commands/run.js'
import { runWatch } from './commands/watch.js'
import { logger, setVerbose } from './utils/logger.js'
import type { RunOnceArgs } from './utils/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const packageJson = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
const { version } = packageJson

const program = new Command()

program
	.name('branchpilot')
	.description('Automate Pull Request creation from local Git branches using Markdown files.')
	.version(version)
	.showHelpAfterError('(add --help for additional information)')

program
	.command('run')
	.description('Process due tickets and create PRs')
	.option('-d, --dir <directories...>', 'Directories to scan for tickets (defaults to current directory)')
	.option('-c, --config <path>', 'Path to custom config file')
	.option('-v, --verbose', 'Show detailed output including skipped tickets')
	.action(async (options) => {
		try {
			const args: RunOnceArgs = {
				verbose: options.verbose ?? false,
			}
			if (options.dir && options.dir.length > 0) {
				args.dirs = options.dir
			}
			if (options.config) {
				args.configPath = options.config
			}

			const code = await runOnce(args)
			process.exitCode = code
		} catch (error) {
			setVerbose(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program
	.command('init')
	.description('Initialize branchpilot in the current directory')
	.option('-f, --force', 'Reinitialize even if already initialized')
	.option('-v, --verbose', 'Show detailed output')
	.action(async (options) => {
		try {
			const result = await runInit({
				force: options.force ?? false,
				verbose: options.verbose ?? false,
			})
			process.exitCode = result.success ? 0 : 1
		} catch (error) {
			setVerbose(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program
	.command('list')
	.description('List all tickets in configured directories')
	.option('-d, --dir <directories...>', 'Directories to scan for tickets (defaults to configured dirs)')
	.option('-v, --verbose', 'Show detailed output')
	.action(async (options) => {
		try {
			await listTickets({
				dirs: options.dir,
				verbose: options.verbose ?? false,
			})
			process.exitCode = 0
		} catch (error) {
			setVerbose(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program
	.command('watch')
	.description('Watch directories and process tickets on an interval')
	.option('-d, --dir <directories...>', 'Directories to scan for tickets (defaults to current directory)')
	.option('-i, --interval <interval>', 'Check interval (e.g., "5m", "1h", "30s") (default: "15m")')
	.option('-v, --verbose', 'Show detailed output')
	.action(async (options) => {
		try {
			await runWatch({
				dirs: options.dir,
				interval: options.interval,
				verbose: options.verbose ?? false,
			})
			process.exitCode = 0
		} catch (error) {
			setVerbose(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program
	.command('doctor')
	.description('Check environment and tools')
	.option('-v, --verbose', 'Show detailed output')
	.action(async (options) => {
		try {
			const ok = await runDoctor(options.verbose ?? false)
			process.exitCode = ok ? 0 : 1
		} catch (error) {
			setVerbose(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program.parse()
