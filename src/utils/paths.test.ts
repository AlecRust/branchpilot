import os from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configPath } from './paths.js'

vi.mock('node:os')

describe('paths', () => {
	const originalPlatform = process.platform
	const originalEnv = process.env

	beforeEach(() => {
		vi.resetAllMocks()
		process.env = { ...originalEnv }
	})

	afterEach(() => {
		Object.defineProperty(process, 'platform', { value: originalPlatform })
		process.env = originalEnv
	})

	describe('configPath', () => {
		it('returns Windows config path on Windows', () => {
			Object.defineProperty(process, 'platform', { value: 'win32', writable: true })
			vi.mocked(os.homedir).mockReturnValue('C:\\Users\\TestUser')
			process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming'

			const result = configPath()
			expect(result).toContain('branchpilot.toml')
			expect(result).toContain('AppData')
			expect(result).toContain('Roaming')
		})

		it('falls back to home AppData if APPDATA not set on Windows', () => {
			Object.defineProperty(process, 'platform', { value: 'win32', writable: true })
			vi.mocked(os.homedir).mockReturnValue('C:\\Users\\TestUser')
			delete process.env.APPDATA

			const result = configPath()
			expect(result).toContain('branchpilot.toml')
			expect(result).toContain('AppData')
			expect(result).toContain('Roaming')
			expect(result).toContain('TestUser')
		})

		it('returns Unix config path on non-Windows platforms', () => {
			Object.defineProperty(process, 'platform', { value: 'linux', writable: true })
			vi.mocked(os.homedir).mockReturnValue('/home/testuser')
			delete process.env.XDG_CONFIG_HOME

			const result = configPath()
			expect(result).toContain('branchpilot.toml')
			expect(result).toContain('.config')
			expect(result).toContain('testuser')
		})
	})
})
