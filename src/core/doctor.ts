import { green, red, yellow } from 'colorette'
import { ensureTools, gh } from './gitgh.js'
import { Logger } from './logger.js'

export async function runDoctor(verbose = false): Promise<boolean> {
	const logger = new Logger(verbose)
	let ok = true
	try {
		const tools = await ensureTools()
		logger.always(green(`✔ git: ${tools.git}`))
		logger.always(green(`✔ gh:  ${tools.gh}`))

		// Check gh auth only if tools are available
		try {
			const u = await gh(process.cwd(), ['auth', 'status'])
			if (/Logged in to/i.test(u)) {
				logger.always(green('✔ gh auth'))
			} else {
				logger.always(yellow('! gh auth status unclear'))
			}
		} catch {
			logger.error(red('✖ gh auth not set up. Run: gh auth login'))
			ok = false
		}
	} catch (_e) {
		logger.error(red('✖ Missing git and/or gh on PATH'))
		ok = false
	}

	return ok
}
