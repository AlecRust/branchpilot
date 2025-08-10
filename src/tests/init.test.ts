import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as doctor from '../core/doctor.js'
import * as gitgh from '../core/gitgh.js'
import { runInit } from '../core/init.js'

vi.mock('../core/gitgh.js')
vi.mock('../core/doctor.js')

describe('init command', () => {
	let tempDir: string

	beforeEach(async () => {
		// Create a temporary directory for testing
		tempDir = path.join(process.cwd(), `.test-init-${Date.now()}`)
		await fs.mkdir(tempDir, { recursive: true })
		process.chdir(tempDir)

		// Mock doctor to return success
		vi.mocked(doctor.runDoctor).mockResolvedValue(true)

		// Mock default branch detection
		vi.mocked(gitgh.getDefaultBranch).mockResolvedValue('main')
	})

	afterEach(async () => {
		// Clean up
		process.chdir(path.dirname(tempDir))
		await fs.rm(tempDir, { recursive: true, force: true })
		vi.clearAllMocks()
	})

	it('should initialize a new project successfully', async () => {
		const result = await runInit({ verbose: false })

		expect(result.success).toBe(true)
		expect(result.configPath).toContain('.branchpilot.toml')
		expect(result.ticketsDir).toBe('tickets')
		expect(result.ticketsCreated).toHaveLength(3)

		// Check that config file was created
		const configContent = await fs.readFile('.branchpilot.toml', 'utf8')
		expect(configContent).toContain('dirs = ["tickets"]')
		expect(configContent).toContain('timezone =')

		// Check that tickets directory was created
		const ticketsExists = await fs
			.access('tickets')
			.then(() => true)
			.catch(() => false)
		expect(ticketsExists).toBe(true)

		// Check that example tickets were created
		const files = await fs.readdir('tickets')
		expect(files).toContain('example-immediate.md')
		expect(files).toContain('example-scheduled.md')
		expect(files).toContain('example-advanced.md')
	})

	it('should not reinitialize without force flag', async () => {
		// First initialization
		await runInit({ verbose: false })

		// Try to initialize again without force
		const result = await runInit({ verbose: false })

		expect(result.success).toBe(false)
		expect(result.message).toContain('already initialized')
		expect(result.message).toContain('--force')
	})

	it('should reinitialize with force flag', async () => {
		// First initialization
		await runInit({ verbose: false })

		// Modify the config to verify it gets overwritten
		await fs.writeFile('.branchpilot.toml', '# modified', 'utf8')

		// Reinitialize with force
		const result = await runInit({ force: true, verbose: false })

		expect(result.success).toBe(true)

		// Check that config was regenerated
		const configContent = await fs.readFile('.branchpilot.toml', 'utf8')
		expect(configContent).not.toBe('# modified')
		expect(configContent).toContain('dirs = ["tickets"]')
	})

	it('should handle doctor check failures gracefully', async () => {
		// Mock doctor to return failure
		vi.mocked(doctor.runDoctor).mockResolvedValue(false)

		const result = await runInit({ verbose: false })

		// Should still succeed but with warnings
		expect(result.success).toBe(true)
		expect(result.ticketsCreated).toHaveLength(3)
	})

	it('should handle default branch detection failure gracefully', async () => {
		// Mock getDefaultBranch to throw
		vi.mocked(gitgh.getDefaultBranch).mockRejectedValue(new Error('No git repo'))

		const result = await runInit({ verbose: false })

		expect(result.success).toBe(true)

		// Should use 'main' as fallback
		const immediateContent = await fs.readFile('tickets/example-scheduled.md', 'utf8')
		expect(immediateContent).toContain('base: main')
	})

	it('should create example tickets with correct structure', async () => {
		const result = await runInit({ verbose: false })

		expect(result.success).toBe(true)

		// Check immediate ticket
		const immediateContent = await fs.readFile('tickets/example-immediate.md', 'utf8')
		expect(immediateContent).toContain('branch: example/immediate-fix')
		expect(immediateContent).toContain('title: Fix critical typo in README')
		expect(immediateContent).toContain('when:')
		expect(immediateContent).toContain('labels: ["bug", "documentation"]')

		// Check scheduled ticket
		const scheduledContent = await fs.readFile('tickets/example-scheduled.md', 'utf8')
		expect(scheduledContent).toContain('branch: feature/add-user-profile')
		expect(scheduledContent).toContain('title: Add user profile page')
		expect(scheduledContent).toContain('base: main')

		// Check advanced ticket
		const advancedContent = await fs.readFile('tickets/example-advanced.md', 'utf8')
		expect(advancedContent).toContain('branch: refactor/improve-performance')
		expect(advancedContent).toContain('rebase: true')
		expect(advancedContent).toContain('reviewers:')
		expect(advancedContent).toContain('assignees:')
		expect(advancedContent).toContain('draft: true')
	})

	it('should detect custom default branch', async () => {
		// Mock getDefaultBranch to return custom branch
		vi.mocked(gitgh.getDefaultBranch).mockResolvedValue('develop')

		const result = await runInit({ verbose: false })

		expect(result.success).toBe(true)

		// Check that examples use the detected branch
		const scheduledContent = await fs.readFile('tickets/example-scheduled.md', 'utf8')
		expect(scheduledContent).toContain('base: develop')

		const advancedContent = await fs.readFile('tickets/example-advanced.md', 'utf8')
		expect(advancedContent).toContain('base: develop')
	})
})
