# branchpilot [![CI](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/branchpilot.svg)](https://www.npmjs.com/package/branchpilot)

Schedule PR creation from local branches using Markdown tickets.

## Quick Start

```bash
# Install
npm i -g branchpilot

# Check setup
branchpilot doctor

# Process tickets
branchpilot run
```

## How It Works

1. **Create a branch** with your changes
2. **Write a ticket** (Markdown file with PR details and schedule)
3. **Run branchpilot** — PRs are created when their time arrives

## Writing Tickets

Create a Markdown file with YAML [front matter](https://gohugo.io/content-management/front-matter/):

```markdown
---
branch: fix/readme-typo
title: Fix typo in README
when: 2025-01-15T09:00:00
---

Fixed a typo in the installation instructions.
```

### Required Fields
- `branch` — Local branch name
- `title` — PR title
- `when` — When to create the PR (ISO timestamp)

### Optional Fields
```yaml
repository: ~/projects/other-repo  # Target different repo
base: develop                      # Base branch (auto-detected if omitted)
rebase: true                      # Rebase before pushing
draft: true                       # Create draft PR
labels: ["bug", "urgent"]        # GitHub labels
reviewers: ["alice"]             # Request reviews
assignees: ["bob"]               # Assign PR
```

## Configuration

Global config: `~/.config/branchpilot.toml`
```toml
dirs = ["~/tickets"]              # Directories to scan
timezone = "America/New_York"     # Default timezone
defaultBase = "main"              # Default base branch
```

Repository config: `.branchpilot.toml`
```toml
defaultBase = "develop"           # Override global settings
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

## Features

- **Cross-repository PRs** — Target different repos with `repository` field
- **Smart branch sync** — Automatically fetches and merges remote changes
- **Base branch detection** — Auto-detects default branch via GitHub API
- **Timezone support** — Specify in ticket or configure default
- **Safe push modes** — `force-with-lease` (default), `ff-only`, or `force`
- **Non-destructive** — Failed tickets remain for retry

## Automation

Example with PM2:
```bash
pm2 start "branchpilot run" --cron "*/10 * * * *"
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
