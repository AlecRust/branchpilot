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
		logger.success(`git: ${gitPath}`)

		spinner.start('Checking gh CLI installation...')
		const ghPath = await ensureGh()
		spinner.stop()
		logger.success(`gh:  ${ghPath}`)

		spinner.start('Checking GitHub authentication...')
		try {
			const u = await gh(process.cwd(), ['auth', 'status'])
			spinner.stop()
			if (/Logged in to/i.test(u)) {
				logger.success('gh auth')
			} else {
				logger.warn('gh auth status unclear')
			}
		} catch {
			spinner.stop()
			logger.error('gh auth not set up. Run: gh auth login')
			ok = false
		}
	} catch (_e) {
		spinner.stop()
		logger.error('Missing git and/or gh on PATH')
		ok = false
	}

	return ok
}
