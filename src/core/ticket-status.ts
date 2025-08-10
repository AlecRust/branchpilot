import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getDefaultBranch, getGitRoot, gh, hasUnmergedCommits, isGitRepository } from './gitgh.js'
import type { GlobalConfig, RepoConfig, Ticket } from './types.js'

export type TicketPrStatus = 'pr-exists' | 'merged' | 'ready'

export interface TicketWithStatus extends Ticket {
	prStatus?: TicketPrStatus
	resolvedBase?: string
	repoRoot?: string
}

/**
 * Get the repository root for a ticket, resolving the repository field if specified
 */
export async function getTicketRepoRoot(ticket: { repository?: string }, ticketsDir: string): Promise<string> {
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

/**
 * Check the PR status for a ticket
 */
export async function checkTicketPrStatus(
	ticket: { branch: string; base?: string },
	repoRoot: string,
	repoCfg: RepoConfig,
	globalCfg: GlobalConfig,
): Promise<{ status: TicketPrStatus; base: string }> {
	// Check if an open PR already exists
	try {
		const result = await gh(repoRoot, ['pr', 'list', '--head', ticket.branch, '--state', 'open', '--json', 'number'])
		const prs = JSON.parse(result)
		if (prs.length > 0) {
			return { status: 'pr-exists', base: ticket.base || (await getDefaultBranch(repoRoot)) }
		}
	} catch {
		// Error checking PRs, continue
	}

	// Get base branch
	const base = ticket.base || (await getDefaultBranch(repoRoot))

	// Check if branch has any unmerged commits
	const remote = repoCfg?.remote ?? globalCfg.remote ?? 'origin'
	try {
		const hasCommits = await hasUnmergedCommits(repoRoot, ticket.branch, base, remote)
		if (!hasCommits) {
			return { status: 'merged', base }
		}
	} catch {
		// If we can't determine, assume it's ready
	}

	return { status: 'ready', base }
}
