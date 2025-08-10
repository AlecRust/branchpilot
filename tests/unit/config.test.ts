import fs from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { loadGlobalConfig, loadRepoConfig } from '../../src/core/config.js'
import * as paths from '../../src/core/paths.js'

vi.mock('node:fs/promises')
vi.mock('../../src/core/paths.js')

describe('config', () => {
	describe('loadGlobalConfig', () => {
		it('loads and parses TOML config', async () => {
			vi.mocked(paths.configDir).mockReturnValue('/home/user/.config/branchpilot')
			vi.mocked(fs.readFile).mockResolvedValueOnce(`
dirs = [".scheduled-prs"]
defaultBase = "develop"
timezone = "America/New_York"
pushMode = "force-with-lease"
remote = "upstream"
repo = "owner/repo"
`)

			const config = await loadGlobalConfig()

			expect(config).toEqual({
				dirs: ['.scheduled-prs'],
				defaultBase: 'develop',
				timezone: 'America/New_York',
				pushMode: 'force-with-lease',
				remote: 'upstream',
				repo: 'owner/repo',
			})
		})

		it('loads from explicit path', async () => {
			vi.mocked(fs.readFile).mockResolvedValueOnce('defaultBase = "main"')

			const config = await loadGlobalConfig('/custom/config.toml')

			expect(fs.readFile).toHaveBeenCalledWith('/custom/config.toml', 'utf8')
			expect(config.defaultBase).toBe('main')
		})

		it('returns empty object when file missing or invalid', async () => {
			vi.mocked(paths.configDir).mockReturnValue('/home/user/.config/branchpilot')

			// Missing file
			vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'))
			expect(await loadGlobalConfig()).toEqual({})

			// Invalid TOML
			vi.mocked(fs.readFile).mockResolvedValueOnce('invalid toml {{{')
			expect(await loadGlobalConfig()).toEqual({})

			// Invalid schema
			vi.mocked(fs.readFile).mockResolvedValueOnce('pushMode = "invalid"')
			expect(await loadGlobalConfig()).toEqual({})
		})

		it('handles partial configs', async () => {
			vi.mocked(paths.configDir).mockReturnValue('/home/user/.config/branchpilot')
			vi.mocked(fs.readFile).mockResolvedValueOnce('dirs = [".scheduled-prs"]')

			const config = await loadGlobalConfig()

			expect(config.dirs).toEqual(['.scheduled-prs'])
			expect(config.defaultBase).toBeUndefined()
		})
	})

	describe('loadRepoConfig', () => {
		it('loads from repository root .branchpilot.toml', async () => {
			vi.mocked(fs.readFile).mockResolvedValueOnce('defaultBase = "develop"\npushMode = "force"')

			const config = await loadRepoConfig('/repo')

			expect(fs.readFile).toHaveBeenCalledWith('/repo/.branchpilot.toml', 'utf8')
			expect(config).toEqual({
				defaultBase: 'develop',
				pushMode: 'force',
			})
		})

		it('returns empty object when missing or invalid', async () => {
			vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'))
			expect(await loadRepoConfig('/repo')).toEqual({})
		})
	})
})
