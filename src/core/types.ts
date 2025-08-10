export type PushMode = 'force-with-lease' | 'ff-only' | 'force'

export type GlobalConfig = {
	dirs?: string[]
	defaultBase?: string
	timezone?: string
	pushMode?: PushMode
	remote?: string
	repo?: string // optional explicit owner/name for gh
}

export type RepoConfig = Partial<GlobalConfig>

export type Ticket = {
	file: string
	branch: string
	title: string
	when: string // original string
	dueUtcISO: string // parsed UTC ISO
	body: string

	// optional overrides
	base?: string
	rebase?: boolean // whether to rebase onto base branch before creating PR
	pushMode?: PushMode
	labels?: string[]
	reviewers?: string[]
	assignees?: string[]
	repository?: string // optional local path to repository
	draft?: boolean // whether to open PR as a draft
}

export type RunMode = 'run' | 'dry-run'

export type RunOnceArgs = {
	mode: RunMode
	dirs?: string[] // directories containing markdown tickets; fallback to config.dirs
	configPath?: string
	overrides?: {
		base?: string
		pushMode?: PushMode
		remote?: string
	}
}
