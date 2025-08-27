---
branch: feature/needs-rebase
title: Feature with automatic rebase
when: 2025-08-12 11:00
base: develop
rebase: true
labels: ["enhancement", "needs-review"]
reviewers: ["alice", "bob"]
deleteLocalBranch: true
---

This example demonstrates automatic rebasing before creating a PR.

## What this demonstrates

- **Automatic rebase** — Rebases onto base branch before pushing
- **Custom base branch** — Targets `develop` instead of default branch
- **Review assignment** — Automatically requests reviews from specified users
- **Multiple labels** — Applies multiple labels to categorize the PR

## Use cases

- **Long-running features** — Keep feature branches up-to-date with base
- **Clean history** — Maintain linear commit history
- **Conflict prevention** — Detect conflicts before PR creation

## How it works

1. Checks out the feature branch
2. Fetches latest changes from remote
3. Rebases onto the specified base branch
4. Force pushes with lease to remote
5. Creates PR with specified metadata
