import { green, red, yellow } from 'colorette'
import { ensureGit } from '../utils/git.js'
import { ensureGh, gh } from '../utils/github.js'
import { Logger } from '../utils/logger.js'

export async function runDoctor(verbose = false): Promise<boolean> {
	const logger = new Logger(verbose)
	let ok = true
	try {
		const gitPath = await ensureGit()
		const ghPath = await ensureGh()
		logger.always(green(`✔ git: ${gitPath}`))
		logger.always(green(`✔ gh:  ${ghPath}`))

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
