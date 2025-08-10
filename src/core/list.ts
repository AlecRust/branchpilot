import fs from 'node:fs/promises'
import path from 'node:path'
import { blue, cyan, gray, green, red, yellow } from 'colorette'
import matter from 'gray-matter'
import { DateTime } from 'luxon'
import { z } from 'zod'
import { loadGlobalConfig, loadRepoConfig } from './config.js'
import { Logger } from './logger.js'
import { parseWhenToUtcISO } from './md-tickets.js'
import { expandPath } from './paths.js'
import type { GlobalConfig } from './types.js'

export type TicketStatus = 'pending' | 'due' | 'invalid'

export type ListedTicket = {
	file: string
	relativePath: string
	branch: string
	title: string
	when: string
	dueUtcISO?: string
	status: TicketStatus
	error?: string
	daysUntilDue?: number
}

export type ListOptions = {
	dirs?: string[]
	verbose?: boolean
}

const TicketFront = z.object({
	branch: z.string(),
	title: z.string(),
	when: z.union([z.string(), z.date()]).transform((val) => {
		return val instanceof Date ? val.toISOString() : val
	}),
	base: z.string().optional(),
	rebase: z.boolean().optional(),
	pushMode: z.enum(['force-with-lease', 'ff-only', 'force']).optional(),
	labels: z.array(z.string()).optional(),
	reviewers: z.array(z.string()).optional(),
	assignees: z.array(z.string()).optional(),
	repository: z.string().optional(),
	draft: z.boolean().optional(),
})

async function scanDirectory(dir: string, baseDir: string, fallbackZone?: string): Promise<ListedTicket[]> {
	const tickets: ListedTicket[] = []

	try {
		const entries = await fs.readdir(dir)
		const mdFiles = entries.filter((f) => f.toLowerCase().endsWith('.md'))

		for (const f of mdFiles) {
			const file = path.join(dir, f)
			const relativePath = path.relative(baseDir, file)

			try {
				const raw = await fs.readFile(file, 'utf8')
				const parsed = matter(raw)
				const fm = TicketFront.safeParse(parsed.data)

				if (!fm.success) {
					// Extract specific missing fields
					const missingFields: string[] = []
					const data = parsed.data || {}

					if (!data.branch) missingFields.push('branch')
					if (!data.title) missingFields.push('title')
					if (!data.when) missingFields.push('when')

					const errorMsg =
						missingFields.length > 0
							? `Missing required fields: ${missingFields.join(', ')}`
							: fm.error.issues
									.map((issue) => {
										const fieldPath = issue.path.join('.')
										return fieldPath ? `${fieldPath}: ${issue.message}` : issue.message
									})
									.join(', ')

					tickets.push({
						file,
						relativePath,
						branch: data.branch || '[missing]',
						title: data.title || '[missing]',
						when: data.when || '[missing]',
						status: 'invalid',
						error: errorMsg,
					})
					continue
				}

				let dueUtcISO: string
				try {
					dueUtcISO = parseWhenToUtcISO(fm.data.when, fallbackZone)
				} catch (error) {
					tickets.push({
						file,
						relativePath,
						branch: fm.data.branch,
						title: fm.data.title,
						when: fm.data.when,
						status: 'invalid',
						error: `Invalid 'when' format: ${error}`,
					})
					continue
				}

				const now = DateTime.utc()
				const dueDate = DateTime.fromISO(dueUtcISO)
				const isDue = dueDate <= now
				const daysUntilDue = Math.floor(dueDate.diff(now, 'days').days)

				tickets.push({
					file,
					relativePath,
					branch: fm.data.branch,
					title: fm.data.title,
					when: fm.data.when,
					dueUtcISO,
					status: isDue ? 'due' : 'pending',
					daysUntilDue,
				})
			} catch (error) {
				tickets.push({
					file,
					relativePath,
					branch: '[error]',
					title: '[error]',
					when: '[error]',
					status: 'invalid',
					error: `Failed to read file: ${error}`,
				})
			}
		}
	} catch {
		// Directory doesn't exist or can't be read - return empty array
	}

	return tickets
}

function formatRelativeTime(daysUntilDue: number | undefined): string {
	if (daysUntilDue === undefined) return ''

	const absDays = Math.abs(daysUntilDue)

	if (daysUntilDue < 0) {
		if (absDays === 0) return 'today'
		if (absDays === 1) return '1 day ago'
		if (absDays < 7) return `${absDays} days ago`
		if (absDays < 30) return `${Math.floor(absDays / 7)} weeks ago`
		return `${Math.floor(absDays / 30)} months ago`
	}

	if (daysUntilDue === 0) return 'today'
	if (daysUntilDue === 1) return 'in 1 day'
	if (daysUntilDue < 7) return `in ${daysUntilDue} days`
	if (daysUntilDue < 30) return `in ${Math.floor(daysUntilDue / 7)} weeks`
	return `in ${Math.floor(daysUntilDue / 30)} months`
}

function formatStatus(status: TicketStatus): string {
	switch (status) {
		case 'due':
			return yellow('✓ due')
		case 'pending':
			return green('⏳ pend')
		case 'invalid':
			return red('✗ inv')
	}
}

function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str
	return `${str.substring(0, maxLen - 3)}...`
}

function formatTable(tickets: ListedTicket[], verbose: boolean): string {
	if (tickets.length === 0) {
		return gray('No tickets found.')
	}

	const lines: string[] = []

	// Header
	lines.push(cyan('Status   Branch                Title                         When            Path'))
	lines.push(gray('─'.repeat(85)))

	// Sort tickets: due first, then pending, then invalid
	const sorted = [...tickets].sort((a, b) => {
		const statusOrder = { due: 0, pending: 1, invalid: 2 }
		const statusDiff = statusOrder[a.status] - statusOrder[b.status]
		if (statusDiff !== 0) return statusDiff

		// Within same status, sort by due date
		if (a.daysUntilDue !== undefined && b.daysUntilDue !== undefined) {
			return a.daysUntilDue - b.daysUntilDue
		}
		return 0
	})

	// Rows
	for (const ticket of sorted) {
		const status = formatStatus(ticket.status)
		const branch = truncate(ticket.branch, 20).padEnd(20)
		const title =
			ticket.status === 'invalid' && ticket.error && verbose ? red(`[${ticket.error}]`) : truncate(ticket.title, 28)
		const titlePadded = title.padEnd(28)
		const when = ticket.status === 'invalid' ? ''.padEnd(14) : formatRelativeTime(ticket.daysUntilDue).padEnd(14)
		const pathStr = truncate(ticket.relativePath, 25)

		lines.push(`${status}  ${branch} ${titlePadded} ${when} ${pathStr}`)
	}

	return lines.join('\n')
}

function formatSummary(tickets: ListedTicket[]): string {
	const total = tickets.length
	const due = tickets.filter((t) => t.status === 'due').length
	const pending = tickets.filter((t) => t.status === 'pending').length
	const invalid = tickets.filter((t) => t.status === 'invalid').length

	const parts: string[] = [`Found ${total} tickets`]

	if (total > 0) {
		const details: string[] = []
		if (due > 0) details.push(`${due} due`)
		if (pending > 0) details.push(`${pending} pending`)
		if (invalid > 0) details.push(`${invalid} invalid`)
		parts.push(details.join(', '))
	}

	return blue(`\n${parts.join(': ')}`)
}

export async function listTickets(options: ListOptions): Promise<void> {
	const logger = new Logger(options.verbose ?? false)

	// Load configuration
	const globalConfig = await loadGlobalConfig(undefined, logger)
	const cwd = process.cwd()
	const repoConfig = await loadRepoConfig(cwd, logger)

	// Merge configs (repo overrides global)
	const config: GlobalConfig = { ...globalConfig, ...repoConfig }

	// Determine directories to scan (--dir flag overrides config)
	let dirsToScan: string[] = options.dirs || config.dirs || ['.']

	// Expand paths
	dirsToScan = dirsToScan.map((d) => expandPath(d))

	logger.verbose(`Scanning directories: ${dirsToScan.join(', ')}`)

	// Scan all directories in parallel
	const allTickets: ListedTicket[] = []
	const scanPromises = dirsToScan.map((dir) => scanDirectory(dir, cwd, config.timezone))
	const results = await Promise.all(scanPromises)

	for (const tickets of results) {
		allTickets.push(...tickets)
	}

	// Output
	console.log(formatTable(allTickets, options.verbose ?? false))
	console.log(formatSummary(allTickets))
}
