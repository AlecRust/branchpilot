---
branch: feature/new-feature
title: Add new feature
when: 2025-08-12 10:00
deleteLocalBranch: true
---

This is a simple PR example with automatic cleanup of the local branch after creating the PR.

## What this demonstrates

- **Minimal configuration** — Only `branch` and `when` are required
- **Local branch cleanup** — `deleteLocalBranch: true` removes the local branch after PR creation
- **Clean PR body** — Everything below the last `---` becomes the PR description

## Usage

Place this file in any directory scanned by branchpilot. When the `when` timestamp
passes, a PR will be created automatically.
