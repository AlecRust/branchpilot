# branchpilot [![CI](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/branchpilot.svg)](https://www.npmjs.com/package/branchpilot)

Automate Pull Request creation from local Git branches using Markdown files.

## Install

Ensure [git](https://git-scm.com/) and [gh](https://cli.github.com/) are configured in your terminal e.g. `gh auth status`
then run:

```bash
npm install -g branchpilot
```

## Usage

1. **Create** a branch in a local repository containing changes you want to schedule
1. **Prepare** a Markdown file that includes PR configuration and a `when` timestamp
1. **Execute** `branchpilot watch` to open the branches as PRs when they are due

### 1. Create

Simply create a branch in any local Git repository with changes you want to schedule.

### 2. Prepare

Create a Markdown file with any filename containing [front matter](https://gohugo.io/content-management/front-matter/) config at the top followed by your PR description.

The file can be placed anywhere. If you place it in a Git repository you can omit the `repository` field.

e.g. `~/projects/my-project/tickets/fix-readme-typo.md` or `~/tickets/fix-readme-typo.md`

```markdown
---
title: Fix typo in README
when: 2025-01-15T09:00
branch: fix-readme-typo
repository: ~/projects/my-project  # Optional, defaults to current repo
---

Fixed a typo in the installation instructions.
```

### 3. Execute

Configure the directories of tickets to scan using config files or command line flags as detailed below.

Use the `run` command to process all tickets once on demand:

```bash
branchpilot run
```

Or use the `watch` command to monitor tickets at an interval:

```bash
branchpilot watch
```

## Daemon

To run the process in the background use a process manager like [PM2](https://pm2.keymetrics.io/) with the `watch` command:

```bash
pm2 start branchpilot -- watch --interval 30m --verbose
```

A built-in daemon command may be added in the future, but PM2 or similar should work well.

PRs will be created on each run when the `when` timestamp has passed.

## Ticket configuration

These are all the PR configuration options you have in ticket Markdown files.

```yaml
title: Example PR Title      # (required) Title of the PR
when: 2025-01-15T09:00       # (required) When to open the PR (ISO 8601 format)
branch: fix-readme-typo      # (required) Branch name to create PR from
repository: ~/projects/repo  # Path to target repo for PRs (defaults to current repo)
base: develop                # Base branch (auto-detected if omitted)
rebase: true                 # Rebase against base branch before pushing
draft: true                  # Create PR as draft
autoMerge: true              # Enable auto-merge on PR
labels: ["bug", "urgent"]    # Set labels
reviewers: ["alice"]         # Set reviewers
assignees: ["bob"]           # Set assignees
```

## `branchpilot` configuration

Global config at `~/.config/branchpilot.toml`:

```toml
dirs = ["~/tickets"]         # Directories to scan
defaultBase = "main"         # Default base branch
```

Repository config e.g. `~/projects/my-project/.branchpilot.toml`:

```toml
defaultBase = "develop"      # Override global settings
```

## Commands

### `branchpilot run`

Process tickets in configured directories and create any due PRs.

- `--dir <path>` — Scan specific directories
- `--verbose` — Show detailed output

### `branchpilot watch`

Watch directories and automatically process tickets on an interval.

- `--dir <path>` — Scan specific directories
- `--interval <time>` — Check interval (e.g. `1h`, default `15m`)
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
