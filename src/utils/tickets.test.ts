import fs from 'node:fs/promises'
import { addDays, formatISO } from 'date-fns'
import { describe, expect, it, vi } from 'vitest'
import * as config from './config.js'
import * as git from './git.js'
import * as github from './github.js'
import { logger, setVerbose } from './logger.js'
import { loadAllTickets, loadTicketsForProcessing, parseWhenToUtcISO } from './tickets.js'

vi.mock('node:fs/promises')
vi.mock('node:fs')
vi.mock('./config.js')
vi.mock('./git.js')
vi.mock('./github.js')

describe('tickets', () => {
	setVerbose(false)

	const mockReaddir = (files: string[]) => {
		vi.mocked(fs.readdir).mockResolvedValueOnce(files as never)
	}

	describe('loadAllTickets', () => {
		it('returns empty array when directory does not exist', async () => {
			vi.mocked(fs.readdir).mockRejectedValueOnce(new Error('ENOENT'))
			expect(await loadAllTickets(['/nonexistent'], {}, logger)).toEqual([])
		})

		it('loads and parses valid markdown tickets', async () => {
			mockReaddir(['ticket.md', 'readme.txt'])
			vi.mocked(fs.readFile).mockResolvedValueOnce(`---
branch: feature/auth
title: Add authentication
when: "2024-01-01T09:30:00Z"
base: main
labels: ["auth"]
---
PR body`)

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})
			vi.mocked(github.gh).mockResolvedValue('[]')
			vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
			vi.mocked(git.hasUnmergedCommits).mockResolvedValue(true)

			const tickets = await loadAllTickets(['/test/dir'], {}, logger)
			expect(tickets).toHaveLength(1)
			expect(tickets[0]).toMatchObject({
				branch: 'feature/auth',
				title: 'Add authentication',
				body: 'PR body',
				base: 'main',
				labels: ['auth'],
				status: 'ready',
			})
		})

		it('loads and parses ticket with draft flag', async () => {
			mockReaddir(['draft-ticket.md'])
			vi.mocked(fs.readFile).mockResolvedValueOnce(`---
branch: feature/draft
title: Draft PR
when: "2024-01-01T09:30:00"
draft: true
---
This is a draft PR`)

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})
			vi.mocked(github.gh).mockResolvedValue('[]')
			vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
			vi.mocked(git.hasUnmergedCommits).mockResolvedValue(true)

			const tickets = await loadAllTickets(['/test/dir'], {}, logger)
			expect(tickets).toHaveLength(1)
			expect(tickets[0]).toMatchObject({
				branch: 'feature/draft',
				title: 'Draft PR',
				body: 'This is a draft PR',
				draft: true,
			})
		})

		it('marks tickets with invalid front matter as invalid', async () => {
			mockReaddir(['valid.md', 'invalid.md'])
			vi.mocked(fs.readFile)
				.mockResolvedValueOnce('---\nbranch: test\ntitle: Valid\nwhen: "2024-01-01T09:30:00"\n---\n')
				.mockResolvedValueOnce('---\ntitle: Missing branch\nwhen: "2024-01-01T09:30:00"\n---\n')

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})
			vi.mocked(github.gh).mockResolvedValue('[]')
			vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
			vi.mocked(git.hasUnmergedCommits).mockResolvedValue(true)

			const tickets = await loadAllTickets(['/test/dir'], {}, logger)
			expect(tickets).toHaveLength(2)
			expect(tickets[0]?.branch).toBe('test')
			expect(tickets[0]?.status).toBe('ready')
			expect(tickets[1]?.status).toBe('invalid')
			expect(tickets[1]?.error).toContain('Missing required fields: branch')
		})

		it('skips non-ticket markdown files and unrelated frontmatter', async () => {
			mockReaddir(['note.md', 'ticket.md', 'just-frontmatter.md'])
			vi.mocked(fs.readFile)
				// note.md: no frontmatter -> should be ignored
				.mockResolvedValueOnce('This is a plain markdown note without frontmatter')
				// ticket.md: valid ticket -> should be included
				.mockResolvedValueOnce(`---\nbranch: feature/ok\nwhen: "2024-01-01T00:00:00"\n---\nBody`)
				// just-frontmatter.md: has frontmatter but neither branch nor when -> should be ignored
				.mockResolvedValueOnce(`---\ntitle: Just a document\nauthor: Someone\n---\nSome content`)

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})
			vi.mocked(github.gh).mockResolvedValue('[]')
			vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
			vi.mocked(git.hasUnmergedCommits).mockResolvedValue(true)

			const tickets = await loadAllTickets(['/test/dir'], {}, logger)
			expect(tickets).toHaveLength(1)
			expect(tickets[0]?.branch).toBe('feature/ok')
			expect(tickets[0]?.status === 'ready' || tickets[0]?.status === 'pending').toBe(true)
		})

		it('handles tickets without title and body', async () => {
			mockReaddir(['minimal.md'])
			vi.mocked(fs.readFile).mockResolvedValueOnce(`---
branch: feature/minimal
when: "2024-01-01T00:00:00"
---
`)

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})
			vi.mocked(github.gh).mockResolvedValue('[]')
			vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
			vi.mocked(git.hasUnmergedCommits).mockResolvedValue(true)

			const tickets = await loadAllTickets(['/test/dir'], {}, logger)
			expect(tickets).toHaveLength(1)
			expect(tickets[0]?.branch).toBe('feature/minimal')
			expect(tickets[0]?.status).toBe('ready')
			expect(tickets[0]?.title).toBeUndefined()
			expect(tickets[0]?.body).toBeUndefined()
		})

		it('handles tickets with existing PRs', async () => {
			mockReaddir(['ticket.md'])
			vi.mocked(fs.readFile).mockResolvedValueOnce(`---
branch: feature/existing
title: Has PR
when: "2024-01-01T00:00:00"
---
Body`)

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})
			vi.mocked(github.gh).mockResolvedValue('[{"number": 123}]') // PR exists
			vi.mocked(github.getDefaultBranch).mockResolvedValue('main')

			const tickets = await loadAllTickets(['/test/dir'], {}, logger)
			expect(tickets).toHaveLength(1)
			expect(tickets[0]?.status).toBe('pr-exists')
		})

		it('handles merged tickets', async () => {
			mockReaddir(['ticket.md'])
			vi.mocked(fs.readFile).mockResolvedValueOnce(`---
branch: feature/merged
title: Already merged
when: "2024-01-01T00:00:00"
---
Body`)

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})
			vi.mocked(github.gh).mockResolvedValue('[]') // No PR
			vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
			vi.mocked(git.isBranchMerged).mockResolvedValue(true)

			const tickets = await loadAllTickets(['/test/dir'], {}, logger)
			expect(tickets).toHaveLength(1)
			expect(tickets[0]?.status).toBe('merged')
		})

		it('marks pending tickets correctly', async () => {
			const futureDate = formatISO(addDays(new Date(), 1))
			mockReaddir(['ticket.md'])
			vi.mocked(fs.readFile).mockResolvedValueOnce(`---
branch: feature/future
title: Future ticket
when: "${futureDate}"
---
Body`)

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})

			const tickets = await loadAllTickets(['/test/dir'], {}, logger)
			expect(tickets).toHaveLength(1)
			expect(tickets[0]?.status).toBe('pending')
			expect(tickets[0]?.isDue).toBe(false)
		})
	})

	describe('loadTicketsForProcessing', () => {
		it('returns only ready tickets', async () => {
			vi.mocked(fs.readdir).mockResolvedValue(['ticket1.md', 'ticket2.md', 'ticket3.md'] as never)
			vi.mocked(fs.readFile)
				.mockResolvedValueOnce(`---
branch: ready
title: Ready ticket
when: "2024-01-01T00:00:00"
---`)
				.mockResolvedValueOnce(`---
branch: existing
title: Has PR
when: "2024-01-01T00:00:00"
---`)
				.mockResolvedValueOnce(`---
branch: future
title: Future
when: "2030-01-01T00:00:00"
---`)

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})
			vi.mocked(github.gh)
				.mockResolvedValueOnce('[]') // First ticket: no PR
				.mockResolvedValueOnce('[{"number": 123}]') // Second ticket: PR exists
			vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
			vi.mocked(git.isBranchMerged).mockResolvedValue(false)
			vi.mocked(git.hasUnmergedCommits).mockResolvedValue(true)

			const tickets = await loadTicketsForProcessing(['/test'], {}, logger)
			expect(tickets).toHaveLength(1)
			expect(tickets[0]?.branch).toBe('ready')
		})
	})

	describe('error handling and edge cases', () => {
		it('handles repository path that does not exist', async () => {
			mockReaddir(['ticket.md'])
			vi.mocked(fs.readFile).mockResolvedValueOnce(`---
branch: test
title: Test
when: "2024-01-01T00:00:00"
repository: "/nonexistent/path"
---`)
			const { existsSync } = await import('node:fs')
			vi.mocked(existsSync).mockReturnValue(false)

			const tickets = await loadAllTickets(['/test'], {}, logger)
			expect(tickets).toHaveLength(1)
			expect(tickets[0]?.status).toBe('invalid')
			expect(tickets[0]?.error).toContain('Repository path does not exist')
		})

		it('handles gh pr list errors gracefully', async () => {
			mockReaddir(['ticket.md'])
			vi.mocked(fs.readFile).mockResolvedValueOnce(`---
branch: test
title: Test
when: "2024-01-01T00:00:00"
---`)

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})
			vi.mocked(github.gh).mockRejectedValueOnce(new Error('gh error'))
			vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
			vi.mocked(git.isBranchMerged).mockResolvedValue(false)
			vi.mocked(git.hasUnmergedCommits).mockResolvedValue(true)

			const tickets = await loadAllTickets(['/test'], {}, logger)
			expect(tickets).toHaveLength(1)
			expect(tickets[0]?.status).toBe('ready')
		})

		it('handles file read errors gracefully', async () => {
			mockReaddir(['good.md', 'bad.md'])
			vi.mocked(fs.readFile)
				.mockResolvedValueOnce(`---
branch: good
title: Good
when: "2024-01-01T00:00:00"
---`)
				.mockRejectedValueOnce(new Error('File read error'))

			vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
			vi.mocked(config.loadRepoConfig).mockResolvedValue({})
			vi.mocked(github.gh).mockResolvedValue('[]')
			vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
			vi.mocked(git.hasUnmergedCommits).mockResolvedValue(true)

			const tickets = await loadAllTickets(['/test'], {}, logger)
			expect(tickets).toHaveLength(2)
			expect(tickets[0]?.status).toBe('ready')
			expect(tickets[1]?.status).toBe('invalid')
		})
	})

	describe('parseWhenToUtcISO', () => {
		it('parses various date formats correctly', () => {
			expect(parseWhenToUtcISO('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00.000Z')
			expect(parseWhenToUtcISO('2024-01-15')).toMatch(/^2024-01-15/)
			expect(parseWhenToUtcISO('01/15/2024')).toMatch(/^2024-01-15/)
			expect(parseWhenToUtcISO('2024-01-15 10:30:00')).toMatch(/^2024-01-15/)
		})

		it('accepts timezone parameter', () => {
			const result = parseWhenToUtcISO('2024-01-15 10:00:00', 'America/New_York')
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
		})

		it('uses offset when present, ignoring timezone parameter', () => {
			// When date has offset, it takes precedence over timezone field
			const withOffset = parseWhenToUtcISO('2024-01-15T10:00:00-05:00', 'Europe/London')
			expect(withOffset).toBe('2024-01-15T15:00:00.000Z') // -05:00 offset is used, not London
		})

		it('throws error for invalid date', () => {
			expect(() => parseWhenToUtcISO('not a date')).toThrow("Invalid 'when': not a date")
		})
	})
})
