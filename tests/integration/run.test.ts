import os from 'node:os'
import { DateTime } from 'luxon'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as config from '../../src/core/config.js'
import * as gitgh from '../../src/core/gitgh.js'
import * as mdTickets from '../../src/core/md-tickets.js'
import { runOnce } from '../../src/core/run.js'
import type { Ticket } from '../../src/core/types.js'

vi.mock('node:fs/promises')
vi.mock('../../src/core/config.js')
vi.mock('../../src/core/md-tickets.js')
vi.mock('../../src/core/gitgh.js')

describe('run-once', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.spyOn(console, 'log').mockImplementation(() => {})
		vi.spyOn(os, 'homedir').mockReturnValue('/home/testuser')
	})

	const createTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
		file: '/repo/tickets/ticket.md',
		branch: 'feature/test',
		title: 'Test ticket',
		when: 'now',
		dueUtcISO: DateTime.utc().minus({ hours: 1 }).toISO() || '',
		body: 'Test body',
		...overrides,
	})

	const setupMocks = (
		overrides: {
			globalConfig?: Record<string, unknown>
			repoConfig?: Record<string, unknown>
			tickets?: Ticket[]
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
			vi.mocked(gitgh.ensureTools).mockRejectedValue(overrides.ensureToolsError)
		} else {
			vi.mocked(gitgh.ensureTools).mockResolvedValue({ git: '/usr/bin/git', gh: '/usr/bin/gh' })
		}

		vi.mocked(mdTickets.loadTickets).mockResolvedValue(overrides.tickets || [])

		// Mock gh to simulate no existing PR by default
		vi.mocked(gitgh.gh).mockImplementation((_cwd, args) => {
			// Mock pr list to return empty array (no open PRs)
			if (args.includes('pr') && args.includes('list')) {
				return Promise.resolve('[]')
			}
			// Other gh commands fail by default
			return Promise.reject(new Error('no PR found'))
		})

		// Mock getGitRoot to return the repo directory
		vi.mocked(gitgh.getGitRoot).mockResolvedValue('/repo')

		// Mock getDefaultBranch
		vi.mocked(gitgh.getDefaultBranch).mockResolvedValue('main')

		// Mock getCurrentBranch to return the original branch
		vi.mocked(gitgh.getCurrentBranch).mockResolvedValue('original-branch')

		// Mock git for branch restoration
		vi.mocked(gitgh.git).mockResolvedValue('')

		if (overrides.rebaseError) {
			vi.mocked(gitgh.pushBranch).mockRejectedValue(overrides.rebaseError)
		} else {
			vi.mocked(gitgh.pushBranch).mockResolvedValue(undefined)
		}

		vi.mocked(gitgh.createOrUpdatePr).mockResolvedValue('https://github.com/owner/repo/pull/123')
	}

	describe('error handling', () => {
		it('handles DateTime.toISO() returning null', async () => {
			const originalUtc = DateTime.utc
			vi.spyOn(DateTime, 'utc').mockImplementationOnce(
				() =>
					({
						toISO: () => null,
					}) as unknown as DateTime,
			)

			setupMocks()
			await expect(runOnce({ mode: 'run' })).rejects.toThrow('Failed to generate UTC ISO string')

			DateTime.utc = originalUtc
		})

		it('returns error when no directories provided', async () => {
			vi.mocked(config.loadGlobalConfig).mockResolvedValue({})

			const result = await runOnce({ mode: 'run' })

			expect(result).toBe(1)
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No directories provided'))
		})

		it('returns error when tools missing', async () => {
			setupMocks({ ensureToolsError: new Error('git not found') })

			const result = await runOnce({ mode: 'run' })

			expect(result).toBe(1)
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Tools missing: git not found'))
		})

		it('handles ticket processing errors', async () => {
			setupMocks({
				tickets: [createTicket()],
				rebaseError: new Error('Rebase conflict'),
			})

			const result = await runOnce({ mode: 'run' })

			expect(result).toBe(1)
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✗'))
		})
	})

	describe('ticket processing', () => {
		it('processes due tickets in run mode', async () => {
			const dueTicket = createTicket()
			const futureTicket = createTicket({
				file: '/repo/tickets/future.md',
				branch: 'feature/future',
				dueUtcISO: DateTime.utc().plus({ hours: 1 }).toISO() || '',
			})

			setupMocks({ tickets: [dueTicket, futureTicket] })

			const result = await runOnce({ mode: 'run' })

			expect(result).toBe(0)
			expect(gitgh.pushBranch).toHaveBeenCalledOnce()
			expect(gitgh.createOrUpdatePr).toHaveBeenCalledOnce()
		})

		it('performs dry-run without making changes', async () => {
			setupMocks({ tickets: [createTicket({ base: 'develop', pushMode: 'force' })] })

			const result = await runOnce({ mode: 'dry-run' })

			expect(result).toBe(0)
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[repo] feature/test'))
			expect(gitgh.pushBranch).not.toHaveBeenCalled()
			expect(gitgh.createOrUpdatePr).not.toHaveBeenCalled()
		})

		it('shows message when no due tickets', async () => {
			setupMocks({ tickets: [] })

			const result = await runOnce({ mode: 'run' })

			expect(result).toBe(0)
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No due tickets'))
		})
	})

	describe('configuration hierarchy', () => {
		it('uses directories from arguments over config', async () => {
			setupMocks({ globalConfig: { dirs: ['config-dir'] } })

			await runOnce({ mode: 'run', dirs: ['arg-dir'] })

			expect(mdTickets.loadTickets).toHaveBeenCalledWith('arg-dir', undefined)
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

			await runOnce({ mode: 'run' })

			expect(gitgh.pushBranch).toHaveBeenCalledWith({
				cwd: '/repo',
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

			await runOnce({ mode: 'run' })

			expect(gitgh.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					pushMode: 'ff-only',
				}),
			)
			expect(gitgh.createOrUpdatePr).toHaveBeenCalledWith(
				expect.objectContaining({
					base: 'ticket-base', // base is still used for PR creation
					labels: ['urgent'],
					reviewers: ['alice'],
					assignees: ['bob'],
				}),
			)
		})

		it('applies CLI overrides above all', async () => {
			setupMocks({
				globalConfig: { pushMode: 'force-with-lease' },
				tickets: [createTicket()],
			})

			await runOnce({
				mode: 'run',
				overrides: {
					base: 'cli-base',
					pushMode: 'force',
					remote: 'cli-remote',
				},
			})

			expect(gitgh.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					pushMode: 'force',
					remote: 'cli-remote',
				}),
			)
		})
	})

	describe('multiple directories', () => {
		it('processes all configured directories', async () => {
			setupMocks({
				globalConfig: { dirs: ['/repo1/tickets', '/repo2/tickets'] },
			})

			await runOnce({ mode: 'run' })

			expect(mdTickets.loadTickets).toHaveBeenCalledTimes(2)
			expect(mdTickets.loadTickets).toHaveBeenCalledWith('/repo1/tickets', undefined)
			expect(mdTickets.loadTickets).toHaveBeenCalledWith('/repo2/tickets', undefined)
		})
	})

	describe('timezone handling', () => {
		it('passes timezone to ticket loader', async () => {
			setupMocks({
				globalConfig: { timezone: 'America/New_York' },
			})

			await runOnce({ mode: 'run' })

			expect(mdTickets.loadTickets).toHaveBeenCalledWith('/repo/tickets', 'America/New_York')
		})
	})

	describe('branch restoration', () => {
		it('restores original branch after processing tickets', async () => {
			setupMocks({ tickets: [createTicket()] })

			await runOnce({ mode: 'run' })

			// Verify original branch was captured
			expect(gitgh.getCurrentBranch).toHaveBeenCalledWith('/repo')

			// Verify branch was restored
			expect(gitgh.git).toHaveBeenCalledWith('/repo', ['checkout', 'original-branch'])
		})

		it('does not restore branch in dry-run mode', async () => {
			setupMocks({ tickets: [createTicket()] })

			await runOnce({ mode: 'dry-run' })

			// Should not capture or restore branch in dry-run
			expect(gitgh.getCurrentBranch).not.toHaveBeenCalled()
			expect(gitgh.git).not.toHaveBeenCalled()
		})

		it('handles branch restoration failures gracefully', async () => {
			setupMocks({ tickets: [createTicket()] })

			// Make branch restoration fail
			vi.mocked(gitgh.git).mockRejectedValueOnce(new Error('Cannot checkout'))

			const result = await runOnce({ mode: 'run' })

			// Should not fail the entire operation
			expect(result).toBe(0)
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('⚠ Could not restore branch'))
		})

		it('tracks branches per repository', async () => {
			const ticket1 = createTicket({ repository: '~/repo1' })
			const ticket2 = createTicket({
				file: '/repo2/tickets/ticket.md',
				branch: 'feature/repo2',
				repository: '~/repo2',
			})

			setupMocks({ tickets: [ticket1, ticket2] })

			// Mock different original branches for each repo
			vi.mocked(gitgh.getCurrentBranch).mockResolvedValueOnce('main').mockResolvedValueOnce('develop')

			await runOnce({ mode: 'run' })

			// Should capture branch for each unique repository
			expect(gitgh.getCurrentBranch).toHaveBeenCalledTimes(2)

			// Should restore both branches
			const gitCalls = vi.mocked(gitgh.git).mock.calls
			expect(gitCalls).toContainEqual([expect.stringContaining('repo1'), ['checkout', 'main']])
			expect(gitCalls).toContainEqual([expect.stringContaining('repo2'), ['checkout', 'develop']])
		})
	})

	describe('repository detection', () => {
		it('uses git root when repository field not specified', async () => {
			const ticket = createTicket({ repository: undefined })
			setupMocks({ tickets: [ticket] })

			// Mock getGitRoot to return a specific path
			vi.mocked(gitgh.getGitRoot).mockResolvedValue('/detected/git/root')

			await runOnce({ mode: 'run' })

			// Should use the detected git root
			expect(gitgh.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					cwd: '/detected/git/root',
				}),
			)
		})

		it('uses specified repository path when provided', async () => {
			const ticket = createTicket({ repository: '~/custom/repo' })
			setupMocks({ tickets: [ticket] })

			await runOnce({ mode: 'run' })

			// Should use the specified repository
			expect(gitgh.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					cwd: expect.stringContaining('custom'),
				}),
			)
			expect(gitgh.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					cwd: expect.stringContaining('repo'),
				}),
			)
		})

		it('handles error when not in git repo and no repository specified', async () => {
			const ticket = createTicket({ repository: undefined })
			setupMocks({ tickets: [ticket] })

			// Mock getGitRoot to return null (not in a git repo)
			vi.mocked(gitgh.getGitRoot).mockResolvedValue(null)

			const result = await runOnce({ mode: 'run' })

			expect(result).toBe(1) // Should return error
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('not in a git repository'))
		})
	})

	describe('rebase behavior', () => {
		it('only rebases when rebase is true', async () => {
			const ticketWithRebase = createTicket({
				base: 'develop',
				rebase: true,
			})

			setupMocks({ tickets: [ticketWithRebase] })

			await runOnce({ mode: 'run' })

			expect(gitgh.pushBranch).toHaveBeenCalledWith(
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

			await runOnce({ mode: 'run' })

			expect(gitgh.pushBranch).toHaveBeenCalledWith(
				expect.objectContaining({
					branch: 'feature/test',
				}),
			)
		})

		it('uses default branch when base not specified', async () => {
			const ticketWithoutBase = createTicket()

			setupMocks({ tickets: [ticketWithoutBase] })
			vi.mocked(gitgh.getDefaultBranch).mockResolvedValue('master')

			await runOnce({ mode: 'run' })

			expect(gitgh.getDefaultBranch).toHaveBeenCalledWith('/repo')
			expect(gitgh.createOrUpdatePr).toHaveBeenCalledWith(
				expect.objectContaining({
					base: 'master',
				}),
			)
		})

		it('displays rebase arrow only when rebasing in dry-run', async () => {
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

			await runOnce({ mode: 'dry-run' })

			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[repo] feature/test → develop'))
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[repo] feature/no-rebase'))
			expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('[repo] feature/no-rebase → main'))
		})
	})
})
