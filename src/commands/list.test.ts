import fs from 'node:fs/promises'
import path from 'node:path'
import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as git from '../utils/git.js'
import * as github from '../utils/github.js'
import { logger } from '../utils/logger.js'
import { list } from './list.js'

vi.mock('node:fs')
vi.mock('../utils/git.js')
vi.mock('../utils/github.js')

describe('list command', () => {
	let tempDir: string
	let originalCwd: string
	let consoleLogSpy: MockInstance
	let loggerSuccessSpy: MockInstance
	let loggerWarnSpy: MockInstance
	let loggerErrorSpy: MockInstance
	let loggerInfoSpy: MockInstance
	const mockRepoPath = '/Users/test/projects/test-repo'

	beforeEach(async () => {
		originalCwd = process.cwd()

		tempDir = path.join(originalCwd, `.test-list-${Date.now()}`)
		await fs.mkdir(tempDir, { recursive: true })
		process.chdir(tempDir)

		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		loggerSuccessSpy = vi.spyOn(logger, 'success').mockImplementation(() => {})
		loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
		loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
		loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})

		vi.mocked(git.getGitRoot).mockResolvedValue(mockRepoPath)
		vi.mocked(git.isGitRepository).mockResolvedValue(true)
		vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
		vi.mocked(github.gh).mockResolvedValue('[]')
		vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
		vi.mocked(git.hasUnmergedCommits).mockResolvedValue(true)
	})

	afterEach(async () => {
		process.chdir(originalCwd)
		await fs.rm(tempDir, { recursive: true, force: true })
		vi.clearAllMocks()
		consoleLogSpy.mockRestore()
		loggerSuccessSpy.mockRestore()
		loggerWarnSpy.mockRestore()
		loggerErrorSpy.mockRestore()
		loggerInfoSpy.mockRestore()
	})

	it('should list tickets from current directory', async () => {
		await fs.writeFile(
			'ticket1.md',
			`---
branch: feature-1
title: Add new feature
when: 2025-12-01T10:00:00Z
---
This is the body of ticket 1.`,
		)

		await fs.writeFile(
			'ticket2.md',
			`---
branch: fix-bug
title: Fix critical bug
when: 2024-01-01T10:00:00Z
---
This is the body of ticket 2.`,
		)

		await list({ dirs: ['.'] })

		const allCalls = [
			...loggerSuccessSpy.mock.calls.map((c) => c[0]),
			...loggerWarnSpy.mock.calls.map((c) => c[0]),
			...loggerInfoSpy.mock.calls.map((c) => c[0]),
			...loggerErrorSpy.mock.calls.map((c) => c[0]),
			...consoleLogSpy.mock.calls.map((c) => c[0]),
		]
		const output = allCalls.join('\n')

		expect(output).toContain('Repository')
		expect(output).toContain('Branch')
		expect(output).toContain('Status')
		expect(output).toContain('test-repo')
		expect(output).toContain('feature-1')
		expect(output).toContain('fix-bug')
		expect(output).toContain('ready to process')
	})

	it('should handle invalid tickets', async () => {
		await fs.writeFile(
			'invalid.md',
			`---
branch: feature-1
---
Missing required fields.`,
		)

		await list({ dirs: ['.'] })

		const allCalls = [
			...loggerSuccessSpy.mock.calls.map((c) => c[0]),
			...loggerWarnSpy.mock.calls.map((c) => c[0]),
			...loggerInfoSpy.mock.calls.map((c) => c[0]),
			...loggerErrorSpy.mock.calls.map((c) => c[0]),
			...consoleLogSpy.mock.calls.map((c) => c[0]),
		]
		const output = allCalls.join('\n')

		expect(output).toContain('invalid.md')
		expect(output).toContain('feature-1')
		expect(output).toContain('invalid')
	})

	it('should handle ISO dates with timezone offset', async () => {
		await fs.writeFile('.branchpilot.toml', `dirs = ["."]`)

		await fs.writeFile(
			'ticket.md',
			`---
branch: feature-1
title: Timezone test
when: 2025-01-01T12:00:00-05:00
---
Body`,
		)

		await list({ dirs: ['.'] })

		const allCalls = [
			...loggerSuccessSpy.mock.calls.map((c) => c[0]),
			...loggerWarnSpy.mock.calls.map((c) => c[0]),
			...loggerInfoSpy.mock.calls.map((c) => c[0]),
			...loggerErrorSpy.mock.calls.map((c) => c[0]),
			...consoleLogSpy.mock.calls.map((c) => c[0]),
		]
		const output = allCalls.join('\n')

		expect(output).toContain('test-repo')
		expect(output).toContain('feature-1')
	})

	it('should scan multiple directories', async () => {
		await fs.mkdir('tickets', { recursive: true })
		await fs.mkdir('more-tickets', { recursive: true })

		await fs.writeFile(
			'tickets/ticket1.md',
			`---
branch: feature-1
title: Ticket in tickets dir
when: 2025-01-01T10:00:00Z
---
Body`,
		)

		await fs.writeFile(
			'more-tickets/ticket2.md',
			`---
branch: feature-2
title: Ticket in more-tickets dir
when: 2025-01-02T10:00:00Z
---
Body`,
		)

		await fs.writeFile('.branchpilot.toml', `dirs = ["tickets", "more-tickets"]`)

		await list({})

		const allCalls = [
			...loggerSuccessSpy.mock.calls.map((c) => c[0]),
			...loggerWarnSpy.mock.calls.map((c) => c[0]),
			...loggerInfoSpy.mock.calls.map((c) => c[0]),
			...loggerErrorSpy.mock.calls.map((c) => c[0]),
			...consoleLogSpy.mock.calls.map((c) => c[0]),
		]
		const output = allCalls.join('\n')

		expect(output).toContain('test-repo')
		expect(output).toContain('feature-1')
		expect(output).toContain('feature-2')
	})

	it('should handle missing directories gracefully', async () => {
		await fs.writeFile('.branchpilot.toml', `dirs = ["non-existent-dir"]`)

		await list({ dirs: ['.'] })

		const allCalls = [
			...loggerSuccessSpy.mock.calls.map((c) => c[0]),
			...loggerWarnSpy.mock.calls.map((c) => c[0]),
			...loggerInfoSpy.mock.calls.map((c) => c[0]),
			...loggerErrorSpy.mock.calls.map((c) => c[0]),
			...consoleLogSpy.mock.calls.map((c) => c[0]),
		]
		const output = allCalls.join('\n')

		expect(output).toContain('No tickets found')
	})

	it('should format output as table', async () => {
		await fs.writeFile(
			'ticket.md',
			`---
branch: feature-1
title: Test ticket
when: 2025-01-01T10:00:00Z
---
Body`,
		)

		await list({ dirs: ['.'] })

		const allCalls = [
			...loggerSuccessSpy.mock.calls.map((c) => c[0]),
			...loggerWarnSpy.mock.calls.map((c) => c[0]),
			...loggerInfoSpy.mock.calls.map((c) => c[0]),
			...loggerErrorSpy.mock.calls.map((c) => c[0]),
			...consoleLogSpy.mock.calls.map((c) => c[0]),
		]
		const output = allCalls.join('\n')
		expect(output).toContain('test-repo')
		expect(output).toContain('feature-1')
	})

	it('should show verbose errors when requested', async () => {
		await fs.writeFile(
			'invalid.md',
			`---
branch: feature-1
---
Missing fields`,
		)

		await list({ dirs: ['.'], verbose: true })

		const allCalls = [
			...loggerSuccessSpy.mock.calls.map((c) => c[0]),
			...loggerWarnSpy.mock.calls.map((c) => c[0]),
			...loggerInfoSpy.mock.calls.map((c) => c[0]),
			...loggerErrorSpy.mock.calls.map((c) => c[0]),
			...consoleLogSpy.mock.calls.map((c) => c[0]),
		]
		const output = allCalls.join('\n')
		expect(output.toLowerCase()).toMatch(/missing|required/)
	})

	it('should support --dir flag to override configured directories', async () => {
		await fs.mkdir('dir1', { recursive: true })
		await fs.mkdir('dir2', { recursive: true })
		await fs.mkdir('dir3', { recursive: true })

		await fs.writeFile(
			'dir1/ticket1.md',
			`---
branch: feature-1
title: Ticket in dir1
when: 2025-01-01T10:00:00Z
---
Body`,
		)

		await fs.writeFile(
			'dir2/ticket2.md',
			`---
branch: feature-2
title: Ticket in dir2
when: 2025-01-02T10:00:00Z
---
Body`,
		)

		await fs.writeFile(
			'dir3/ticket3.md',
			`---
branch: feature-3
title: Ticket in dir3
when: 2025-01-03T10:00:00Z
---
Body`,
		)

		await fs.writeFile('.branchpilot.toml', `dirs = ["dir3"]`)

		await list({ dirs: ['dir1', 'dir2'] })

		const allCalls = [
			...loggerSuccessSpy.mock.calls.map((c) => c[0]),
			...loggerWarnSpy.mock.calls.map((c) => c[0]),
			...loggerInfoSpy.mock.calls.map((c) => c[0]),
			...loggerErrorSpy.mock.calls.map((c) => c[0]),
			...consoleLogSpy.mock.calls.map((c) => c[0]),
		]
		const output = allCalls.join('\n')

		expect(output).toContain('test-repo')
		expect(output).toContain('feature-1')
		expect(output).toContain('feature-2')
		expect(output).not.toContain('feature-3')
		expect(output).not.toContain('Ticket in dir3')
	})

	it('should sort tickets by status and due date', async () => {
		const now = new Date()
		const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
		const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000) // in 10 days

		await fs.writeFile(
			'due.md',
			`---
branch: due-branch
title: Due ticket
when: ${past.toISOString()}
---
Body`,
		)

		await fs.writeFile(
			'pending.md',
			`---
branch: pending-branch
title: Pending ticket
when: ${future.toISOString()}
---
Body`,
		)

		await fs.writeFile(
			'invalid.md',
			`---
branch: invalid-branch
---
Invalid`,
		)

		await list({ dirs: ['.'] })

		const allCalls = [
			...loggerSuccessSpy.mock.calls.map((c) => c[0]),
			...loggerWarnSpy.mock.calls.map((c) => c[0]),
			...loggerInfoSpy.mock.calls.map((c) => c[0]),
			...loggerErrorSpy.mock.calls.map((c) => c[0]),
			...consoleLogSpy.mock.calls.map((c) => c[0]),
		]
		const output = allCalls.join('\n')

		const dueIndex = output.indexOf('due-branch')
		const pendingIndex = output.indexOf('pending-branch')
		const invalidIndex = output.indexOf('invalid-branch')

		expect(dueIndex).toBeLessThan(pendingIndex)
		expect(pendingIndex).toBeLessThan(invalidIndex)
	})
})
