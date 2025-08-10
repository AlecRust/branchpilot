import os from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configDir } from '../../src/core/paths.js'

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

	describe('configDir', () => {
		it('returns Windows config directory on Windows', () => {
			Object.defineProperty(process, 'platform', { value: 'win32', writable: true })
			vi.mocked(os.homedir).mockReturnValue('C:\\Users\\TestUser')
			process.env.APPDATA = 'C:\\Users\\TestUser\\AppData\\Roaming'

			const result = configDir()
			expect(result).toContain('branchpilot')
			expect(result).toContain('AppData')
			expect(result).toContain('Roaming')
		})

		it('falls back to home AppData if APPDATA not set on Windows', () => {
			Object.defineProperty(process, 'platform', { value: 'win32', writable: true })
			vi.mocked(os.homedir).mockReturnValue('C:\\Users\\TestUser')
			delete process.env.APPDATA

			const result = configDir()
			expect(result).toContain('branchpilot')
			expect(result).toContain('AppData')
			expect(result).toContain('Roaming')
			expect(result).toContain('TestUser')
		})

		it('returns Unix config directory on non-Windows platforms', () => {
			Object.defineProperty(process, 'platform', { value: 'linux', writable: true })
			vi.mocked(os.homedir).mockReturnValue('/home/testuser')

			const result = configDir()
			expect(result).toContain('branchpilot')
			expect(result).toContain('.config')
			expect(result).toContain('testuser')
		})
	})
})
