# CLAUDE.md — branchpilot Development Context

branchpilot is a **local-first TypeScript CLI** that processes Markdown tickets to create GitHub PRs when their scheduled time arrives.

## Core Concept
branchpilot doesn't run continuously - it processes tickets each time it's executed. If a ticket's `when` timestamp has passed, the PR is created. Users typically run it periodically (cron/PM2) or manually.

## Architecture

### Directory Structure
```
src/
├── cli.ts               # CLI entry with yargs commands
├── core/
│   ├── config.ts       # Configuration loading & validation
│   ├── doctor.ts       # Environment checks (git, gh, auth)
│   ├── gitgh.ts        # Git & GitHub operations
│   ├── md-tickets.ts   # Markdown parsing & processing
│   ├── paths.ts        # Cross-platform path handling
│   ├── run.ts          # Main execution logic
│   ├── types.ts        # TypeScript interfaces
│   └── utils.ts        # Shared utilities
└── tests/              # Comprehensive test suite
```

### Commands
- `branchpilot run --dir <paths>` — Process due tickets (supports multiple dirs)
- `branchpilot run --dry --dir <paths>` — Preview without actions
- `branchpilot doctor` — Validate environment setup

### Configuration Hierarchy (priority order)
1. Ticket front matter (highest)
2. CLI flags (`--base`, `--push-mode`, `--remote`)
3. Repository config (`.branchpilot.toml`)
4. Global config (`~/.config/branchpilot/config.toml`)
5. Built-in defaults (lowest)

## Ticket Processing Flow

1. **Load Configuration** — Merge global → repo → CLI configs
2. **Scan Directories** — Find `.md` files in specified directories
3. **Parse & Validate** — Extract front matter, validate schema
4. **Filter Due Tickets** — Compare `when` timestamp with current time
5. **Process Each Ticket:**
   - Determine target repository (ticket.repository or current git repo)
   - Auto-detect or resolve base branch
   - Check if open PR already exists (skip if yes)
   - Checkout branch locally
   - If branch exists on remote: fetch & merge
   - If `rebase: true`: rebase onto base branch
   - Push branch (respecting pushMode)
   - Create PR via `gh` with metadata

## Ticket Schema
```yaml
---
# Required fields
branch: string           # Local branch name
title: string           # PR title
when: string            # ISO timestamp (with optional TZ)

# Optional fields
repository: string      # Target repo path (supports ~)
base: string           # Base branch (auto-detected if omitted)
rebase: boolean        # Rebase before push (default: false)
pushMode: string       # force-with-lease|ff-only|force
labels: string[]       # GitHub labels
reviewers: string[]    # Request reviews
assignees: string[]    # Assign PR
---
```

## Advanced Features

### Cross-Repository Support
Tickets can target different repositories via `repository: ~/path/to/repo`. This enables centralized PR management across multiple projects.

### Default Branch Detection
1. Try GitHub API: `gh repo view --json defaultBranchRef`
2. Fallback to git: `refs/remotes/origin/HEAD`
3. Final fallback: `main`

### Push Modes
- `force-with-lease` (default) — Safe force push
- `ff-only` — Only if fast-forward possible
- `force` — Unconditional force push

### Remote Branch Synchronization
Before pushing, if branch exists on remote:
1. Fetch remote branch
2. Merge with `--ff-only`
3. Only then apply optional rebase

### Error Recovery
- Non-fatal errors leave tickets in place for retry
- Fatal errors (missing tools) exit with status 1
- Detailed rebase conflict messages
- Cross-device file operations handled

## Development

### Tech Stack
- **TypeScript** — Strict mode, ESM modules
- **yargs** — CLI argument parsing
- **execa** — Process execution for git/gh
- **gray-matter** — YAML front matter parsing
- **luxon** — Timezone-aware date handling
- **zod** — Runtime schema validation
- **toml** — Configuration parsing
- **Biome** — Linting & formatting
- **tsup** — ESM bundling

### Testing
```bash
npm test              # Run test suite
npm run typecheck    # Type checking
npm run lint         # Biome linting
npm run format       # Auto-format code
```

### Building
```bash
npm run build        # Build to dist/
npm run dev         # Run without building (tsx)
```

## Key Implementation Details

### Timezone Handling
- Tickets can specify timezone in `when` field
- Fallback to config `timezone` for bare ISO strings
- All comparisons done in UTC internally

### PR Duplicate Prevention
Before creating PR, checks: `gh pr list --head <branch>`

### Ticket Atomicity
Success = PR created. Failure = ticket remains for retry (non-fatal errors).

### Platform Support
- Windows: `%APPDATA%/branchpilot/config.toml`
- macOS/Linux: `~/.config/branchpilot/config.toml`
- Home directory expansion works everywhere
