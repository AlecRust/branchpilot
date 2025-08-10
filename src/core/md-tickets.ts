import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { DateTime } from 'luxon'
import { z } from 'zod'
import type { Ticket } from './types.js'

const TicketFront = z.object({
	branch: z.string(),
	title: z.string(),
	when: z.union([z.string(), z.date()]).transform((val) => {
		// Convert Date to ISO string if needed
		return val instanceof Date ? val.toISOString() : val
	}), // "2025-08-12T09:30:00 Europe/London" or ISO
	base: z.string().optional(),
	rebase: z.boolean().optional(), // whether to rebase onto base branch
	pushMode: z.enum(['force-with-lease', 'ff-only', 'force']).optional(),
	labels: z.array(z.string()).optional(),
	reviewers: z.array(z.string()).optional(),
	assignees: z.array(z.string()).optional(),
	repository: z.string().optional(), // optional local path to repository
	draft: z.boolean().optional(), // whether to open PR as a draft
})

export function parseWhenToUtcISO(whenStr: string, fallbackZone?: string): string {
	const parts = whenStr.trim().split(/\s+/)
	let dt: DateTime

	// Check if timezone is specified as second part
	if (parts.length === 2 && parts[0] && parts[1]) {
		dt = parseDateTime(parts[0], parts[1])
	} else {
		// Use fallback zone or UTC
		const zone = fallbackZone ?? 'utc'
		dt = parseDateTime(whenStr, zone)
	}

	if (!dt.isValid) throw new Error(`Invalid 'when': ${whenStr}`)
	const isoString = dt.toUTC().toISO()
	if (isoString === null) {
		throw new Error(`Failed to convert to ISO string: ${whenStr}`)
	}
	return isoString
}

function parseDateTime(dateStr: string, zone: string): DateTime {
	// Try full ISO format first
	let dt = DateTime.fromISO(dateStr, { zone })
	if (dt.isValid) return dt

	// Support simplified formats
	// Format: YYYY-MM-DD (assumes start of day in given timezone)
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		dt = DateTime.fromISO(`${dateStr}T00:00:00`, { zone })
		if (dt.isValid) return dt
	}

	// Format: YYYY-MM-DDTHH:MM (without seconds)
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr)) {
		dt = DateTime.fromISO(`${dateStr}:00`, { zone })
		if (dt.isValid) return dt
	}

	// Return invalid DateTime if nothing matches
	return DateTime.invalid('unparseable')
}

export async function loadTickets(dir: string, fallbackZone?: string): Promise<Ticket[]> {
	let entries: string[] = []
	try {
		entries = await fs.readdir(dir)
	} catch {
		return []
	}
	const mdFiles = entries.filter((f) => f.toLowerCase().endsWith('.md'))
	const tickets: Ticket[] = []

	for (const f of mdFiles) {
		const file = path.join(dir, f)
		const raw = await fs.readFile(file, 'utf8')
		const parsed = matter(raw)
		const fm = TicketFront.safeParse(parsed.data)
		if (!fm.success) continue
		const dueUtcISO = parseWhenToUtcISO(fm.data.when, fallbackZone)
		const ticket: Ticket = {
			file,
			branch: fm.data.branch,
			title: fm.data.title,
			when: fm.data.when,
			dueUtcISO,
			body: parsed.content.trim(),
		}
		if (fm.data.base) ticket.base = fm.data.base
		if (fm.data.rebase) ticket.rebase = fm.data.rebase
		if (fm.data.pushMode) ticket.pushMode = fm.data.pushMode
		if (fm.data.labels) ticket.labels = fm.data.labels
		if (fm.data.reviewers) ticket.reviewers = fm.data.reviewers
		if (fm.data.assignees) ticket.assignees = fm.data.assignees
		if (fm.data.repository) ticket.repository = fm.data.repository
		if (fm.data.draft) ticket.draft = fm.data.draft
		tickets.push(ticket)
	}
	return tickets
}
