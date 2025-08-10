# branchpilot [![CI](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/branchpilot.svg)](https://www.npmjs.com/package/branchpilot)

Schedule PR creation from local branches using Markdown tickets.

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
```

## How it works

1. **Create a branch** in any local repo with changes you want to schedule
2. **Write a ticket** a Markdown file with PR details and `when` timestamp
3. **Run branchpilot** — PRs will be opened on run if `when` is in the past

## Writing tickets

Create a Markdown file with [front matter](https://gohugo.io/content-management/front-matter/) config at the top. Place it anywhere e.g. a project directory `~/projects/my-project/tickets` or a dedicated tickets directory `~/tickets`.

```markdown
---
title: Fix typo in README
when: 2025-01-15T09:00
branch: fix/readme-typo
repository: ~/projects/my-project  # Optional, defaults to current repo
---

Fixed a typo in the installation instructions.
```

### Required fields

- `title` — PR title
- `when` — When to create the PR
- `branch` — Local branch name

### Optional fields

```yaml
repository: ~/projects/repo  # Target different repo (tickets can be placed anywhere)
base: develop                # Base branch (auto-detected if omitted)
rebase: true                 # Rebase against base branch before pushing
draft: true                  # Create PR as draft
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

Process due tickets and create PRs.

- `--dir <path>` — Scan specific directories
- `--dry-run` — Preview without changes

### `branchpilot list`

Display all tickets in a formatted table.

- `--dir <path>` — Scan specific directories

### `branchpilot init`

Initialize current directory project with example tickets and config.

### `branchpilot doctor`

Run checks like verifying Git and GitHub CLI are installed and authenticated.

## Automation

Simple example to run `branchpilot` every 10 minutes using [PM2](https://pm2.keymetrics.io/):

```bash
npm install pm2@latest -g
pm2 start "branchpilot run --dir ~/tickets --verbose" --name bp --cron "*/10 * * * *"
```

## Prerequisites

- **[git](https://git-scm.com/)** — Installed and configured
- **[gh](https://cli.github.com/)** — GitHub CLI authenticated (`gh auth login`)

## Development

```bash
npm install
npm test
npm run check
```
