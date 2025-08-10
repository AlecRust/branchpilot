import fs from 'node:fs/promises'
import path from 'node:path'
import { parse as parseToml } from 'toml'
import { z } from 'zod'
import { configDir } from './paths.js'
import type { GlobalConfig, RepoConfig } from './types.js'

const GlobalSchema = z.object({
	dirs: z.array(z.string()).optional(),
	defaultBase: z.string().optional(),
	timezone: z.string().optional(),
	pushMode: z.enum(['force-with-lease', 'ff-only', 'force']).optional(),
	remote: z.string().optional(),
	repo: z.string().optional(),
})

export async function loadGlobalConfig(explicitPath?: string): Promise<GlobalConfig> {
	const p = explicitPath ?? path.join(configDir(), 'config.toml')
	try {
		const raw = await fs.readFile(p, 'utf8')
		const parsed = GlobalSchema.parse(parseToml(raw))
		const result: GlobalConfig = {}
		if (parsed.dirs) result.dirs = parsed.dirs
		if (parsed.defaultBase) result.defaultBase = parsed.defaultBase
		if (parsed.timezone) result.timezone = parsed.timezone
		if (parsed.pushMode) result.pushMode = parsed.pushMode
		if (parsed.remote) result.remote = parsed.remote
		if (parsed.repo) result.repo = parsed.repo
		return result
	} catch {
		return {}
	}
}

export async function loadRepoConfig(repoRoot: string): Promise<RepoConfig> {
	const p = path.join(repoRoot, '.branchpilot.toml')
	try {
		const raw = await fs.readFile(p, 'utf8')
		const parsed = GlobalSchema.partial().parse(parseToml(raw))
		const result: RepoConfig = {}
		if (parsed.dirs) result.dirs = parsed.dirs
		if (parsed.defaultBase) result.defaultBase = parsed.defaultBase
		if (parsed.timezone) result.timezone = parsed.timezone
		if (parsed.pushMode) result.pushMode = parsed.pushMode
		if (parsed.remote) result.remote = parsed.remote
		if (parsed.repo) result.repo = parsed.repo
		return result
	} catch {
		return {}
	}
}
