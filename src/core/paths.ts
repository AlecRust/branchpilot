import os from 'node:os'
import path from 'node:path'

export function configDir(): string {
	const home = os.homedir()
	if (process.platform === 'win32') {
		const appData = process.env.APPDATA ?? path.win32.join(home, 'AppData', 'Roaming')
		return path.win32.join(appData, 'branchpilot')
	}
	return path.join(home, '.config', 'branchpilot')
}
