// SPDX-License-Identifier: MIT

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { runDoctor } from './core/doctor.js'
import { runOnce } from './core/run.js'
import type { RunOnceArgs } from './core/types.js'

await yargs(hideBin(process.argv))
	.scriptName('branchpilot')
	.command(
		'run',
		'Process due tickets and create PRs',
		(y) =>
			y
				.option('dir', {
					type: 'array',
					string: true,
					describe: 'Directories to scan for tickets (defaults to current directory)',
				})
				.option('config', {
					type: 'string',
					describe: 'Path to custom config file',
				})
				.option('dry', {
					type: 'boolean',
					describe: 'Preview actions without making changes',
					default: false,
				}),
		async (argv) => {
			const args: RunOnceArgs = {
				mode: argv.dry ? 'dry-run' : 'run',
			}
			if (argv.dir && argv.dir.length > 0) {
				args.dirs = argv.dir as string[]
			}
			if (argv.config) args.configPath = argv.config as string

			const code = await runOnce(args)
			process.exitCode = code
		},
	)
	.command('doctor', 'Check environment and tools', {}, async () => {
		const ok = await runDoctor()
		process.exitCode = ok ? 0 : 1
	})
	.demandCommand(1)
	.strict()
	.help()
	.parse()
