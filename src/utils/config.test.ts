import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { loadGlobalConfig, loadRepoConfig } from './config.js'
import type { Logger } from './logger.js'
import * as paths from './paths.js'

vi.mock('node:fs/promises')
vi.mock('./paths.js')

describe('config', () => {
	describe('loadGlobalConfig', () => {
		it('loads and parses TOML config', async () => {
			vi.mocked(paths.configPath).mockReturnValue('/home/user/.config/branchpilot.toml')
			vi.mocked(fs.readFile).mockResolvedValueOnce(`
dirs = ["tickets"]
defaultBase = "develop"
pushMode = "force-with-lease"
remote = "upstream"
repo = "owner/repo"
`)

			const config = await loadGlobalConfig()

			expect(fs.readFile).toHaveBeenCalledWith('/home/user/.config/branchpilot.toml', 'utf8')
			expect(config).toEqual({
				dirs: ['tickets'],
				defaultBase: 'develop',
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
			vi.mocked(paths.configPath).mockReturnValue('/home/user/.config/branchpilot.toml')

			vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'))
			expect(await loadGlobalConfig()).toEqual({})

			vi.mocked(fs.readFile).mockResolvedValueOnce('invalid toml {{{')
			expect(await loadGlobalConfig()).toEqual({})

			vi.mocked(fs.readFile).mockResolvedValueOnce('pushMode = "invalid"')
			expect(await loadGlobalConfig()).toEqual({})
		})

		it('handles partial configs', async () => {
			vi.mocked(paths.configPath).mockReturnValue('/home/user/.config/branchpilot.toml')
			vi.mocked(fs.readFile).mockResolvedValueOnce('dirs = ["tickets"]')

			const config = await loadGlobalConfig()

			expect(config.dirs).toEqual(['tickets'])
			expect(config.defaultBase).toBeUndefined()
		})
	})

	describe('loadRepoConfig', () => {
		it('loads from repository root .branchpilot.toml', async () => {
			vi.mocked(fs.readFile).mockResolvedValueOnce('defaultBase = "develop"\npushMode = "force"')

			const config = await loadRepoConfig('/repo')

			expect(fs.readFile).toHaveBeenCalledWith(path.join('/repo', '.branchpilot.toml'), 'utf8')
			expect(config).toEqual({
				defaultBase: 'develop',
				pushMode: 'force',
			})
		})

		it('returns empty object when missing or invalid', async () => {
			const mockLogger = {
				warn: vi.fn(),
				info: vi.fn(),
				error: vi.fn(),
				verbose: vi.fn(),
				success: vi.fn(),
				always: vi.fn(),
			} as unknown as Logger

			vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'))
			expect(await loadRepoConfig('/repo', mockLogger)).toEqual({})
			expect(mockLogger.warn).not.toHaveBeenCalled()
		})

		it('warns about invalid TOML in repo config', async () => {
			const mockLogger = {
				warn: vi.fn(),
				info: vi.fn(),
				error: vi.fn(),
				verbose: vi.fn(),
				success: vi.fn(),
				always: vi.fn(),
			} as unknown as Logger

			vi.mocked(fs.readFile).mockResolvedValueOnce('invalid {{{')
			expect(await loadRepoConfig('/repo', mockLogger)).toEqual({})
			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid TOML syntax'))
		})

		it('warns about invalid schema in repo config', async () => {
			const mockLogger = {
				warn: vi.fn(),
				info: vi.fn(),
				error: vi.fn(),
				verbose: vi.fn(),
				success: vi.fn(),
				always: vi.fn(),
			} as unknown as Logger

			vi.mocked(fs.readFile).mockResolvedValueOnce('pushMode = "not-a-valid-mode"')
			expect(await loadRepoConfig('/repo', mockLogger)).toEqual({})
			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid configuration'))
		})
	})
})
