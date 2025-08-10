import os from 'node:os'
import path from 'node:path'

export function configPath(): string {
	const home = os.homedir()
	if (process.platform === 'win32') {
		const appData = process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming')
		return path.join(appData, 'branchpilot.toml')
	}
	const xdgConfigHome = process.env.XDG_CONFIG_HOME ?? path.join(home, '.config')
	return path.join(xdgConfigHome, 'branchpilot.toml')
}

export function expandPath(p: string): string {
	if (p.startsWith('~')) {
		return path.resolve(p.replace(/^~/, os.homedir()))
	}
	return path.resolve(p)
}
