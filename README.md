# branchpilot [![CI](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml)

Automate PR creation from local branches via Markdown tickets.

## How it works

1. **Create a branch** with your changes
2. **Write a Markdown ticket** with YAML [front matter](https://gohugo.io/content-management/front-matter/) describing when to open the PR
3. **Run branchpilot** — it creates PRs for tickets whose time has arrived

branchpilot doesn't run continuously. It processes tickets each time you run it, making it perfect for cron jobs or manual execution.

## Quick Start

```bash
# Install
npm i -g branchpilot

# Check your setup
branchpilot doctor

# Process tickets in current directory
branchpilot run

# Process tickets in specific directories
branchpilot run --dir ~/tickets --dir ~/projects/scheduled-prs

# Preview without making changes
branchpilot run --dry
```

## Writing Tickets

Create a Markdown file (e.g., `fix-typo.md`) with YAML front matter:

```markdown
---
branch: fix/readme-typo
title: Fix typo in README
when: 2025-01-15T09:00:00
---

## Summary

Fixed a typo in the installation instructions.
```

### Required Fields

- `branch` — Your local branch name
- `title` — PR title
- `when` — ISO timestamp for PR creation

### Optional Fields

```yaml
repository: ~/projects/other-repo  # Target a different repo
base: develop                       # PR base branch (auto-detected if omitted)
rebase: true                       # Rebase onto base before pushing
draft: true                        # Create as draft PR
labels: ["bug", "urgent"]         # GitHub labels
reviewers: ["alice", "bob"]       # Request reviews
assignees: ["charlie"]            # Assign PR
pushMode: force                   # Push strategy (force-with-lease|ff-only|force)
```

## Configuration

Configure defaults in `~/.config/branchpilot.toml` (Windows: `%APPDATA%/branchpilot.toml`):

```toml
# Directories to scan for tickets
dirs = ["~/tickets", "~/projects/scheduled-prs"]

# Default base branch
defaultBase = "main"

# Timezone for parsing dates
timezone = "America/New_York"

# Push strategy
pushMode = "force-with-lease"

# Git remote
remote = "origin"

# GitHub repository (owner/name)
repo = "myorg/myrepo"
```

### Repository Config

Override global settings with `.branchpilot.toml` in your repository root:

```toml
defaultBase = "develop"
pushMode = "ff-only"
```

### Configuration Priority

Settings are applied in order (highest priority first):

1. Ticket front matter
2. Repository config (`.branchpilot.toml`)
3. Global config (`~/.config/branchpilot.toml`)
4. Built-in defaults

## Features

### Cross-Repository PRs

Target different repositories using the `repository` field:

```yaml
repository: ~/projects/backend
```

branchpilot will switch to that repository, push your branch, and create the PR there.

### Automatic Branch Synchronization

If your branch exists on the remote, branchpilot will:

1. Fetch the remote branch
2. Merge it locally (fast-forward only)
3. Apply optional rebase if configured
4. Push with your configured strategy

### Smart Base Branch Detection

When `base` isn't specified, branchpilot automatically detects the default branch:

1. Via GitHub API (`gh repo view`)
2. Via Git (`refs/remotes/origin/HEAD`)
3. Fallback to `main`

### Timezone Support

Specify timezone in the `when` field or configure a default:

```yaml
# With timezone
when: 2025-01-15T09:00:00-05:00

# Without timezone (uses configured default)
when: 2025-01-15T09:00:00
```

### Push Modes

- `force-with-lease` (default) — Safe force push
- `ff-only` — Only push if fast-forward possible
- `force` — Always force push

## Status Messages

When you run branchpilot, you'll see:

- `✓ https://github.com/...` — PR created successfully
- `scheduled in X hours` — Not due yet
- `PR already exists` — Open PR found, skipping
- `✗ Error message` — Failed (ticket remains for retry)

## Automation

Run it however you like, here's an example using pm2 to run it every 10 minutes:

```bash
npm install -g pm2
pm2 start "branchpilot run" --name branchpilot --cron "*/10 * * * *"
pm2 save
pm2 startup
```

## Commands

### `branchpilot run`

Process due tickets and create PRs.

Options:

- `--dir <path>` — Directories to scan (can specify multiple, defaults to current directory)
- `--dry` — Preview without making changes
- `--config <path>` — Use custom config file

### `branchpilot doctor`

Check that required tools are installed and configured:

- Git installed and configured
- GitHub CLI installed and authenticated
- Current directory is a git repository (if applicable)

## Prerequisites

- **git** — Must be installed and configured
- **gh** — GitHub CLI must be installed and authenticated (`gh auth login`)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint & format
npm run lint
npm run format
```
