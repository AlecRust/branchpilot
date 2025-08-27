---
branch: feature/draft-example
title: Example draft PR for review
when: 2025-08-10 16:00
draft: true
labels: ["wip", "draft"]
reviewers: ["reviewer1", "reviewer2"]
assignees: ["alice"]
onProcessed: archive
archiveDir: processed
---

This example demonstrates creating a draft PR that isn't ready for final review.

## What this demonstrates

- **Draft status** — PR is created as a draft on GitHub
- **Labels** — Automatically applies the specified labels
- **Review workflow** — Draft PRs don't trigger review requests

## Use cases

- **Work in progress** — Share early work for feedback
- **Scheduled previews** — Create draft PRs for upcoming features
- **Staged rollouts** — Prepare PRs that will be marked ready later
