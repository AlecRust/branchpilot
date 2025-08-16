import path from 'node:path'
import ora from 'ora'
import { simpleGit } from 'simple-git'
import { loadGlobalConfig, loadRepoConfig } from '../utils/config.js'
import { ensureGit, getCurrentBranch, pushBranch } from '../utils/git.js'
import { createOrUpdatePr, ensureGh } from '../utils/github.js'
import { logger, setVerbose } from '../utils/logger.js'
import { withSpinner } from '../utils/spinner.js'
import { loadAllTickets } from '../utils/tickets.js'
import type { PushMode, RepoConfig, RunOnceArgs } from '../utils/types.js'

export async function run(args: RunOnceArgs): Promise<number> {
	setVerbose(args.verbose ?? false)
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
		logger.error(`Tools missing: ${e instanceof Error ? e.message : String(e)}`)
		return 1
	}

	let fatal = false

	const originalBranches = new Map<string, string>()
	const repoConfigs = new Map<string, RepoConfig>()

	const allTickets = await withSpinner(
		() => loadAllTickets(dirs, globalCfg, logger),
		'Loading tickets...',
		args.verbose ?? false,
	)
	const readyTickets = allTickets.filter((t) => t.status === 'ready')

	if (readyTickets.length === 0) {
		logger.debug('No tickets ready to process')
		const pendingTickets = allTickets.filter((t) => t.status === 'pending')
		if (pendingTickets.length > 0) {
			logger.debug(`${pendingTickets.length} tickets are scheduled for later`)
		}
	}

	const spinner = ora({ isEnabled: !args.verbose })
	let processedCount = 0

	for (const t of readyTickets) {
		const ticketName = path.basename(t.file)
		processedCount++
		spinner.start(`Processing ticket ${processedCount}/${readyTickets.length}: ${t.branch}`)

		if (!t.repoRoot) {
			spinner.stop()
			logger.error(`[${ticketName}] ${t.branch} - Repository root not set`)
			fatal = true
			continue
		}
		const repoRoot = path.resolve(t.repoRoot)

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
			spinner.text = `Pushing branch ${t.branch}...`
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

			spinner.text = `Creating PR for ${t.branch}...`
			const prOpts: Parameters<typeof createOrUpdatePr>[0] = {
				cwd: repoRoot,
				branch: t.branch,
				base: t.base || 'main',
			}
			if (t.title) prOpts.title = t.title
			if (t.body) prOpts.body = t.body
			if (t.labels) prOpts.labels = t.labels
			if (t.reviewers) prOpts.reviewers = t.reviewers
			if (t.assignees) prOpts.assignees = t.assignees
			if (repo) prOpts.repo = repo
			if (t.draft) prOpts.draft = t.draft
			if (t.autoMerge) prOpts.autoMerge = t.autoMerge
			const url = await createOrUpdatePr(prOpts)
			spinner.stop()
			logger.success(`[${ticketName}] ${t.branch} - ${url}`)
		} catch (e) {
			spinner.stop()
			fatal = true
			logger.error(`[${ticketName}] ${t.branch} - ${e instanceof Error ? e.message : String(e)}`)
		}
	}

	spinner.stop()

	for (const [repoRoot, originalBranch] of originalBranches) {
		try {
			await simpleGit(repoRoot).checkout(originalBranch)
		} catch (e) {
			logger.warn(
				`Could not restore branch in ${path.basename(repoRoot)}: ${e instanceof Error ? e.message : String(e)}`,
			)
		}
	}

	return fatal ? 1 : 0
}
