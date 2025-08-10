# BranchPilot [![CI](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/AlecRust/branchpilot/actions/workflows/ci.yml)

Automate PR creation from local branches via Markdown tickets.

## Prerequisites

- **git** - Must be installed and configured
- **gh** (GitHub CLI) - Must be installed and authenticated (`gh auth login`)

## How it works

1. **Create a branch** with your changes in any repository
2. **Write a Markdown ticket** describing when to open the PR, the description and some other options (in the same repo or centralized location)
3. **Run BranchPilot** - it checks each ticket's `when` timestamp and creates PRs for any that are due (now or in the past)

**Note:** BranchPilot doesn't run continuously or create schedules. It processes tickets each time you run it, so you typically run it periodically (via cron, PM2, etc.) or manually.

**Repository detection:** If your ticket doesn't specify a `repository`, BranchPilot uses the Git repository containing the ticket directory.

## Example

Create a file like `~/Desktop/PRs/fix-gitignore.md`:

```markdown
---
branch: ignore-vscode-settings
title: "Add .vscode/settings.json to .gitignore"
when: 2025-01-01
---

## Summary

Added `.vscode/settings.json` to the `.gitignore` file to prevent VS Code workspace settings from being committed to the repository.
```

This assumes you've already created and committed changes to the `ignore-vscode-settings` branch.

When BranchPilot runs after January 1st, 2025, it will:

- Detect the repository (from ticket location or `repository` field)
- Push your existing `ignore-vscode-settings` branch to GitHub
- Create a PR with your title and description

## Install

```bash
npm i -g branchpilot
```

## Usage

```bash
# Process due tickets
branchpilot run --dir ~/Desktop/PRs

# Preview what would happen
branchpilot run --dry --dir ~/Desktop/PRs

# Check your setup
branchpilot doctor
```

## Ticket Options

```yaml
---
branch: feature/my-feature       # Required: your local branch
title: "Add new feature"         # Required: PR title
when: "2025-08-12T09:00:00"     # Required: when to create PR
repository: ~/projects/my-repo   # Optional: override auto-detected repo
rebase: true                     # Optional: rebase before pushing
base: develop                    # Optional: PR base branch
labels: ["feature", "urgent"]   # Optional: GitHub labels
reviewers: ["alice", "bob"]     # Optional: request reviews
assignees: ["charlie"]          # Optional: assign PR
---
```

## Automating with Schedules

Since BranchPilot processes tickets whenever it runs, you typically want to run it periodically:

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start BranchPilot with PM2, running every 10 minutes
pm2 start "branchpilot run --dir ~/Desktop/PRs" --name branchpilot --cron "*/10 * * * *"

# Save PM2 configuration to auto-start on reboot
pm2 save
pm2 startup  # Follow the instructions to enable startup
```

### Using crontab

```bash
# Edit your crontab
crontab -e

# Add this line to run every 10 minutes
*/10 * * * * /usr/local/bin/branchpilot run --dir ~/Desktop/PRs
```

## Development

```bash
# Install dependencies
npm install

# Run without building (using tsx)
npx tsx src/cli.ts run --dir ~/Desktop/PRs

# Build the project
npm run build

# Run built version
node dist/cli.mjs run --dir ~/Desktop/PRs

# Run tests
npm test

# Type checking and linting
npm run typecheck
npm run lint
