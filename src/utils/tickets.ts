import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { differenceInDays, format, isValid, parse, parseISO } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import matter from 'gray-matter'
import { z } from 'zod'
import { loadRepoConfig } from './config.js'
import { getGitRoot, hasUnmergedCommits, isBranchMerged, isGitRepository } from './git.js'
import { getDefaultBranch, gh } from './github.js'
import type { logger } from './logger.js'
import { expandPath } from './paths.js'
import type { GlobalConfig, LoadedTicket, RepoConfig } from './types.js'

type Logger = typeof logger

const TicketFrontSchema = z.object({
	branch: z.string(),
	when: z.union([z.string(), z.date()]).transform((val) => {
		return val instanceof Date ? val.toISOString() : val
	}),
	title: z.string().optional(),
	timezone: z.string().optional(),
	base: z.string().optional(),
	rebase: z.boolean().optional(),
	pushMode: z.enum(['force-with-lease', 'ff-only', 'force']).optional(),
	labels: z.array(z.string()).optional(),
	reviewers: z.array(z.string()).optional(),
	assignees: z.array(z.string()).optional(),
	repository: z.string().optional(),
	draft: z.boolean().optional(),
	autoMerge: z.boolean().optional(),
	deleteLocalBranch: z.boolean().optional(),
	onProcessed: z.enum(['delete', 'archive', 'keep']).optional(),
	archiveDir: z.string().optional(),
})

/**
 * Parse a date string to UTC ISO format
 */
export function parseWhenToUtcISO(whenStr: string, timezone?: string): string {
	const trimmed = whenStr.trim()

	let date = parseISO(trimmed)
	if (isValid(date)) return date.toISOString()

	const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

	const formats = [
		'yyyy-MM-dd HH:mm:ss',
		'yyyy-MM-dd HH:mm',
		'yyyy-MM-dd',
		'MM/dd/yyyy HH:mm:ss',
		'MM/dd/yyyy HH:mm',
		'MM/dd/yyyy',
		'dd/MM/yyyy HH:mm:ss',
		'dd/MM/yyyy HH:mm',
		'dd/MM/yyyy',
		'd/M/yyyy',
		'M/d/yyyy',
	]

	for (const fmt of formats) {
		date = parse(trimmed, fmt, new Date())
		if (isValid(date)) {
			const isoLike = format(date, "yyyy-MM-dd'T'HH:mm:ss")
			return fromZonedTime(new Date(isoLike), tz).toISOString()
		}
	}

	throw new Error(`Invalid 'when': ${trimmed}`)
}

/**
 * Get the repository root for a ticket, resolving the repository field if specified
 */
async function getTicketRepoRoot(ticket: { repository?: string }, ticketsDir: string, logger: Logger): Promise<string> {
	if (ticket.repository) {
		const expandedPath = expandPath(ticket.repository)

		if (!existsSync(expandedPath)) {
			throw new Error(`Repository path does not exist: ${ticket.repository} (resolved to: ${expandedPath})`)
		}

		const resolvedPath = await fs.realpath(expandedPath)

		if (!(await isGitRepository(resolvedPath))) {
			throw new Error(`Path is not a git repository: ${ticket.repository} (resolved to: ${resolvedPath})`)
		}

		return resolvedPath
	}

	const gitRoot = await getGitRoot(ticketsDir)
	if (gitRoot) {
		logger.debug(`Using git root from ticket directory: ${gitRoot}`)
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
): Promise<{ status: 'pr-exists' | 'merged' | 'ready'; base: string }> {
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
				const hasFrontmatter = raw.trimStart().startsWith('---')
				if (!hasFrontmatter) {
					continue
				}
				const parsed = matter(raw)
				const data = parsed.data || {}
				if (!data.branch && !data.when) {
					continue
				}

				const fm = TicketFrontSchema.safeParse(parsed.data)

				if (!fm.success) {
					const missingFields: string[] = []
					if (!data.branch) missingFields.push('branch')
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
						when: data.when || '[missing]',
						...(data.title && { title: data.title }),
						status: 'invalid',
						isDue: false,
						error: errorMsg,
					})
					continue
				}

				let dueUtcISO: string
				try {
					dueUtcISO = parseWhenToUtcISO(fm.data.when, fm.data.timezone)
				} catch (error) {
					tickets.push({
						file,
						relativePath,
						branch: fm.data.branch,
						when: fm.data.when,
						...(fm.data.title && { title: fm.data.title }),
						...(parsed.content.trim() && { body: parsed.content.trim() }),
						status: 'invalid',
						isDue: false,
						error: `Invalid 'when' format: ${error}`,
					})
					continue
				}

				const now = new Date()
				const dueDate = parseISO(dueUtcISO)
				const isDue = dueDate <= now
				const daysUntilDue = Math.floor(differenceInDays(dueDate, now))

				const ticket: LoadedTicket = {
					file,
					relativePath,
					branch: fm.data.branch,
					when: fm.data.when,
					...(fm.data.title && { title: fm.data.title }),
					...(parsed.content.trim() && { body: parsed.content.trim() }),
					dueUtcISO,
					status: isDue ? 'ready' : 'pending',
					isDue,
					daysUntilDue,
				}

				if (fm.data.timezone) ticket.timezone = fm.data.timezone
				if (fm.data.base) ticket.base = fm.data.base
				if (fm.data.rebase) ticket.rebase = fm.data.rebase
				if (fm.data.pushMode) ticket.pushMode = fm.data.pushMode
				if (fm.data.labels) ticket.labels = fm.data.labels
				if (fm.data.reviewers) ticket.reviewers = fm.data.reviewers
				if (fm.data.assignees) ticket.assignees = fm.data.assignees
				if (fm.data.repository) ticket.repository = fm.data.repository
				if (fm.data.draft) ticket.draft = fm.data.draft
				if (fm.data.autoMerge) ticket.autoMerge = fm.data.autoMerge
				if (fm.data.deleteLocalBranch !== undefined) ticket.deleteLocalBranch = fm.data.deleteLocalBranch
				if (fm.data.onProcessed) ticket.onProcessed = fm.data.onProcessed
				if (fm.data.archiveDir) ticket.archiveDir = fm.data.archiveDir

				tickets.push(ticket)
			} catch (error) {
				tickets.push({
					file,
					relativePath,
					branch: '[error]',
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
			const repoRoot = await getTicketRepoRoot(ticket, dir, logger)
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

export async function deleteTicketFile(filePath: string): Promise<void> {
	await fs.unlink(filePath)
}

export async function archiveTicketFile(filePath: string, archiveDir: string): Promise<void> {
	await fs.mkdir(archiveDir, { recursive: true })

	const baseName = path.basename(filePath)
	const timestamp = Date.now()
	const ext = path.extname(baseName)
	const nameWithoutExt = path.basename(baseName, ext)
	const destPath = path.join(archiveDir, `${nameWithoutExt}-${timestamp}${ext}`)

	await fs.rename(filePath, destPath)
}

export function resolveArchiveDir(ticket: LoadedTicket, archiveDir: string): string {
	if (archiveDir.startsWith('~') || path.isAbsolute(archiveDir)) {
		return expandPath(archiveDir)
	}

	const ticketDir = path.dirname(ticket.file)
	return path.resolve(ticketDir, archiveDir)
}
