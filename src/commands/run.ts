import path from 'node:path'
import ora from 'ora'
import { loadGlobalConfig, loadRepoConfig } from '../utils/config.js'
import { cleanupLocalBranch, ensureGit, pushBranch } from '../utils/git.js'
import { createOrUpdatePr, ensureGh } from '../utils/github.js'
import { logger, setVerbose } from '../utils/logger.js'
import { withSpinner } from '../utils/spinner.js'
import { archiveTicketFile, deleteTicketFile, loadAllTickets, resolveArchiveDir } from '../utils/tickets.js'
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

			// Clean up local branch if configured
			const shouldDeleteBranch =
				t.deleteLocalBranch ?? repoCfg.deleteLocalBranch ?? globalCfg.deleteLocalBranch ?? false

			if (shouldDeleteBranch) {
				try {
					const fallbackBranch = t.base ?? repoCfg.defaultBase ?? globalCfg.defaultBase ?? 'main'
					await cleanupLocalBranch({ cwd: repoRoot, branch: t.branch, fallbackBranch })
					logger.debug(`[${ticketName}] Deleted local branch ${t.branch}`)
				} catch (error) {
					logger.warn(
						`[${ticketName}] Failed to delete branch: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			}

			// Process ticket file if configured
			const onProcessed = t.onProcessed ?? repoCfg.onProcessed ?? globalCfg.onProcessed ?? 'keep'

			if (onProcessed !== 'keep') {
				try {
					if (onProcessed === 'delete') {
						await deleteTicketFile(t.file)
						logger.debug(`[${ticketName}] Deleted ticket file`)
					} else if (onProcessed === 'archive') {
						const archiveDirConfig = t.archiveDir ?? repoCfg.archiveDir ?? globalCfg.archiveDir ?? 'processed'
						const archiveDir = resolveArchiveDir(t, archiveDirConfig)
						await archiveTicketFile(t.file, archiveDir)
						logger.debug(`[${ticketName}] Archived ticket file`)
					}
				} catch (error) {
					logger.warn(
						`[${ticketName}] Failed to process ticket file: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			}

			spinner.stop()
			logger.success(`[${ticketName}] ${t.branch} - ${url}`)
		} catch (e) {
			spinner.stop()
			fatal = true
			logger.error(`[${ticketName}] ${t.branch} - ${e instanceof Error ? e.message : String(e)}`)
		}
	}

	spinner.stop()
	return fatal ? 1 : 0
}
