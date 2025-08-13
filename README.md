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

# Watch and process tickets automatically
branchpilot watch
```

## Prerequisites

[git](https://git-scm.com/) and [gh](https://cli.github.com/) must be installed and configured.

## How it works

1. **Create branches** in local repos with changes you want to schedule
2. **Write ticket** Markdown files with PR description and `when` timestamp
3. **Run branchpilot** and PRs will be opened when the `when` time arrives

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

## Automation

`branchpilot run` processes tickets once, while `branchpilot watch` runs continuously and checks tickets at the specified interval.

To run `branchpilot watch` in the background you can use a process manager like [PM2](https://pm2.keymetrics.io/):

```bash
pm2 start "branchpilot watch --interval 5m"
```

## Development

```bash
npm install
npm test
npm run check
```
