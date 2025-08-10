# branchpilot [![CI](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/branchpilot.svg)](https://www.npmjs.com/package/branchpilot)

Schedule PR creation from local branches using Markdown tickets.

## Quick Start

```bash
# Install
npm i -g branchpilot

# (optional) Check setup
branchpilot doctor

# (optional) Initialize with example tickets and config
branchpilot init

# Process tickets
branchpilot run
```

## How It Works

1. **Create a branch** in any local repo with changes you want to schedule
2. **Write a ticket** add a Markdown file with PR details and `when` timestamp
3. **Run branchpilot** — PRs will be created on run if `when` is in the past

## Writing Tickets

Create a Markdown file with YAML [front matter](https://gohugo.io/content-management/front-matter/) at the top. Place it anywhere e.g. a project directory `~/projects/my-project/tickets` or a dedicated tickets directory `~/tickets`.

```markdown
---
title: Fix typo in README
when: 2025-01-15T09:00
branch: fix/readme-typo
repository: ~/projects/my-project  # Optional, defaults to current repo
---

Fixed a typo in the installation instructions.
```

### Required Fields

- `title` — PR title
- `when` — When to create the PR
- `branch` — Local branch name

### Optional Fields

```yaml
repository: ~/projects/other-repo  # Target different repo (tickets can be placed anywhere)
base: develop                      # Base branch (auto-detected if omitted)
rebase: true                       # Rebase before pushing
draft: true                        # Create draft PR
labels: ["bug", "urgent"]          # GitHub labels
reviewers: ["alice"]               # Request reviews
assignees: ["bob"]                 # Assign PR
```

## Configuration

Global config: `~/.config/branchpilot.toml`

```toml
dirs = ["~/tickets"]               # Directories to scan
defaultBase = "main"               # Default base branch
```

Repository config: `.branchpilot.toml`

```toml
defaultBase = "develop"            # Override global settings
```

Priority: Ticket → Repository → Global → Defaults

## Commands

### `branchpilot run`
Process due tickets and create PRs.
- `--dir <path>` — Scan specific directories (multiple allowed)
- `--dry-run` — Preview without changes

### `branchpilot list`
Display all tickets in a formatted table.
- `--dir <path>` — Scan specific directories

### `branchpilot init`
Initialize project with example tickets and config.

### `branchpilot doctor`
Verify git and GitHub CLI are installed and authenticated.

## Automation

Example with [PM2](https://pm2.keymetrics.io/) running every 10 minutes:
```bash
npm install pm2@latest -g
pm2 start "branchpilot run --dir ~/tickets" --name branchpilot --cron "*/10 * * * *"
```

## Prerequisites

- **git** — Installed and configured
- **gh** — GitHub CLI authenticated (`gh auth login`)

## Development

```bash
npm install  # Install dependencies
npm test     # Run tests
npm run lint # Lint code
```
