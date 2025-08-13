# branchpilot [![CI](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/branchpilot.svg)](https://www.npmjs.com/package/branchpilot)

Automate Pull Request creation from local Git branches using Markdown files.

## Quick start

```bash
# Install
npm i -g branchpilot

# (optional) Check setup
branchpilot doctor

# (optional) Initialize current project
branchpilot init

# Process tickets
branchpilot run

# Watch for new tickets and process them automatically
branchpilot watch --interval 15m
```

## Prerequisites

[git](https://git-scm.com/) and [gh](https://cli.github.com/) must be installed and configured.

## How it works

1. **Create a branch** in any local repo with changes you want to schedule
2. **Write a ticket** a Markdown file with PR details and `when` timestamp
3. **Run branchpilot** — PRs will be opened on run if `when` is in the past

## Writing tickets

Create a Markdown file with some [front matter](https://gohugo.io/content-management/front-matter/) config at the top followed by your PR description.

Place the file anywhere e.g. within a repo at `~/projects/my-repo/tickets` or in a dedicated tickets directory `~/tickets`.

```markdown
---
title: Fix typo in README
when: 2025-01-15T09:00
branch: fix/readme-typo
repository: ~/projects/my-project  # Optional, defaults to current repo
---

Fixed a typo in the installation instructions.
```

### Optional fields

```yaml
repository: ~/projects/repo  # Path to target repo for PRs (defaults to current repo)
base: develop                # Base branch (auto-detected if omitted)
rebase: true                 # Rebase against base branch before pushing
draft: true                  # Create PR as draft
autoMerge: true              # Enable auto-merge on PR
labels: ["bug", "urgent"]    # Set labels
reviewers: ["alice"]         # Set reviewers
assignees: ["bob"]           # Set assignees
```

## Configuration

Global config: `~/.config/branchpilot.toml`

```toml
dirs = ["~/tickets"]         # Directories to scan
defaultBase = "main"         # Default base branch
```

Repository config: `.branchpilot.toml`

```toml
defaultBase = "develop"      # Override global settings
```

Priority: Ticket → Repository → Global → Defaults

## Commands

### `branchpilot run`

Process tickets in configured directories and create any due PRs.

- `--dir <path>` — Scan specific directories
- `--verbose` — Show detailed output

### `branchpilot watch`

Watch directories and automatically process tickets on an interval.

- `--dir <path>` — Scan specific directories
- `--interval <time>` — Check interval (e.g., "5m", "1h", "30s") (default: "15m")
- `--verbose` — Show detailed output

### `branchpilot list`

List all tickets with their status.

- `--dir <path>` — Scan specific directories

### `branchpilot init`

Initialize current project with example tickets and config.

### `branchpilot doctor`

Run checks verifying dependencies and configuration.

## Watch mode

Use the `watch` command to run continuously, checking for due tickets every 15 minutes:

```bash
# Foreground
branchpilot watch

# Custom interval
branchpilot watch --interval 5m --verbose

# Run in the background with PM2
pm2 start "branchpilot watch --interval 15m"
```

Alternatively, schedule individual runs using cron or a package like PM2:

```bash
# Cron (add to crontab -e)
*/15 * * * * /usr/local/bin/branchpilot run

# PM2
pm2 start branchpilot --cron "*/15 * * * *" --no-autorestart -- run
```

## Development

```bash
npm install
npm test
npm run check
```

## The Vision

The complete command set that branchpilot will eventually support:

```bash
# Core commands
branchpilot run                      # Process due tickets once
branchpilot list                     # List all tickets and their status
branchpilot init                     # Initialize with examples

# Watch mode (foreground)
branchpilot watch                    # Watch and process tickets continuously (default every 15 minutes)
branchpilot watch --interval 5m      # Custom check interval

# Daemon mode (background)
branchpilot daemon start             # Start background service
branchpilot daemon stop              # Stop background service
branchpilot daemon status            # Check if daemon is running
branchpilot daemon restart           # Restart background service
branchpilot daemon logs              # View daemon logs
branchpilot daemon logs --tail 50    # View last 50 log lines

# Utility commands
branchpilot doctor                   # Verify environment setup
branchpilot validate                 # Check ticket syntax
branchpilot version                  # Show version info
```
