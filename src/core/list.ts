import fs from 'node:fs/promises'
import path from 'node:path'
import { blue, gray, green, red, yellow } from 'colorette'
import matter from 'gray-matter'
import { DateTime } from 'luxon'
import { z } from 'zod'
import { loadGlobalConfig, loadRepoConfig } from './config.js'
import { Logger } from './logger.js'
import { parseWhenToUtcISO } from './md-tickets.js'
import { expandPath } from './paths.js'
import { checkTicketPrStatus, getTicketRepoRoot } from './ticket-status.js'
import type { GlobalConfig, RepoConfig } from './types.js'

export type TicketStatus = 'pending' | 'due' | 'pr-exists' | 'merged' | 'invalid' | 'ready'

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
	repository?: string
	base?: string
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

async function scanDirectory(dir: string, baseDir: string): Promise<ListedTicket[]> {
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
					dueUtcISO = parseWhenToUtcISO(fm.data.when)
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

				const newTicket: ListedTicket = {
					file,
					relativePath,
					branch: fm.data.branch,
					title: fm.data.title,
					when: fm.data.when,
					dueUtcISO,
					status: isDue ? 'due' : 'pending',
					daysUntilDue,
				}
				if (fm.data.repository) newTicket.repository = fm.data.repository
				if (fm.data.base) newTicket.base = fm.data.base
				tickets.push(newTicket)
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

function formatTicketStatus(ticket: ListedTicket): string {
	if (!ticket.dueUtcISO) return ''

	const dueDate = DateTime.fromISO(ticket.dueUtcISO)
	const now = DateTime.utc()

	if (ticket.status === 'pr-exists') {
		return 'PR already exists'
	}

	if (ticket.status === 'merged') {
		const base = ticket.base || 'main'
		return `already merged into ${base}`
	}

	if (ticket.status === 'pending') {
		const relativeTime = dueDate.toRelative({ base: now })
		return `scheduled ${relativeTime}`
	}

	if (ticket.status === 'ready') {
		return 'ready to process'
	}

	// For due tickets that haven't been checked yet
	return 'due (unchecked)'
}

function formatTicketLine(ticket: ListedTicket): string {
	const fileName = path.basename(ticket.file)
	const status = formatTicketStatus(ticket)

	if (ticket.status === 'invalid') {
		return red(`[${fileName}] ${ticket.branch} - ${ticket.error || 'invalid ticket'}`)
	}

	if (ticket.status === 'pr-exists' || ticket.status === 'merged' || ticket.status === 'pending') {
		return yellow(`[${fileName}] ${ticket.branch} - ${status}`)
	}

	// Ready status (tickets that are due and can be processed)
	if (ticket.status === 'ready') {
		return green(`[${fileName}] ${ticket.branch} - ${status}`)
	}

	// Due but unchecked
	return yellow(`[${fileName}] ${ticket.branch} - ${status}`)
}

function formatOutput(tickets: ListedTicket[]): string {
	if (tickets.length === 0) {
		return gray('No tickets found.')
	}

	const lines: string[] = []

	// Sort tickets: ready first, then due, then pending, then pr-exists/merged, then invalid
	const sorted = [...tickets].sort((a, b) => {
		const statusOrder = { ready: 0, due: 1, pending: 2, 'pr-exists': 3, merged: 4, invalid: 5 }
		const statusDiff = statusOrder[a.status] - statusOrder[b.status]
		if (statusDiff !== 0) return statusDiff

		// Within same status, sort by due date
		if (a.daysUntilDue !== undefined && b.daysUntilDue !== undefined) {
			return a.daysUntilDue - b.daysUntilDue
		}
		return 0
	})

	// Format each ticket
	for (const ticket of sorted) {
		lines.push(formatTicketLine(ticket))
	}

	return lines.join('\n')
}

function formatSummary(tickets: ListedTicket[]): string {
	const total = tickets.length
	const ready = tickets.filter((t) => t.status === 'ready').length
	const due = tickets.filter((t) => t.status === 'due').length
	const pending = tickets.filter((t) => t.status === 'pending').length
	const prExists = tickets.filter((t) => t.status === 'pr-exists').length
	const merged = tickets.filter((t) => t.status === 'merged').length
	const invalid = tickets.filter((t) => t.status === 'invalid').length

	if (total === 0) {
		return ''
	}

	const details: string[] = []
	if (ready > 0) details.push(`${ready} ready`)
	if (due > 0) details.push(`${due} due (unchecked)`)
	if (pending > 0) details.push(`${pending} pending`)
	if (prExists > 0) details.push(`${prExists} with existing PRs`)
	if (merged > 0) details.push(`${merged} already merged`)
	if (invalid > 0) details.push(`${invalid} invalid`)

	if (details.length === 0) {
		return blue(`\nFound ${total} tickets`)
	}

	return blue(`\nFound ${total} tickets: ${details.join(', ')}`)
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
	const scanPromises = dirsToScan.map((dir) => scanDirectory(dir, cwd))
	const results = await Promise.all(scanPromises)

	for (const tickets of results) {
		allTickets.push(...tickets)
	}

	// Cache for repo configs
	const repoConfigs = new Map<string, RepoConfig>()

	// Check PR status for each ticket
	for (const ticket of allTickets) {
		if (ticket.status === 'invalid') continue

		// Get repository root for this ticket
		const dir = path.dirname(ticket.file)
		try {
			const repoRoot = await getTicketRepoRoot(ticket, dir)

			// Load repo config if we haven't already
			if (!repoConfigs.has(repoRoot)) {
				repoConfigs.set(repoRoot, await loadRepoConfig(repoRoot, logger))
			}
			const repoCfg = repoConfigs.get(repoRoot) ?? {}

			// Check PR status using shared function
			const prStatus = await checkTicketPrStatus(ticket, repoRoot, repoCfg, globalConfig)
			ticket.base = prStatus.base

			// Map PR status to ticket status
			if (prStatus.status === 'pr-exists') {
				ticket.status = 'pr-exists'
			} else if (prStatus.status === 'merged') {
				ticket.status = 'merged'
			} else if (ticket.status === 'due') {
				ticket.status = 'ready'
			}
		} catch {
			// If we can't get repo root or check status, keep original status
		}
	}

	// Output
	console.log(formatOutput(allTickets))
	const summary = formatSummary(allTickets)
	if (summary) {
		console.log(summary)
	}
}
