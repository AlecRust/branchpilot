import fs from 'node:fs/promises'
import path from 'node:path'
import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listTickets } from '../core/list.js'

describe('list command', () => {
	let tempDir: string
	let originalCwd: string
	let consoleLogSpy: MockInstance

	beforeEach(async () => {
		originalCwd = process.cwd()

		// Create a temporary directory for testing
		tempDir = path.join(originalCwd, `.test-list-${Date.now()}`)
		await fs.mkdir(tempDir, { recursive: true })
		process.chdir(tempDir)

		// Spy on console.log to capture output
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
	})

	afterEach(async () => {
		// Clean up
		process.chdir(originalCwd)
		await fs.rm(tempDir, { recursive: true, force: true })
		vi.clearAllMocks()
		consoleLogSpy.mockRestore()
	})

	it('should list tickets from current directory', async () => {
		// Create test tickets
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

		await listTickets({})

		// Check that output was generated
		const calls = consoleLogSpy.mock.calls
		const output = calls.map((c) => c[0]).join('\n')

		expect(output).toContain('feature-1')
		expect(output).toContain('Add new feature')
		expect(output).toContain('fix-bug')
		expect(output).toContain('Fix critical bug')
		expect(output).toContain('Found 2 tickets')
		expect(output).toContain('1 due')
		expect(output).toContain('1 pending')
	})

	it('should handle invalid tickets', async () => {
		// Create invalid ticket (missing required fields)
		await fs.writeFile(
			'invalid.md',
			`---
branch: feature-1
---
Missing required fields.`,
		)

		await listTickets({})

		const calls = consoleLogSpy.mock.calls
		const output = calls.map((c) => c[0]).join('\n')

		expect(output).toContain('feature-1')
		expect(output).toContain('[missing]')
		expect(output).toContain('Found 1 tickets')
		expect(output).toContain('1 invalid')
	})

	it('should respect timezone configuration', async () => {
		// Create config with timezone
		await fs.writeFile(
			'.branchpilot.toml',
			`timezone = "America/New_York"
dirs = ["."]`,
		)

		// Create ticket with timezone-aware when
		await fs.writeFile(
			'ticket.md',
			`---
branch: feature-1
title: Timezone test
when: 2025-01-01T12:00:00
---
Body`,
		)

		await listTickets({})

		const calls = consoleLogSpy.mock.calls
		const output = calls.map((c) => c[0]).join('\n')

		expect(output).toContain('feature-1')
		expect(output).toContain('Timezone test')
		expect(output).toContain('Found 1 tickets')
	})

	it('should scan multiple directories', async () => {
		// Create subdirectories with tickets
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

		// Create config pointing to both directories
		await fs.writeFile('.branchpilot.toml', `dirs = ["tickets", "more-tickets"]`)

		await listTickets({})

		const calls = consoleLogSpy.mock.calls
		const output = calls.map((c) => c[0]).join('\n')

		expect(output).toContain('feature-1')
		expect(output).toContain('Ticket in tickets dir')
		expect(output).toContain('feature-2')
		expect(output).toContain('Ticket in more-tickets dir')
		expect(output).toContain('Found 2 tickets')
	})

	it('should handle missing directories gracefully', async () => {
		// Create config pointing to non-existent directory
		await fs.writeFile('.branchpilot.toml', `dirs = ["non-existent-dir"]`)

		await listTickets({})

		const calls = consoleLogSpy.mock.calls
		const output = calls.map((c) => c[0]).join('\n')

		expect(output).toContain('No tickets found')
		expect(output).toContain('Found 0 tickets')
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

		await listTickets({})

		// Check that table was output
		const calls = consoleLogSpy.mock.calls
		const output = calls.map((c) => c[0]).join('\n')
		expect(output).toContain('Status')
		expect(output).toContain('Branch')
		expect(output).toContain('Title')
		expect(output).toContain('When')
		expect(output).toContain('Path')
		expect(output).toContain('─') // table separator
	})

	it('should show verbose errors when requested', async () => {
		await fs.writeFile(
			'invalid.md',
			`---
branch: feature-1
---
Missing fields`,
		)

		await listTickets({ verbose: true })

		const calls = consoleLogSpy.mock.calls
		const output = calls.map((c) => c[0]).join('\n')
		// Should show the error message
		expect(output.toLowerCase()).toMatch(/missing|required/)
	})

	it('should support --dir flag to override configured directories', async () => {
		// Create subdirectories with tickets
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

		// Create config pointing to dir3 only
		await fs.writeFile('.branchpilot.toml', `dirs = ["dir3"]`)

		// Use --dir flag to override config and scan dir1 and dir2
		await listTickets({ dirs: ['dir1', 'dir2'] })

		const calls = consoleLogSpy.mock.calls
		const output = calls.map((c) => c[0]).join('\n')

		// Should see tickets from dir1 and dir2 (specified by --dir)
		expect(output).toContain('feature-1')
		expect(output).toContain('Ticket in dir1')
		expect(output).toContain('feature-2')
		expect(output).toContain('Ticket in dir2')

		// Should NOT see ticket from dir3 (not in --dir list)
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

		await listTickets({})

		const calls = consoleLogSpy.mock.calls
		const output = calls.map((c) => c[0]).join('\n')

		// Check that output shows tickets in the right order
		const dueIndex = output.indexOf('due-branch')
		const pendingIndex = output.indexOf('pending-branch')
		const invalidIndex = output.indexOf('invalid-branch')

		expect(dueIndex).toBeLessThan(pendingIndex)
		expect(pendingIndex).toBeLessThan(invalidIndex)
	})
})
