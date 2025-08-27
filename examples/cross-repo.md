---
branch: feature/cross-repo-update
title: Update dependency in other project
when: 2025-08-12 12:00
repository: ~/projects/other-project
assignees: ["alice"]
onProcessed: delete
---

This example demonstrates creating a PR in a different repository.

## What this demonstrates

- **Cross-repository PRs** — Create PRs in any Git repository on your system
- **Repository field** — Specify target repository with `repository` field
- **Assignees** — Automatically assign the PR to specified users

## Use cases

- **Monorepo management** — Manage PRs across multiple related repositories
- **Dependency updates** — Schedule updates across dependent projects
- **Centralized ticket management** — Keep all tickets in one place

## How it works

1. Ticket file can be stored anywhere (e.g., `~/tickets/`)
2. branchpilot switches to the specified repository
3. Creates the branch and PR in that repository
4. Returns to process other tickets
