import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { beforeAll, describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cliPath = path.join(__dirname, '../../dist/cli.mjs')

beforeAll(async () => {
	if (!existsSync(cliPath)) {
		await execa('npm', ['run', 'build'], { cwd: path.join(__dirname, '../..') })
	}
})

function runCLI(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
	return new Promise((resolve) => {
		const child = spawn('node', [cliPath, ...args], {
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
		expect(result.stdout).toContain('list')
		expect(result.stdout).toContain('watch')
	})

	it('shows help when no command given', async () => {
		const result = await runCLI([])

		expect(result.code).toBe(1)
		expect(result.stderr).toContain('Usage: branchpilot')
	})

	it('run command with verbose shows debug output', async () => {
		const result = await runCLI(['run', '--dir', '/nonexistent/path', '--verbose'])
		expect(result.stdout).toContain('Could not read directory')
		expect(result.stdout).toContain('No tickets ready to process')
		expect(result.code).toBe(0)
	})

	it('run command exits with error on missing directory', async () => {
		const result = await runCLI(['run', '--dir', '/test/nonexistent'])
		expect(result.code).toBe(0)
	})

	it('doctor command checks for tools', async () => {
		const result = await runCLI(['doctor'])
		expect(result.stdout).toMatch(/git:|gh:/)
		expect(result.code).not.toBe(null)
	}, 10000)

	it('run command with invalid config shows error', async () => {
		const result = await runCLI(['run', '--config', '/nonexistent/config.toml'])
		expect(result.code).toBe(0)
	})

	it('rejects unknown commands', async () => {
		const result = await runCLI(['unknown'])

		expect(result.code).toBe(1)
		expect(result.stderr).toContain("error: unknown command 'unknown'")
	})

	it('watch command shows help', async () => {
		const result = await runCLI(['watch', '--help'])

		expect(result.code).toBe(0)
		expect(result.stdout).toContain('Start file watcher to process tickets immediately when due')
		expect(result.stdout).toContain('--dir')
		expect(result.stdout).toContain('--verbose')
	})

	describe('Aliases', () => {
		it('ls alias works for list command', async () => {
			const result = await runCLI(['ls', '--help'])
			expect(result.code).toBe(0)
			expect(result.stdout).toContain('List all tickets in configured directories')
		})

		it('process alias works for run command', async () => {
			const result = await runCLI(['process', '--help'])
			expect(result.code).toBe(0)
			expect(result.stdout).toContain('Process due tickets and create PRs')
		})

		it('check alias works for doctor command', async () => {
			const result = await runCLI(['check', '--help'])
			expect(result.code).toBe(0)
			expect(result.stdout).toContain('Check environment and tools')
		})

		it('status alias works for list command', async () => {
			const result = await runCLI(['status', '--help'])
			expect(result.code).toBe(0)
			expect(result.stdout).toContain('List all tickets in configured directories')
		})

		it('setup alias works for init command', async () => {
			const result = await runCLI(['setup', '--help'])
			expect(result.code).toBe(0)
			expect(result.stdout).toContain('Initialize branchpilot in the current directory')
		})
	})

	describe('npx execution', () => {
		it('works with npx for version command', async () => {
			const { stdout, exitCode } = await execa('npx', ['--yes', 'branchpilot', '--version'], {
				env: { ...process.env, NODE_ENV: 'test' },
			})
			expect(exitCode).toBe(0)
			expect(stdout).toMatch(/^\d+\.\d+\.\d+/)
		}, 20000)

		it('works with npx for list command', async () => {
			const tempDir = os.tmpdir()
			const { stdout, exitCode } = await execa('npx', ['--yes', 'branchpilot', 'list', '--dir', tempDir], {
				env: { ...process.env, NODE_ENV: 'test' },
			})
			expect(exitCode).toBe(0)
			expect(stdout).toContain('No tickets found')
		}, 20000)
	})
})
