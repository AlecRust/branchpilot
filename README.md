# branchpilot [![CI](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml) [![CodeQL](https://github.com/AlecRust/branchpilot/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/AlecRust/branchpilot/actions/workflows/github-code-scanning/codeql) [![npm Version](https://img.shields.io/npm/v/branchpilot)](https://www.npmjs.com/package/branchpilot)

> PRs on autopilot, powered by Markdown

`branchpilot` is a CLI tool for scheduling Pull Requests from local Git branches.

## Install

Ensure [git](https://git-scm.com/) and [gh](https://cli.github.com/) are configured in your terminal e.g. `gh auth status`
then run:

```bash
npm install -g branchpilot
```

## Usage

1. **Create** a branch in a local repository containing changes you want to schedule
2. **Prepare** a Markdown file that includes PR configuration and a `when` timestamp
3. **Execute** `branchpilot watch` to open the branches as PRs when they are due

### 1. Create

Simply create a branch in any local Git repository with changes you want to schedule.

### 2. Prepare

Create a Markdown file with any filename containing [front matter](https://gohugo.io/content-management/front-matter/) config at the top followed by your PR description.

The file can be placed anywhere. If you place it in a Git repository you can omit the `repository` field.

e.g. `~/projects/my-project/tickets/fix-typo.md` or `~/tickets/fix-typo.md`

```markdown
---
title: Fix typo in README
when: 2025-01-15T09:00
branch: fix-typo
repository: ~/projects/my-project  # Optional, defaults to current repository
---

Fixed a typo in the installation instructions.
```

### 3. Execute

Use the `run` command to process all tickets once on demand:

```bash
branchpilot run
```

Use the `watch` command for continuous monitoring:

```bash
branchpilot watch
```

A PR will be opened during execution if the `when` timestamp is reached.

Configure the tickets directories to scan using config files or flags as documented.

## Daemon

To run the process in the background, use a process manager like [PM2](https://pm2.keymetrics.io/):

```bash
pm2 start branchpilot -- watch --verbose
```

A built-in daemon mode may be added in the future, but PM2 or similar should work well.

## Ticket configuration

These are all the PR configuration options you have in ticket Markdown files.

```yaml
when: 2025-01-15 09:00       # (required) When to open the PR (various formats supported)
branch: fix-typo             # (required) Branch name to create PR from
title: Example PR title      # Title of the PR
timezone: America/New_York   # Timezone used when 'when' has no offset (defaults to system)
repository: ~/projects/repo  # Path to target repo for PRs (defaults to current repo)
base: develop                # Base branch (auto-detected if omitted)
rebase: true                 # Rebase against base branch before pushing
draft: true                  # Create PR as draft
autoMerge: true              # Enable auto-merge on PR
labels: ["bug", "urgent"]    # Set labels
reviewers: ["alice"]         # Set reviewers
assignees: ["bob"]           # Set assignees
deleteLocalBranch: true      # Delete the local branch after PR creation
onProcessed: archive         # What to do with the ticket file: keep | delete | archive
archiveDir: processed        # Archive directory (relative to ticket file or absolute, defaults to "processed")
```

## `branchpilot` configuration

Global config at `~/.config/branchpilot.toml`:

```toml
dirs = ["~/tickets"]         # Directories to scan
defaultBase = "main"         # Default base branch
deleteLocalBranch = true      # Delete local branches after PR creation
onProcessed = "archive"       # keep | delete | archive
archiveDir = "processed"      # Default archive dir for ticket files
```

Repository config e.g. `~/projects/my-project/.branchpilot.toml`:

```toml
defaultBase = "develop"      # Override global settings
deleteLocalBranch = true
onProcessed = "archive"
archiveDir = "processed"
```

## Commands

### `branchpilot run`

Process tickets in configured directories and create any due PRs.

- `--dir <path>` — Scan specific directories
- `--verbose` — Show detailed output

### `branchpilot watch`

Start file watcher to process tickets immediately when due.

- `--dir <path>` — Scan specific directories
- `--verbose` — Show detailed output

### `branchpilot list`

List all tickets with their status.

- `--dir <path>` — Scan specific directories
- `--verbose` — Show detailed output

### `branchpilot init`

Initialize current Git project with example tickets and config.

### `branchpilot doctor`

Run checks verifying dependencies and configuration.

## Development

Contributions are welcome on this project, to get started clone the repo then run:

```bash
npm install
npm run check
npm test
```
