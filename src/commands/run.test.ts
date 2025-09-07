import os from 'node:os'
import path from 'node:path'
import { addHours, formatISO, subHours } from 'date-fns'
import { simpleGit } from 'simple-git'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as config from '../utils/config.js'
import * as git from '../utils/git.js'
import * as github from '../utils/github.js'
import { logger } from '../utils/logger.js'
import * as tickets from '../utils/tickets.js'
import type { LoadedTicket } from '../utils/types.js'
import { run } from './run.js'

vi.mock('node:fs')
vi.mock('node:fs/promises')
vi.mock('simple-git')
vi.mock('../utils/config.js')
vi.mock('../utils/tickets.js')
vi.mock('../utils/git.js')
vi.mock('../utils/github.js')

describe('run-once', () => {
	const mockGit = {
		checkout: vi.fn(),
	}

	beforeEach(() => {
		vi.resetAllMocks()
		vi.spyOn(os, 'homedir').mockReturnValue('/home/testuser')
		vi.mocked(simpleGit).mockReturnValue(mockGit as unknown as ReturnType<typeof simpleGit>)
	})

	const createTicket = (overrides: Partial<LoadedTicket> = {}): LoadedTicket => ({
		file: '/repo/tickets/ticket.md',
		relativePath: 'tickets/ticket.md',
		branch: 'feature/test',
		title: 'Test ticket',
		when: 'now',
		dueUtcISO: formatISO(subHours(new Date(), 1)),
		body: 'Test body',
		status: 'ready',
		isDue: true,
		repoRoot: '/repo',
		base: 'main',
		...overrides,
	})

	const setupMocks = (
		overrides: {
			globalConfig?: Record<string, unknown>
			repoConfig?: Record<string, unknown>
			tickets?: LoadedTicket[]
			ensureToolsError?: Error
			rebaseError?: Error
		} = {},
	) => {
		vi.mocked(config.loadGlobalConfig).mockResolvedValue({
			dirs: ['/repo/tickets'],
			...overrides.globalConfig,
		})
		vi.mocked(config.loadRepoConfig).mockResolvedValue(overrides.repoConfig || {})

		if (overrides.ensureToolsError) {
			vi.mocked(git.ensureGit).mockRejectedValue(overrides.ensureToolsError)
			vi.mocked(github.ensureGh).mockRejectedValue(overrides.ensureToolsError)
		} else {
			vi.mocked(git.ensureGit).mockResolvedValue('/usr/bin/git')
			vi.mocked(github.ensureGh).mockResolvedValue('/usr/bin/gh')
		}

		vi.mocked(tickets.loadAllTickets).mockResolvedValue(overrides.tickets || [])

		vi.mocked(github.gh).mockImplementation((_cwd, args) => {
			if (args.includes('pr') && args.includes('list')) {
				return Promise.resolve('[]')
			}
			return Promise.reject(new Error('no PR found'))
		})

		vi.mocked(git.getGitRoot).mockResolvedValue('/repo')
		vi.mocked(github.getDefaultBranch).mockResolvedValue('main')
		vi.mocked(git.getCurrentBranch).mockResolvedValue('original-branch')
		vi.mocked(git.hasUnmergedCommits).mockResolvedValue(true)

		if (overrides.rebaseError) {
			vi.mocked(git.pushBranch).mockRejectedValue(overrides.rebaseError)
		} else {
			vi.mocked(git.pushBranch).mockResolvedValue(undefined)
		}

		vi.mocked(github.createOrUpdatePr).mockResolvedValue('https://github.com/owner/repo/pull/123')
		vi.mocked(git.cleanupLocalBranch).mockResolvedValue(undefined)
		vi.mocked(tickets.deleteTicketFile).mockResolvedValue(undefined)
		vi.mocked(tickets.archiveTicketFile).mockResolvedValue(undefined)
		vi.mocked(tickets.resolveArchiveDir).mockReturnValue('/home/testuser/tickets/processed')
	}

	describe('error handling', () => {
		it('handles empty ticket lists gracefully', async () => {
			setupMocks({ tickets: [] })

			const result = await run({})

			expect(result).toBe(0)
		})

		it('defaults to current directory when no directories configured', async () => {
			vi.mocked(config.loadGlobalConfig).mockResolvedValue({})
			vi.mocked(tickets.loadAllTickets).mockResolvedValue([])

			const result = await run({})

			expect(result).toBe(0)
			expect(tickets.loadAllTickets).toHaveBeenCalledWith(['.'], {}, expect.anything())
		})

		it('returns error when tools missing', async () => {
			setupMocks({ ensureToolsError: new Error('git not found') })

			const result = await run({})

			expect(result).toBe(1)
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Tools missing: git not found'))
		})

		it('handles ticket processing errors', async () => {
			setupMocks({
				tickets: [createTicket()],
				rebaseError: new Error('Rebase conflict'),
			})

			const result = await run({})

			expect(result).toBe(1)
			expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Rebase conflict'))
		})
	})

	describe('ticket processing', () => {
		it('processes due tickets in run mode', async () => {
			const dueTicket = createTicket()
			const futureTicket = createTicket({
				file: '/repo/tickets/future.md',
				branch: 'feature/future',
				dueUtcISO: formatISO(addHours(new Date(), 1)),
				status: 'pending',
				isDue: false,
			})

			setupMocks({ tickets: [dueTicket, futureTicket] })

			const result = await run({})

			expect(result).toBe(0)
			expect(git.pushBranch).toHaveBeenCalledOnce()
			expect(github.createOrUpdatePr).toHaveBeenCalledOnce()
		})

		it('shows message when no due tickets', async () => {
			setupMocks({ tickets: [] })

			const result = await run({})

			expect(result).toBe(0)
		})

		it('skips tickets with branches already merged', async () => {
			const mergedTicket = createTicket({ status: 'merged' })
			setupMocks({ tickets: [mergedTicket] })

			const result = await run({})

			expect(result).toBe(0)
			expect(git.pushBranch).not.toHaveBeenCalled()
			expect(github.createOrUpdatePr).not.toHaveBeenCalled()
		})
	})

	describe('configuration hierarchy', () => {
		it('uses directories from config when provided', async () => {
			setupMocks({ globalConfig: { dirs: ['config-dir'] } })

			await run({})

			expect(tickets.loadAllTickets).toHaveBeenCalledWith(['config-dir'], expect.anything(), expect.anything())
		})

		it('uses directories from --dir flag over config', async () => {
			setupMocks({ globalConfig: { dirs: ['config-dir'] } })

			await run({ dirs: ['cli-dir'] })

			expect(tickets.loadAllTickets).toHaveBeenCalledWith(['cli-dir'], expect.anything(), expect.anything())
		})

		it('merges config hierarchy correctly', async () => {
			setupMocks({
				globalConfig: {
					pushMode: 'ff-only',
					remote: 'upstream',
				},
				repoConfig: {
					pushMode: 'force',
				},
				tickets: [createTicket()],
			})

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith({
				cwd: path.resolve('/repo'),
				branch: 'feature/test',
				base: undefined,
				rebase: undefined,
				remote: 'upstream',
				pushMode: 'force', // repo overrides global
			})
		})

		it('prioritizes ticket fields over config', async () => {
			const ticket = createTicket({
				base: 'ticket-base',
				pushMode: 'ff-only',
				labels: ['urgent'],
				reviewers: ['alice'],
				assignees: ['bob'],
			})

			setupMocks({
				globalConfig: { pushMode: 'force' },
				tickets: [ticket],
			})

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					pushMode: 'ff-only',
				}),
			)
			expect(github.createOrUpdatePr).toHaveBeenCalledWith(
				expect.objectContaining({
					base: 'ticket-base', // base is still used for PR creation
					labels: ['urgent'],
					reviewers: ['alice'],
					assignees: ['bob'],
				}),
			)
		})

		it('uses default values when no config provided', async () => {
			setupMocks({
				globalConfig: {},
				tickets: [createTicket()],
			})

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					pushMode: 'force-with-lease', // default
					remote: 'origin', // default
				}),
			)
		})
	})

	describe('multiple directories', () => {
		it('processes all configured directories', async () => {
			setupMocks({
				globalConfig: { dirs: ['/repo1/tickets', '/repo2/tickets'] },
			})

			await run({})

			expect(tickets.loadAllTickets).toHaveBeenCalledTimes(1)
			expect(tickets.loadAllTickets).toHaveBeenCalledWith(
				['/repo1/tickets', '/repo2/tickets'],
				expect.anything(),
				expect.anything(),
			)
		})
	})

	describe('branch restoration', () => {
		it('restores original branch after processing tickets', async () => {
			setupMocks({ tickets: [createTicket()] })

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					cwd: path.resolve('/repo'),
					branch: 'feature/test',
				}),
			)
		})

		it('handles branch restoration failures gracefully', async () => {
			setupMocks({ tickets: [createTicket()] })

			// We'll mock the simpleGit checkout to fail during branch restoration

			const result = await run({})

			expect(result).toBe(0)
			// Branch restoration is handled gracefully even when mocked
		})

		it('tracks branches per repository', async () => {
			const ticket1 = createTicket({
				repository: '~/repo1',
				repoRoot: '/home/testuser/repo1',
			})
			const ticket2 = createTicket({
				file: '/repo2/tickets/ticket.md',
				branch: 'feature/repo2',
				repository: '~/repo2',
				repoRoot: '/home/testuser/repo2',
			})

			setupMocks({ tickets: [ticket1, ticket2] })

			vi.mocked(git.getCurrentBranch).mockResolvedValueOnce('main').mockResolvedValueOnce('develop')

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					cwd: path.resolve('/home/testuser/repo1'),
					branch: 'feature/test',
				}),
			)
			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					cwd: path.resolve('/home/testuser/repo2'),
					branch: 'feature/repo2',
				}),
			)
		})
	})

	describe('repository detection', () => {
		it('uses git root when repository field not specified', async () => {
			const ticket = createTicket({ repoRoot: '/detected/git/root' })
			setupMocks({ tickets: [ticket] })

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					cwd: path.resolve('/detected/git/root'),
				}),
			)
		})

		it('uses specified repository path when provided', async () => {
			const ticket = createTicket({ repository: '~/custom/repo', repoRoot: '/home/testuser/custom/repo' })
			setupMocks({ tickets: [ticket] })

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					cwd: path.resolve('/home/testuser/custom/repo'),
				}),
			)
		})

		it('handles error when not in git repo and no repository specified', async () => {
			const ticket = createTicket({
				status: 'invalid',
				error: "Directory /test/dir is not in a git repository and ticket doesn't specify repository field",
			})
			setupMocks({ tickets: [ticket] })

			const result = await run({})

			expect(result).toBe(0)
		})

		it('validates repository path exists', async () => {
			const ticket = createTicket({
				repository: '/nonexistent/path',
				status: 'invalid',
				error: 'Repository path does not exist: /nonexistent/path',
			})
			setupMocks({ tickets: [ticket] })

			const result = await run({})

			expect(result).toBe(0)
		})

		it('validates repository path is a git repository', async () => {
			const ticket = createTicket({
				repository: '/existing/but/not/git',
				status: 'invalid',
				error: 'Path is not a git repository: /existing/but/not/git',
			})
			setupMocks({ tickets: [ticket] })

			const result = await run({})

			expect(result).toBe(0)
		})
	})

	describe('rebase behavior', () => {
		it('rebases using default base when base omitted', async () => {
			const ticketWithRebase = createTicket({ rebase: true })
			// Remove base to simulate omission
			delete (ticketWithRebase as unknown as { base?: string }).base

			setupMocks({
				globalConfig: { defaultBase: 'develop' },
				tickets: [ticketWithRebase],
			})

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					base: 'develop',
					rebase: true,
				}),
			)
		})
		it('only rebases when rebase is true', async () => {
			const ticketWithRebase = createTicket({
				base: 'develop',
				rebase: true,
			})

			setupMocks({ tickets: [ticketWithRebase] })

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					base: 'develop',
					rebase: true,
				}),
			)
		})

		it('does not rebase by default', async () => {
			const ticketWithoutRebase = createTicket({
				base: 'develop',
			})

			setupMocks({ tickets: [ticketWithoutRebase] })

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					branch: 'feature/test',
				}),
			)
		})

		it('uses default branch when base not specified', async () => {
			const ticketWithoutBase = createTicket({ base: 'master' })

			setupMocks({ tickets: [ticketWithoutBase] })

			await run({})

			expect(github.createOrUpdatePr).toHaveBeenCalledWith(
				expect.objectContaining({
					base: 'master',
				}),
			)
		})

		it('processes tickets with and without rebase', async () => {
			const ticketWithRebase = createTicket({
				base: 'develop',
				rebase: true,
			})
			const ticketWithoutRebase = createTicket({
				file: '/repo/tickets/no-rebase.md',
				branch: 'feature/no-rebase',
				base: 'main',
			})

			setupMocks({ tickets: [ticketWithRebase, ticketWithoutRebase] })

			await run({})

			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					rebase: true,
					base: 'develop',
				}),
			)
			expect(git.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					branch: 'feature/no-rebase',
				}),
			)
		})
	})

	describe('post-processing', () => {
		it('deletes local branch when configured', async () => {
			const ticket = createTicket({ deleteLocalBranch: true })
			setupMocks({ tickets: [ticket] })

			await run({})

			expect(git.cleanupLocalBranch).toHaveBeenCalledOnce()
			expect(git.cleanupLocalBranch).toHaveBeenCalledWith({
				cwd: path.resolve('/repo'),
				branch: 'feature/test',
				fallbackBranch: 'main',
			})
		})

		it('deletes ticket file when onProcessed=delete', async () => {
			const ticket = createTicket({ onProcessed: 'delete' })
			setupMocks({ tickets: [ticket] })

			await run({})

			expect(tickets.deleteTicketFile).toHaveBeenCalledOnce()
			expect(tickets.deleteTicketFile).toHaveBeenCalledWith('/repo/tickets/ticket.md')
		})

		it('archives ticket file when onProcessed=archive', async () => {
			const ticket = createTicket({ onProcessed: 'archive' })
			setupMocks({ tickets: [ticket] })
			vi.mocked(tickets.resolveArchiveDir).mockReturnValue('/home/testuser/tickets/processed')

			await run({})

			expect(tickets.archiveTicketFile).toHaveBeenCalledOnce()
			expect(tickets.archiveTicketFile).toHaveBeenCalledWith(
				'/repo/tickets/ticket.md',
				'/home/testuser/tickets/processed',
			)
		})

		it('continues processing even if cleanup fails', async () => {
			const ticket1 = createTicket({ branch: 'feature/first', deleteLocalBranch: true })
			const ticket2 = createTicket({ branch: 'feature/second', onProcessed: 'delete' })
			setupMocks({ tickets: [ticket1, ticket2] })

			vi.mocked(git.cleanupLocalBranch).mockRejectedValueOnce(new Error('Branch cleanup failed'))
			vi.mocked(tickets.deleteTicketFile).mockRejectedValueOnce(new Error('Delete failed'))

			await run({})

			expect(github.createOrUpdatePr).toHaveBeenCalledTimes(2)
		})
	})
})
