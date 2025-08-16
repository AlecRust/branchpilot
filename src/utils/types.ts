export type PushMode = 'force-with-lease' | 'ff-only' | 'force'

export type GlobalConfig = {
	dirs?: string[]
	defaultBase?: string
	pushMode?: PushMode
	remote?: string
	repo?: string // optional explicit owner/name for gh
}

export type RepoConfig = Partial<GlobalConfig>

export type Ticket = {
	file: string
	branch: string
	when: string
	dueUtcISO: string

	// optional overrides
	title?: string
	body?: string
	base?: string
	rebase?: boolean // whether to rebase onto base branch before creating PR
	pushMode?: PushMode
	labels?: string[]
	reviewers?: string[]
	assignees?: string[]
	repository?: string // optional local path to repository
	draft?: boolean // whether to open PR as a draft
	autoMerge?: boolean // whether to enable auto-merge on the PR
}

export type RunOnceArgs = {
	dirs?: string[] // Override directories (from --dir flag)
	configPath?: string
	verbose?: boolean
}
