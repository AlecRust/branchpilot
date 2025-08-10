import { green, red, yellow } from 'colorette'
import { ensureTools, gh } from './gitgh.js'

export async function runDoctor(): Promise<boolean> {
	let ok = true
	try {
		const tools = await ensureTools()
		console.log(green(`✔ git: ${tools.git}`))
		console.log(green(`✔ gh:  ${tools.gh}`))

		// Check gh auth only if tools are available
		try {
			const u = await gh(process.cwd(), ['auth', 'status'])
			if (/Logged in to/i.test(u)) {
				console.log(green('✔ gh auth'))
			} else {
				console.log(yellow('! gh auth status unclear'))
			}
		} catch {
			console.log(red('✖ gh auth not set up. Run: gh auth login'))
			ok = false
		}
	} catch (_e) {
		console.log(red('✖ Missing git and/or gh on PATH'))
		ok = false
	}

	return ok
}
