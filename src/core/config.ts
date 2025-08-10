import fs from 'node:fs/promises'
import path from 'node:path'
import { parse as parseToml } from 'toml'
import { z } from 'zod'
import type { Logger } from './logger.js'
import { configPath } from './paths.js'
import type { GlobalConfig, RepoConfig } from './types.js'

const GlobalSchema = z.object({
	dirs: z.array(z.string()).optional(),
	defaultBase: z.string().optional(),
	timezone: z.string().optional(),
	pushMode: z.enum(['force-with-lease', 'ff-only', 'force']).optional(),
	remote: z.string().optional(),
	repo: z.string().optional(),
})

export async function loadGlobalConfig(explicitPath?: string, logger?: Logger): Promise<GlobalConfig> {
	const p = explicitPath ?? configPath()
	try {
		const raw = await fs.readFile(p, 'utf8')
		let parsed: unknown
		try {
			parsed = parseToml(raw)
		} catch (tomlError) {
			if (logger) {
				logger.warn(
					`Invalid TOML syntax in global config (${p}): ${tomlError instanceof Error ? tomlError.message : String(tomlError)}`,
				)
			}
			return {}
		}

		try {
			const validated = GlobalSchema.parse(parsed)
			const result: GlobalConfig = {}
			if (validated.dirs) result.dirs = validated.dirs
			if (validated.defaultBase) result.defaultBase = validated.defaultBase
			if (validated.timezone) result.timezone = validated.timezone
			if (validated.pushMode) result.pushMode = validated.pushMode
			if (validated.remote) result.remote = validated.remote
			if (validated.repo) result.repo = validated.repo
			return result
		} catch (schemaError) {
			if (logger) {
				if (schemaError instanceof z.ZodError) {
					const issues = schemaError.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
					logger.warn(`Invalid configuration in global config (${p}):\n${issues}`)
				} else {
					logger.warn(
						`Invalid configuration in global config (${p}): ${schemaError instanceof Error ? schemaError.message : String(schemaError)}`,
					)
				}
			}
			return {}
		}
	} catch {
		// File doesn't exist or can't be read - this is expected and not an error
		return {}
	}
}

export async function loadRepoConfig(repoRoot: string, logger?: Logger): Promise<RepoConfig> {
	const p = path.join(repoRoot, '.branchpilot.toml')
	try {
		const raw = await fs.readFile(p, 'utf8')
		let parsed: unknown
		try {
			parsed = parseToml(raw)
		} catch (tomlError) {
			if (logger) {
				logger.warn(
					`Invalid TOML syntax in repo config (${p}): ${tomlError instanceof Error ? tomlError.message : String(tomlError)}`,
				)
			}
			return {}
		}

		try {
			const validated = GlobalSchema.partial().parse(parsed)
			const result: RepoConfig = {}
			if (validated.dirs) result.dirs = validated.dirs
			if (validated.defaultBase) result.defaultBase = validated.defaultBase
			if (validated.timezone) result.timezone = validated.timezone
			if (validated.pushMode) result.pushMode = validated.pushMode
			if (validated.remote) result.remote = validated.remote
			if (validated.repo) result.repo = validated.repo
			return result
		} catch (schemaError) {
			if (logger) {
				if (schemaError instanceof z.ZodError) {
					const issues = schemaError.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
					logger.warn(`Invalid configuration in repo config (${p}):\n${issues}`)
				} else {
					logger.warn(
						`Invalid configuration in repo config (${p}): ${schemaError instanceof Error ? schemaError.message : String(schemaError)}`,
					)
				}
			}
			return {}
		}
	} catch {
		// File doesn't exist or can't be read - this is expected and not an error
		return {}
	}
}
