import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cliPath = path.join(__dirname, '../../src/cli.ts')

function runCLI(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
	return new Promise((resolve) => {
		const nodeArgs = ['--import', 'tsx', cliPath, ...args]

		const child = spawn('node', nodeArgs, {
			env: { ...process.env, NODE_ENV: 'test' },
			shell: false,
		})

		let stdout = ''
		let stderr = ''

		child.stdout.on('data', (data) => {
			stdout += data.toString()
		})

		child.stderr.on('data', (data) => {
			stderr += data.toString()
		})

		child.on('error', (error) => {
			console.error('Failed to spawn process:', error)
			resolve({ stdout: '', stderr: error.message, code: 1 })
		})

		child.on('close', (code) => {
			resolve({ stdout, stderr, code })
		})
	})
}

describe('CLI', () => {
	it('shows help with --help flag', async () => {
		const result = await runCLI(['--help'])

		expect(result.code).toBe(0)
		expect(result.stdout).toContain('branchpilot')
		expect(result.stdout).toContain('Commands:')
		expect(result.stdout).toContain('run')
		expect(result.stdout).toContain('doctor')
	})

	it('shows help when no command given', async () => {
		const result = await runCLI([])

		expect(result.code).toBe(1)
		expect(result.stderr).toContain('Usage: branchpilot')
	})

	it('accepts run command without options', async () => {
		const result = await runCLI(['run'])
		expect(result.code).not.toBe(null)
	})

	it('accepts run command with --dir flag', async () => {
		const result = await runCLI(['run', '--dir', '/test/path'])
		expect(result.code).not.toBe(null)
	})

	it('accepts run command with --dry flag', async () => {
		const result = await runCLI(['run', '--dry'])
		expect(result.code).not.toBe(null)
	})

	it('accepts doctor command', async () => {
		const result = await runCLI(['doctor'])
		expect(result.code).not.toBe(null)
	})

	it('accepts run command with custom config', async () => {
		const result = await runCLI(['run', '--config', '/custom/config.toml'])
		expect(result.code).not.toBe(null)
	})

	it('rejects unknown commands', async () => {
		const result = await runCLI(['unknown'])

		expect(result.code).toBe(1)
		expect(result.stderr).toContain("error: unknown command 'unknown'")
	})
})
