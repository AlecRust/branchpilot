import os from 'node:os'
import path from 'node:path'
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

			expect(configDir()).toBe(path.win32.join('C:\\Users\\TestUser\\AppData\\Roaming', 'branchpilot'))
		})

		it('falls back to home AppData if APPDATA not set on Windows', () => {
			Object.defineProperty(process, 'platform', { value: 'win32', writable: true })
			vi.mocked(os.homedir).mockReturnValue('C:\\Users\\TestUser')
			delete process.env.APPDATA

			expect(configDir()).toBe(path.win32.join('C:\\Users\\TestUser', 'AppData', 'Roaming', 'branchpilot'))
		})

		it('returns Unix config directory on non-Windows platforms', () => {
			Object.defineProperty(process, 'platform', { value: 'linux', writable: true })
			vi.mocked(os.homedir).mockReturnValue('/home/testuser')

			expect(configDir()).toBe('/home/testuser/.config/branchpilot')
		})
	})
})
