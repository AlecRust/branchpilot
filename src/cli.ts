// SPDX-License-Identifier: MIT

import { green, yellow } from 'colorette'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { runDoctor } from './core/doctor.js'
import { runOnce } from './core/run.js'
import type { PushMode, RunOnceArgs } from './core/types.js'
import { coerceDirs } from './core/utils.js'

await yargs(hideBin(process.argv))
	.scriptName('branchpilot')
	.command(
		'run',
		'Scan directories and execute due tickets',
		(y) =>
			y
				.option('dir', {
					type: 'array',
					string: true,
					describe: 'One or more directories containing markdown tickets',
				})
				.option('config', {
					type: 'string',
					describe: 'Path to config.toml (defaults to global config if present)',
				})
				.option('base', {
					type: 'string',
					describe: 'Default base branch (overrides config)',
				})
				.option('push-mode', {
					type: 'string',
					choices: ['force-with-lease', 'ff-only', 'force'] as const,
					describe: 'Push strategy after rebase',
				})
				.option('remote', {
					type: 'string',
					describe: 'Git remote name (default origin)',
				})
				.option('dry', {
					type: 'boolean',
					describe: 'Print actions without making changes',
					default: false,
				}),
		async (argv) => {
			const overrides: RunOnceArgs['overrides'] = {}
			if (argv.base) overrides.base = argv.base as string
			if (argv['push-mode']) overrides.pushMode = argv['push-mode'] as PushMode
			if (argv.remote) overrides.remote = argv.remote as string

			const args: RunOnceArgs = {
				mode: argv.dry ? 'dry-run' : 'run',
				dirs: coerceDirs(argv.dir),
			}
			if (argv.config) args.configPath = argv.config as string
			if (Object.keys(overrides).length > 0) args.overrides = overrides

			const code = await runOnce(args)
			if (argv.dry) {
				if (code === 0) console.log(yellow('✓ Dry-run complete'))
			} else {
				if (code === 0) console.log(green('✓ Done'))
			}
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
