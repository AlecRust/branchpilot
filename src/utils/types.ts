export type PushMode = 'force-with-lease' | 'ff-only' | 'force'

export type GlobalConfig = {
	dirs?: string[]
	defaultBase?: string
	pushMode?: PushMode
	remote?: string
	repo?: string // optional explicit owner/name for gh
}

export type RepoConfig = Partial<GlobalConfig>

export type RunOnceArgs = {
	dirs?: string[] // Override directories (from --dir flag)
	configPath?: string
	verbose?: boolean
}
