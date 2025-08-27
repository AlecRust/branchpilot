import path from 'node:path'
import { formatRelative, parseISO } from 'date-fns'
import { enGB, enUS } from 'date-fns/locale'
import { loadGlobalConfig, loadRepoConfig } from '../utils/config.js'
import { logger, setVerbose } from '../utils/logger.js'
import { withSpinner } from '../utils/spinner.js'
import { createBorderlessTable } from '../utils/table.js'
import { loadAllTickets } from '../utils/tickets.js'
import type { GlobalConfig, LoadedTicket, TicketStatus } from '../utils/types.js'

type ListOptions = {
	dirs?: string[]
	verbose?: boolean
}

function getSystemLocale() {
	const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
	return systemLocale.startsWith('en-US') ? enUS : enGB
}

function formatTicketStatus(ticket: LoadedTicket): string {
	if (!ticket.dueUtcISO) return ''

	const dueDate = parseISO(ticket.dueUtcISO)
	const now = new Date()

	if (ticket.status === 'pr-exists') {
		return 'PR already exists'
	}

	if (ticket.status === 'merged') {
		const base = ticket.base || 'main'
		return `already merged into ${base}`
	}

	if (ticket.status === 'pending') {
		const relativeTime = formatRelative(dueDate, now, { locale: getSystemLocale() })
		return `scheduled for ${relativeTime}`
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

function outputTickets(tickets: LoadedTicket[]): void {
	if (tickets.length === 0) {
		console.log('No tickets found.')
		return
	}

	const statusOrder: Record<TicketStatus, number> = {
		ready: 0,
		pending: 1,
		'pr-exists': 2,
		merged: 3,
		invalid: 4,
	}

	const sorted = [...tickets].sort((a, b) => {
		const statusDiff = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)
		if (statusDiff !== 0) return statusDiff

		if (a.daysUntilDue !== undefined && b.daysUntilDue !== undefined) {
			return a.daysUntilDue - b.daysUntilDue
		}
		return 0
	})

	const table = createBorderlessTable(['Repository', 'Branch', 'Status'])

	for (const ticket of sorted) {
		const repo = getTicketIdentifier(ticket)
		const status = formatTicketStatus(ticket) || (ticket.error ? `invalid: ${ticket.error}` : '')
		table.push([repo, ticket.branch, status])
	}

	console.log(table.toString())
}

export async function list(options: ListOptions): Promise<void> {
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

	outputTickets(tickets)
}
