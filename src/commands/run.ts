import path from 'node:path'
import { green, red, yellow } from 'colorette'
import { simpleGit } from 'simple-git'
import { loadGlobalConfig, loadRepoConfig } from '../utils/config.js'
import { ensureGit, getCurrentBranch, pushBranch } from '../utils/git.js'
import { createOrUpdatePr, ensureGh } from '../utils/github.js'
import { Logger } from '../utils/logger.js'
import { loadAllTickets } from '../utils/tickets.js'
import type { PushMode, RepoConfig, RunOnceArgs } from '../utils/types.js'

export async function runOnce(args: RunOnceArgs): Promise<number> {
	const logger = new Logger(args.verbose ?? false)
	const globalCfg = await loadGlobalConfig(args.configPath, logger)

	const localRepoCfg = await loadRepoConfig(process.cwd(), logger)

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

	try {
		await ensureGit()
		await ensureGh()
	} catch (e) {
		logger.error(red(`Tools missing: ${e instanceof Error ? e.message : String(e)}`))
		return 1
	}

	let fatal = false

	const originalBranches = new Map<string, string>()
	const repoConfigs = new Map<string, RepoConfig>()

	const allTickets = await loadAllTickets(dirs, globalCfg, logger)
	const readyTickets = allTickets.filter((t) => t.status === 'ready')

	if (readyTickets.length === 0) {
		logger.verbose('No tickets ready to process')
		const pendingTickets = allTickets.filter((t) => t.status === 'pending')
		if (pendingTickets.length > 0) {
			logger.verbose(`${pendingTickets.length} tickets are scheduled for later`)
		}
	}

	for (const t of readyTickets) {
		const ticketName = path.basename(t.file)

		if (!t.repoRoot) {
			logger.error(red(`[${ticketName}] ${t.branch} - ✗ Repository root not set`))
			fatal = true
			continue
		}
		const repoRoot = t.repoRoot

		if (!repoConfigs.has(repoRoot)) {
			repoConfigs.set(repoRoot, await loadRepoConfig(repoRoot, logger))
		}
		const repoCfg = repoConfigs.get(repoRoot) ?? {}

		if (!originalBranches.has(repoRoot)) {
			const originalBranch = await getCurrentBranch(repoRoot)
			if (originalBranch) {
				originalBranches.set(repoRoot, originalBranch)
			}
		}

		const pushMode: PushMode = t.pushMode ?? repoCfg?.pushMode ?? globalCfg.pushMode ?? 'force-with-lease'
		const remote = repoCfg?.remote ?? globalCfg.remote ?? 'origin'
		const repo = repoCfg?.repo ?? globalCfg.repo // optional owner/name

		try {
			const pushOpts: Parameters<typeof pushBranch>[0] = {
				cwd: repoRoot,
				branch: t.branch,
				remote,
				pushMode,
			}
			if (t.rebase && t.base) {
				pushOpts.base = t.base
				pushOpts.rebase = t.rebase
			}
			await pushBranch(pushOpts)
			const prOpts: Parameters<typeof createOrUpdatePr>[0] = {
				cwd: repoRoot,
				branch: t.branch,
				base: t.base || 'main',
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
			fatal = true
			logger.error(red(`[${ticketName}] ${t.branch} - ✗ ${e instanceof Error ? e.message : String(e)}`))
		}
	}

	for (const [repoRoot, originalBranch] of originalBranches) {
		try {
			await simpleGit(repoRoot).checkout(originalBranch)
		} catch (e) {
			logger.error(
				yellow(
					`  ⚠ Could not restore branch in ${path.basename(repoRoot)}: ${e instanceof Error ? e.message : String(e)}`,
				),
			)
		}
	}

	return fatal ? 1 : 0
}
