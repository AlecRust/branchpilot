import fs from 'node:fs/promises'
import { DateTime } from 'luxon'
import { describe, expect, it, vi } from 'vitest'
import { loadTickets, parseWhenToUtcISO } from '../../src/core/md-tickets.js'

vi.mock('node:fs/promises')

describe('md-tickets', () => {
	describe('parseWhenToUtcISO', () => {
		it('parses ISO strings with various timezone formats', () => {
			// UTC by default
			expect(parseWhenToUtcISO('2025-08-12T09:30:00')).toMatch(/2025-08-12T09:30:00/)

			// With timezone
			expect(parseWhenToUtcISO('2025-08-12T09:30:00 Europe/London')).toContain('2025-08-12T08:30:00')
			expect(parseWhenToUtcISO('2025-08-12T09:30:00 Europe/Paris')).toContain('2025-08-12T07:30:00')

			// With fallback timezone
			expect(parseWhenToUtcISO('2025-08-12T09:30:00', 'America/Los_Angeles')).toContain('2025-08-12T16:30:00')
		})

		it('parses simplified date formats', () => {
			// Date only (YYYY-MM-DD) - assumes start of day
			expect(parseWhenToUtcISO('2025-01-01')).toContain('2025-01-01T00:00:00')
			expect(parseWhenToUtcISO('2025-01-01 Europe/Paris')).toContain('2024-12-31T23:00:00')

			// Date and time without seconds (YYYY-MM-DDTHH:MM)
			expect(parseWhenToUtcISO('2025-01-01T09:00')).toContain('2025-01-01T09:00:00')
			expect(parseWhenToUtcISO('2025-01-01T09:00 Europe/London')).toContain('2025-01-01T09:00:00')

			// With fallback timezone for simplified formats
			expect(parseWhenToUtcISO('2025-01-01', 'America/Los_Angeles')).toContain('2025-01-01T08:00:00')
			expect(parseWhenToUtcISO('2025-01-01T14:30', 'Europe/London')).toContain('2025-01-01T14:30:00')
		})

		it('throws on invalid input', () => {
			expect(() => parseWhenToUtcISO('invalid-date')).toThrow("Invalid 'when'")
			expect(() => parseWhenToUtcISO('2025-08-12T09:30:00 Invalid/Zone')).toThrow(
				"Invalid timezone 'Invalid/Zone' in 'when'",
			)
		})

		it('handles edge case where DateTime.toISO() returns null', () => {
			const originalFromISO = DateTime.fromISO
			vi.spyOn(DateTime, 'fromISO').mockImplementationOnce(
				() =>
					({
						isValid: true,
						toUTC: () => ({ toISO: () => null }),
					}) as unknown as DateTime,
			)

			expect(() => parseWhenToUtcISO('2025-08-12T09:30:00')).toThrow('Failed to convert to ISO string')
			DateTime.fromISO = originalFromISO
		})
	})

	describe('loadTickets', () => {
		it('returns empty array when directory does not exist', async () => {
			vi.mocked(fs.readdir).mockRejectedValueOnce(new Error('ENOENT'))
			expect(await loadTickets('/nonexistent')).toEqual([])
		})

		it('loads and parses valid markdown tickets', async () => {
			vi.mocked(fs.readdir).mockResolvedValueOnce(['ticket.md', 'readme.txt'])
			vi.mocked(fs.readFile).mockResolvedValueOnce(`---
branch: feature/auth
title: Add authentication
when: "2025-08-12T09:30:00 Europe/London"
base: main
labels: ["auth"]
---
PR body`)

			const tickets = await loadTickets('/test/dir')
			expect(tickets).toHaveLength(1)
			expect(tickets[0]).toMatchObject({
				branch: 'feature/auth',
				title: 'Add authentication',
				body: 'PR body',
				base: 'main',
				labels: ['auth'],
			})
		})

		it('loads and parses ticket with draft flag', async () => {
			vi.mocked(fs.readdir).mockResolvedValueOnce(['draft-ticket.md'])
			vi.mocked(fs.readFile).mockResolvedValueOnce(`---
branch: feature/draft
title: Draft PR
when: "2025-08-12T09:30:00"
draft: true
---
This is a draft PR`)

			const tickets = await loadTickets('/test/dir')
			expect(tickets).toHaveLength(1)
			expect(tickets[0]).toMatchObject({
				branch: 'feature/draft',
				title: 'Draft PR',
				body: 'This is a draft PR',
				draft: true,
			})
		})

		it('skips tickets with invalid front matter', async () => {
			vi.mocked(fs.readdir).mockResolvedValueOnce(['valid.md', 'invalid.md'])
			vi.mocked(fs.readFile)
				.mockResolvedValueOnce('---\nbranch: test\ntitle: Valid\nwhen: "2025-08-12T09:30:00"\n---\n')
				.mockResolvedValueOnce('---\ntitle: Missing branch\nwhen: "2025-08-12T09:30:00"\n---\n')

			const tickets = await loadTickets('/test/dir')
			expect(tickets).toHaveLength(1)
			expect(tickets[0].branch).toBe('test')
		})
	})
})
