export type PushMode = 'force-with-lease' | 'ff-only' | 'force'

type OnProcessed = 'delete' | 'archive' | 'keep'

export type GlobalConfig = {
	dirs?: string[]
	defaultBase?: string
	pushMode?: PushMode
	remote?: string
	repo?: string // optional explicit owner/name for gh
	deleteLocalBranch?: boolean
	onProcessed?: OnProcessed
	archiveDir?: string
}

export type RepoConfig = Partial<GlobalConfig>

export type RunOnceArgs = {
	dirs?: string[] // Override directories (from --dir flag)
	configPath?: string
	verbose?: boolean
}

export type TicketStatus = 'pending' | 'ready' | 'pr-exists' | 'merged' | 'invalid'

export interface LoadedTicket {
	file: string
	relativePath: string
	branch: string
	when: string
	title?: string
	body?: string

	timezone?: string
	base?: string
	rebase?: boolean
	pushMode?: PushMode
	labels?: string[]
	reviewers?: string[]
	assignees?: string[]
	repository?: string
	draft?: boolean
	autoMerge?: boolean
	deleteLocalBranch?: boolean
	onProcessed?: 'delete' | 'archive' | 'keep'
	archiveDir?: string

	status: TicketStatus
	dueUtcISO?: string
	isDue: boolean
	daysUntilDue?: number
	error?: string
	repoRoot?: string
}
