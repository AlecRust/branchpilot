import type { KnipConfig } from 'knip'

const config: KnipConfig = {
	ignoreDependencies: [
		// Used by release process
		'@release-it/bumper',
		'git-cliff',
	],
	ignoreBinaries: [
		// Used for GitHub operations
		'gh',
	],
}

export default config
