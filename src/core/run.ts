// SPDX-License-Identifier: MIT

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
	pushBranch,
} from './gitgh.js'
import { loadTickets } from './md-tickets.js'
import type { PushMode, RepoConfig, RunOnceArgs, Ticket } from './types.js'

async function getRepoRoot(ticket: Ticket, ticketsDir: string): Promise<string> {
	// If ticket specifies a repository path, expand it and use it
	if (ticket.repository) {
		return path.resolve(ticket.repository.replace(/^~/, os.homedir()))
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

function isDue(ticket: Ticket, nowISO: string): boolean {
	return DateTime.fromISO(nowISO) >= DateTime.fromISO(ticket.dueUtcISO)
}

export async function runOnce(args: RunOnceArgs): Promise<number> {
	const globalCfg = await loadGlobalConfig(args.configPath)
	const dirs = (args.dirs && args.dirs.length > 0 ? args.dirs : globalCfg.dirs) ?? []
	if (dirs.length === 0) {
		console.log(red('No directories provided. Use --dir or set dirs[] in config.toml'))
		return 1
	}

	try {
		await ensureTools()
	} catch (e) {
		console.log(red(`Tools missing: ${e instanceof Error ? e.message : String(e)}`))
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
		const due = tickets.filter((t) => isDue(t, nowISO))

		if (due.length === 0) {
			console.log(yellow(`No due tickets in ${dir}`))
			continue
		}

		for (const t of due) {
			let repoRoot: string
			try {
				repoRoot = await getRepoRoot(t, dir)
			} catch (e) {
				console.log(red(`  ✗ ${e instanceof Error ? e.message : String(e)}`))
				fatal = true
				continue
			}

			// Load repo config if we haven't already
			if (!repoConfigs.has(repoRoot)) {
				repoConfigs.set(repoRoot, await loadRepoConfig(repoRoot))
			}
			const repoCfg = repoConfigs.get(repoRoot) ?? {}
			const repoName = path.basename(repoRoot)

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

			const pushMode: PushMode =
				t.pushMode ?? args.overrides?.pushMode ?? repoCfg?.pushMode ?? globalCfg.pushMode ?? 'force-with-lease'
			const remote = args.overrides?.remote ?? globalCfg.remote ?? 'origin'
			const repo = globalCfg.repo // optional owner/name

			if (args.mode === 'dry-run') {
				const displayBase = t.rebase ? ` → ${base}` : ''
				console.log(yellow(`[${repoName}] ${t.branch}${displayBase}`))
				console.log(yellow(`  "${t.title}"`))
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
				console.log(yellow(`[${repoName}] ${t.branch}`))
				console.log(yellow(`  ⊙ Open PR already exists, skipping`))
				continue
			}

			const displayBase = t.rebase ? ` → ${base}` : ''
			console.log(green(`[${repoName}] ${t.branch}${displayBase}`))

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
				console.log(green(`  ✓ ${url}`))
			} catch (e) {
				fatal = true // mark as fatal error
				console.log(red(`  ✗ ${e instanceof Error ? e.message : String(e)}`))
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
				console.log(
					yellow(
						`  ⚠ Could not restore branch in ${path.basename(repoRoot)}: ${e instanceof Error ? e.message : String(e)}`,
					),
				)
			}
		}
	}

	return fatal ? 1 : 0
}
