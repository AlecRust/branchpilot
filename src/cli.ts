// SPDX-License-Identifier: MIT

import { Command } from 'commander'
import { runDoctor } from './core/doctor.js'
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
	.option('--dry', 'Preview actions without making changes')
	.action(async (options) => {
		const args: RunOnceArgs = {
			mode: options.dry ? 'dry-run' : 'run',
		}
		if (options.dir && options.dir.length > 0) {
			args.dirs = options.dir
		}
		if (options.config) {
			args.configPath = options.config
		}

		const code = await runOnce(args)
		process.exitCode = code
	})

program
	.command('doctor')
	.description('Check environment and tools')
	.action(async () => {
		const ok = await runDoctor()
		process.exitCode = ok ? 0 : 1
	})

program.parse()
