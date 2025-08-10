// SPDX-License-Identifier: MIT

import { Command } from 'commander'
import { runDoctor } from './core/doctor.js'
import { runInit } from './core/init.js'
import { listTickets } from './core/list.js'
import { Logger } from './core/logger.js'
import { runOnce } from './core/run.js'
import type { RunOnceArgs } from './core/types.js'

const program = new Command()

program
	.name('branchpilot')
	.description('Local-first scheduled PRs from Markdown tickets')
	.version('0.3.0')
	.showHelpAfterError('(add --help for additional information)')

program
	.command('run')
	.description('Process due tickets and create PRs')
	.option('-d, --dir <directories...>', 'Directories to scan for tickets (defaults to current directory)')
	.option('-c, --config <path>', 'Path to custom config file')
	.option('--dry-run', 'Preview actions without making changes')
	.option('-v, --verbose', 'Show detailed output including skipped tickets')
	.action(async (options) => {
		try {
			const args: RunOnceArgs = {
				mode: options.dryRun ? 'dry-run' : 'run',
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
			// Always show errors regardless of verbose flag
			const logger = new Logger(true)
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
			// Always show errors regardless of verbose flag
			const logger = new Logger(true)
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
			const logger = new Logger(true)
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
			// Always show errors regardless of verbose flag
			const logger = new Logger(true)
			logger.error(`Fatal error: ${error}`)
			process.exitCode = 1
		}
	})

program.parse()
