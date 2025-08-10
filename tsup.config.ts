import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/cli.ts'],
	format: ['esm'],
	dts: true,
	minify: true,
	clean: true,
	outExtension() {
		return {
			js: '.mjs',
		}
	},
	banner: {
		js: '#!/usr/bin/env node',
	},
})
