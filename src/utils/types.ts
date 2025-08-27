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
