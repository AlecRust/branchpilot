import path from 'node:path'
import { blue, gray, green, red, yellow } from 'colorette'
import { DateTime } from 'luxon'
import { loadGlobalConfig, loadRepoConfig } from '../utils/config.js'
import { logger, setVerbose } from '../utils/logger.js'
import { withSpinner } from '../utils/spinner.js'
import { type LoadedTicket, loadAllTickets, type TicketStatus } from '../utils/tickets.js'
import type { GlobalConfig } from '../utils/types.js'

export type ListOptions = {
	dirs?: string[]
	verbose?: boolean
}

function formatTicketStatus(ticket: LoadedTicket): string {
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

	return ''
}

function getTicketIdentifier(ticket: LoadedTicket): string {
	// Always use repository name when available
	if (ticket.repoRoot) {
		return path.basename(ticket.repoRoot)
	}
	// For invalid tickets or when repo root is not available,
	// use the parent directory name if it's not a temp test directory
	const dir = path.dirname(ticket.file)
	const dirName = path.basename(dir)

	// If we're in a test directory or the current directory, use the filename
	if (dirName.startsWith('.test-') || dirName === '.') {
		return path.basename(ticket.file)
	}

	return dirName
}

function formatTicketLine(ticket: LoadedTicket): string {
	const identifier = getTicketIdentifier(ticket)
	const status = formatTicketStatus(ticket)

	if (ticket.status === 'invalid') {
		return red(`[${identifier}] ${ticket.branch} - ${ticket.error || 'invalid ticket'}`)
	}

	if (ticket.status === 'pr-exists' || ticket.status === 'merged' || ticket.status === 'pending') {
		return yellow(`[${identifier}] ${ticket.branch} - ${status}`)
	}

	if (ticket.status === 'ready') {
		return green(`[${identifier}] ${ticket.branch} - ${status}`)
	}

	return yellow(`[${identifier}] ${ticket.branch} - ${status}`)
}

function formatOutput(tickets: LoadedTicket[]): string {
	if (tickets.length === 0) {
		return gray('No tickets found.')
	}

	const lines: string[] = []

	const statusOrder: Record<TicketStatus, number> = {
		ready: 0,
		pending: 1,
		'pr-exists': 2,
		merged: 3,
		invalid: 4,
	}

	const sorted = [...tickets].sort((a, b) => {
		const statusDiff = statusOrder[a.status] - statusOrder[b.status]
		if (statusDiff !== 0) return statusDiff

		if (a.daysUntilDue !== undefined && b.daysUntilDue !== undefined) {
			return a.daysUntilDue - b.daysUntilDue
		}
		return 0
	})

	for (const ticket of sorted) {
		lines.push(formatTicketLine(ticket))
	}

	return lines.join('\n')
}

function formatSummary(tickets: LoadedTicket[]): string {
	const total = tickets.length
	const ready = tickets.filter((t) => t.status === 'ready').length
	const pending = tickets.filter((t) => t.status === 'pending').length
	const prExists = tickets.filter((t) => t.status === 'pr-exists').length
	const merged = tickets.filter((t) => t.status === 'merged').length
	const invalid = tickets.filter((t) => t.status === 'invalid').length

	if (total === 0) {
		return ''
	}

	const details: string[] = []
	if (ready > 0) details.push(`${ready} ready`)
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
	setVerbose(options.verbose ?? false)

	const globalConfig = await loadGlobalConfig(undefined, logger)
	const cwd = process.cwd()
	const repoConfig = await loadRepoConfig(cwd, logger)

	const config: GlobalConfig = { ...globalConfig, ...repoConfig }

	const dirsToScan = options.dirs || config.dirs || ['.']

	logger.debug(`Scanning directories: ${dirsToScan.join(', ')}`)

	const tickets = await withSpinner(
		() => loadAllTickets(dirsToScan, config, logger),
		'Loading tickets and checking PR status...',
		options.verbose ?? false,
	)

	console.log(formatOutput(tickets))
	const summary = formatSummary(tickets)
	if (summary) {
		console.log(summary)
	}
}
