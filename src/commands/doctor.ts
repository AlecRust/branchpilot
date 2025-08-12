import { green, red, yellow } from 'colorette'
import ora from 'ora'
import { ensureGit } from '../utils/git.js'
import { ensureGh, gh } from '../utils/github.js'
import { logger, setVerbose } from '../utils/logger.js'

export async function runDoctor(verbose = false): Promise<boolean> {
	setVerbose(verbose)
	const spinner = ora({ isEnabled: !verbose })
	let ok = true

	try {
		spinner.start('Checking git installation...')
		const gitPath = await ensureGit()
		spinner.stop()
		logger.info(green(`✔ git: ${gitPath}`))

		spinner.start('Checking gh CLI installation...')
		const ghPath = await ensureGh()
		spinner.stop()
		logger.info(green(`✔ gh:  ${ghPath}`))

		spinner.start('Checking GitHub authentication...')
		try {
			const u = await gh(process.cwd(), ['auth', 'status'])
			spinner.stop()
			if (/Logged in to/i.test(u)) {
				logger.info(green('✔ gh auth'))
			} else {
				logger.info(yellow('! gh auth status unclear'))
			}
		} catch {
			spinner.stop()
			logger.error(red('✖ gh auth not set up. Run: gh auth login'))
			ok = false
		}
	} catch (_e) {
		spinner.stop()
		logger.error(red('✖ Missing git and/or gh on PATH'))
		ok = false
	}

	return ok
}
