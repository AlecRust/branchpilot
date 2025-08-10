import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { green, red, yellow } from 'colorette'
import { DateTime } from 'luxon'
import { loadGlobalConfig, loadRepoConfig } from './config.js'
import {
	createOrUpdatePr,
	ensureTools,
	getCurrentBranch,
	getDefaultBranch,
	getGitRoot,
	gh,
	git,
	hasUnmergedCommits,
	isGitRepository,
	pushBranch,
} from './gitgh.js'
import { Logger } from './logger.js'
import { loadTickets } from './md-tickets.js'
import type { PushMode, RepoConfig, RunOnceArgs, Ticket } from './types.js'

async function getRepoRoot(ticket: Ticket, ticketsDir: string): Promise<string> {
	// If ticket specifies a repository path, expand it and use it
	if (ticket.repository) {
		const expandedPath = path.resolve(ticket.repository.replace(/^~/, os.homedir()))

		// Validate the repository path exists
		if (!existsSync(expandedPath)) {
			throw new Error(`Repository path does not exist: ${expandedPath}`)
		}

		// Validate it's a git repository
		if (!(await isGitRepository(expandedPath))) {
			throw new Error(`Path is not a git repository: ${expandedPath}`)
		}

		return expandedPath
	}
	// Otherwise, find the git repository root from the tickets directory
	const gitRoot = await getGitRoot(ticketsDir)
	if (gitRoot) {
		return gitRoot
	}
	// If not in a git repo, throw an error
	throw new Error(`Directory ${ticketsDir} is not in a git repository and ticket doesn't specify repository field`)
}

function nowUtcISO() {
	const isoString = DateTime.utc().toISO()
	if (isoString === null) {
		throw new Error('Failed to generate UTC ISO string')
	}
	return isoString
}

export async function runOnce(args: RunOnceArgs): Promise<number> {
	const globalCfg = await loadGlobalConfig(args.configPath)

	// Load local repo config to check for dirs setting
	const localRepoCfg = await loadRepoConfig(process.cwd())

	// Priority: CLI --dir flag > local repo config dirs > global config dirs > current directory
	let dirs = args.dirs
	if (!dirs || dirs.length === 0) {
		if (localRepoCfg?.dirs && localRepoCfg.dirs.length > 0) {
			dirs = localRepoCfg.dirs
		} else if (globalCfg.dirs && globalCfg.dirs.length > 0) {
			dirs = globalCfg.dirs
		} else {
			dirs = ['.']
		}
	}

	const logger = new Logger(args.verbose ?? false)

	try {
		await ensureTools()
	} catch (e) {
		logger.error(red(`Tools missing: ${e instanceof Error ? e.message : String(e)}`))
		return 1
	}

	const nowISO = nowUtcISO()
	let fatal = false

	// Track original branches for each repository we touch
	const originalBranches = new Map<string, string>()

	// Cache for repo configs
	const repoConfigs = new Map<string, RepoConfig>()

	for (const dir of dirs) {
		const timezone = globalCfg.timezone
		const tickets = await loadTickets(dir, timezone)

		if (tickets.length === 0) {
			logger.verbose(yellow(`No tickets found in ${dir}`))
			continue
		}

		// Process each ticket and show status
		for (const t of tickets) {
			const ticketName = path.basename(t.file)
			const dueDate = DateTime.fromISO(t.dueUtcISO)
			const now = DateTime.fromISO(nowISO)
			const isTicketDue = now >= dueDate

			if (!isTicketDue) {
				const relativeTime = dueDate.toRelative({ base: now })
				logger.verbose(yellow(`[${ticketName}] ${t.branch} - scheduled ${relativeTime}`))
				continue
			}

			// Ticket is due, process it
			let repoRoot: string
			try {
				repoRoot = await getRepoRoot(t, dir)
			} catch (e) {
				logger.error(red(`[${ticketName}] ✗ ${e instanceof Error ? e.message : String(e)}`))
				fatal = true
				continue
			}

			// Load repo config if we haven't already
			if (!repoConfigs.has(repoRoot)) {
				repoConfigs.set(repoRoot, await loadRepoConfig(repoRoot))
			}
			const repoCfg = repoConfigs.get(repoRoot) ?? {}

			// Capture the original branch for this repository if we haven't already
			if (!originalBranches.has(repoRoot) && args.mode === 'run') {
				const originalBranch = await getCurrentBranch(repoRoot)
				if (originalBranch) {
					originalBranches.set(repoRoot, originalBranch)
				}
			}

			// Get base branch - use ticket's base, or get the repo's default branch
			let base = t.base
			if (!base) {
				// Only get default branch if we need it (when ticket doesn't specify base)
				base = await getDefaultBranch(repoRoot)
			}

			// Configuration hierarchy: ticket > repo config > global config > defaults
			const pushMode: PushMode = t.pushMode ?? repoCfg?.pushMode ?? globalCfg.pushMode ?? 'force-with-lease'
			const remote = repoCfg?.remote ?? globalCfg.remote ?? 'origin'
			const repo = repoCfg?.repo ?? globalCfg.repo // optional owner/name

			if (args.mode === 'dry-run') {
				logger.always(yellow(`[${ticketName}] ${t.branch} - would process (dry run)`))
				continue
			}

			// Check if an open PR already exists
			let openPrExists = false
			try {
				const result = await gh(repoRoot, ['pr', 'list', '--head', t.branch, '--state', 'open', '--json', 'number'])
				const prs = JSON.parse(result)
				openPrExists = prs.length > 0
			} catch {
				// Error checking PRs, proceed
			}

			if (openPrExists) {
				logger.verbose(yellow(`[${ticketName}] ${t.branch} - PR already exists`))
				continue
			}

			// Check if branch has any unmerged commits
			let hasCommits = true
			try {
				hasCommits = await hasUnmergedCommits(repoRoot, t.branch, base, remote)
			} catch {
				// If we can't determine, assume there might be commits
				hasCommits = true
			}

			if (!hasCommits) {
				logger.verbose(yellow(`[${ticketName}] ${t.branch} - already merged into ${base}`))
				continue
			}

			try {
				const pushOpts: Parameters<typeof pushBranch>[0] = {
					cwd: repoRoot,
					branch: t.branch,
					remote,
					pushMode,
				}
				if (t.rebase && base) {
					pushOpts.base = base
					pushOpts.rebase = t.rebase
				}
				await pushBranch(pushOpts)
				const prOpts: Parameters<typeof createOrUpdatePr>[0] = {
					cwd: repoRoot,
					branch: t.branch,
					base,
					title: t.title,
					body: t.body,
				}
				if (t.labels) prOpts.labels = t.labels
				if (t.reviewers) prOpts.reviewers = t.reviewers
				if (t.assignees) prOpts.assignees = t.assignees
				if (repo) prOpts.repo = repo
				if (t.draft) prOpts.draft = t.draft
				const url = await createOrUpdatePr(prOpts)
				logger.always(green(`[${ticketName}] ${t.branch} - ✓ ${url}`))
			} catch (e) {
				fatal = true // mark as fatal error
				logger.error(red(`[${ticketName}] ${t.branch} - ✗ ${e instanceof Error ? e.message : String(e)}`))
				// leave ticket in place for retry after user fixes conflicts
			}
		}
	}

	// Restore original branches for all repositories we touched
	if (args.mode === 'run') {
		for (const [repoRoot, originalBranch] of originalBranches) {
			try {
				await git(repoRoot, ['checkout', originalBranch])
			} catch (e) {
				// Log warning but don't fail the entire operation
				logger.error(
					yellow(
						`  ⚠ Could not restore branch in ${path.basename(repoRoot)}: ${e instanceof Error ? e.message : String(e)}`,
					),
				)
			}
		}
	}

	return fatal ? 1 : 0
}
