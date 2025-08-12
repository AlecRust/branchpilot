import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import matter from 'gray-matter'
import { DateTime, IANAZone } from 'luxon'
import { z } from 'zod'
import { loadRepoConfig } from './config.js'
import { getGitRoot, hasUnmergedCommits, isBranchMerged, isGitRepository } from './git.js'
import { getDefaultBranch, gh } from './github.js'
import type { logger } from './logger.js'
import { expandPath } from './paths.js'
import type { GlobalConfig, PushMode, RepoConfig } from './types.js'

type Logger = typeof logger

const validTimezoneCache = new Map<string, boolean>()

function isValidTimezone(zone: string): boolean {
	const cached = validTimezoneCache.get(zone)
	if (cached !== undefined) {
		return cached
	}

	const ianaZone = IANAZone.create(zone)
	const isValid = ianaZone.isValid
	validTimezoneCache.set(zone, isValid)
	return isValid
}

function getSystemTimezone(): string {
	return DateTime.local().zoneName ?? 'UTC'
}

const TicketFrontSchema = z.object({
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
	autoMerge: z.boolean().optional(),
})

export type TicketStatus = 'pending' | 'ready' | 'pr-exists' | 'merged' | 'invalid'
export type TicketPrStatus = 'pr-exists' | 'merged' | 'ready'

export interface LoadedTicket {
	file: string
	relativePath: string
	branch: string
	title: string
	when: string
	body: string

	base?: string
	rebase?: boolean
	pushMode?: PushMode
	labels?: string[]
	reviewers?: string[]
	assignees?: string[]
	repository?: string
	draft?: boolean
	autoMerge?: boolean

	status: TicketStatus
	dueUtcISO?: string
	isDue: boolean
	daysUntilDue?: number
	error?: string
	repoRoot?: string
}

function parseWhenToUtcISO(whenStr: string): string {
	const parts = whenStr.trim().split(/\s+/)
	let dt: DateTime

	if (parts.length === 2 && parts[0] && parts[1]) {
		const zone = parts[1]
		if (!isValidTimezone(zone)) {
			throw new Error(`Invalid timezone '${zone}' in 'when': ${whenStr}`)
		}
		dt = parseDateTime(parts[0], zone)
	} else {
		const zone = getSystemTimezone()
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
	let dt = DateTime.fromISO(dateStr, { zone })
	if (dt.isValid) return dt

	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		dt = DateTime.fromISO(`${dateStr}T00:00:00`, { zone })
		if (dt.isValid) return dt
	}

	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr)) {
		dt = DateTime.fromISO(`${dateStr}:00`, { zone })
		if (dt.isValid) return dt
	}

	return DateTime.invalid('unparseable')
}

/**
 * Get the repository root for a ticket, resolving the repository field if specified
 */
async function getTicketRepoRoot(ticket: { repository?: string }, ticketsDir: string): Promise<string> {
	if (ticket.repository) {
		const expandedPath = path.resolve(ticket.repository.replace(/^~/, os.homedir()))

		if (!existsSync(expandedPath)) {
			throw new Error(`Repository path does not exist: ${expandedPath}`)
		}

		if (!(await isGitRepository(expandedPath))) {
			throw new Error(`Path is not a git repository: ${expandedPath}`)
		}

		return expandedPath
	}

	const gitRoot = await getGitRoot(ticketsDir)
	if (gitRoot) {
		return gitRoot
	}

	throw new Error(`Directory ${ticketsDir} is not in a git repository and ticket doesn't specify repository field`)
}

/**
 * Check the PR status for a ticket
 */
async function checkTicketPrStatus(
	ticket: { branch: string; base?: string },
	repoRoot: string,
	repoCfg: RepoConfig,
	globalCfg: GlobalConfig,
): Promise<{ status: TicketPrStatus; base: string }> {
	try {
		const result = await gh(repoRoot, ['pr', 'list', '--head', ticket.branch, '--state', 'open', '--json', 'number'])
		const prs = JSON.parse(result)
		if (prs.length > 0) {
			return { status: 'pr-exists', base: ticket.base || (await getDefaultBranch(repoRoot)) }
		}
	} catch {}

	const base = ticket.base || (await getDefaultBranch(repoRoot))
	const remote = repoCfg?.remote ?? globalCfg.remote ?? 'origin'

	try {
		const isMerged = await isBranchMerged(repoRoot, ticket.branch, base, remote)
		if (isMerged) {
			return { status: 'merged', base }
		}
	} catch {}

	try {
		const hasCommits = await hasUnmergedCommits(repoRoot, ticket.branch, base, remote)
		if (!hasCommits) {
			return { status: 'merged', base }
		}
	} catch {}

	return { status: 'ready', base }
}

async function loadTicketsFromDirectory(dir: string, baseDir: string, logger: Logger): Promise<LoadedTicket[]> {
	const tickets: LoadedTicket[] = []

	try {
		const entries = await fs.readdir(dir)
		const mdFiles = entries.filter((f) => f.toLowerCase().endsWith('.md'))

		for (const f of mdFiles) {
			const file = path.join(dir, f)
			const relativePath = path.relative(baseDir, file)

			try {
				const raw = await fs.readFile(file, 'utf8')
				const parsed = matter(raw)
				const fm = TicketFrontSchema.safeParse(parsed.data)

				if (!fm.success) {
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
						body: '',
						status: 'invalid',
						isDue: false,
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
						body: parsed.content.trim(),
						status: 'invalid',
						isDue: false,
						error: `Invalid 'when' format: ${error}`,
					})
					continue
				}

				const now = DateTime.utc()
				const dueDate = DateTime.fromISO(dueUtcISO)
				const isDue = dueDate <= now
				const daysUntilDue = Math.floor(dueDate.diff(now, 'days').days)

				const ticket: LoadedTicket = {
					file,
					relativePath,
					branch: fm.data.branch,
					title: fm.data.title,
					when: fm.data.when,
					body: parsed.content.trim(),
					dueUtcISO,
					status: isDue ? 'ready' : 'pending',
					isDue,
					daysUntilDue,
				}

				if (fm.data.base) ticket.base = fm.data.base
				if (fm.data.rebase) ticket.rebase = fm.data.rebase
				if (fm.data.pushMode) ticket.pushMode = fm.data.pushMode
				if (fm.data.labels) ticket.labels = fm.data.labels
				if (fm.data.reviewers) ticket.reviewers = fm.data.reviewers
				if (fm.data.assignees) ticket.assignees = fm.data.assignees
				if (fm.data.repository) ticket.repository = fm.data.repository
				if (fm.data.draft) ticket.draft = fm.data.draft
				if (fm.data.autoMerge) ticket.autoMerge = fm.data.autoMerge

				tickets.push(ticket)
			} catch (error) {
				tickets.push({
					file,
					relativePath,
					branch: '[error]',
					title: '[error]',
					when: '[error]',
					body: '',
					status: 'invalid',
					isDue: false,
					error: `Failed to read file: ${error}`,
				})
			}
		}
	} catch {
		logger.debug(`Could not read directory: ${dir}`)
	}

	return tickets
}

/**
 * Load all tickets from the specified directories, including PR status checks
 */
export async function loadAllTickets(
	dirs: string[],
	globalConfig: GlobalConfig,
	logger: Logger,
): Promise<LoadedTicket[]> {
	const cwd = process.cwd()
	const allTickets: LoadedTicket[] = []

	const expandedDirs = dirs.map((d) => expandPath(d))
	const scanPromises = expandedDirs.map((dir) => loadTicketsFromDirectory(dir, cwd, logger))
	const results = await Promise.all(scanPromises)

	for (const tickets of results) {
		allTickets.push(...tickets)
	}

	const repoConfigs = new Map<string, RepoConfig>()

	for (const ticket of allTickets) {
		if (ticket.status === 'invalid') continue

		const dir = path.dirname(ticket.file)
		try {
			const repoRoot = await getTicketRepoRoot(ticket, dir)
			ticket.repoRoot = repoRoot

			if (!repoConfigs.has(repoRoot)) {
				repoConfigs.set(repoRoot, await loadRepoConfig(repoRoot, logger))
			}
			const repoCfg = repoConfigs.get(repoRoot) ?? {}

			if (ticket.isDue) {
				const prStatus = await checkTicketPrStatus(ticket, repoRoot, repoCfg, globalConfig)
				ticket.base = prStatus.base

				if (prStatus.status === 'pr-exists') {
					ticket.status = 'pr-exists'
				} else if (prStatus.status === 'merged') {
					ticket.status = 'merged'
				}
			}
		} catch (error) {
			ticket.status = 'invalid'
			ticket.error = error instanceof Error ? error.message : String(error)
		}
	}

	return allTickets
}

/**
 * Load tickets for processing (used by run command)
 * Returns only tickets that are due and excludes invalid/pr-exists/merged tickets
 */
export async function loadTicketsForProcessing(
	dirs: string[],
	globalConfig: GlobalConfig,
	logger: Logger,
): Promise<LoadedTicket[]> {
	const allTickets = await loadAllTickets(dirs, globalConfig, logger)
	return allTickets.filter((t) => t.status === 'ready')
}
