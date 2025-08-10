# Implement `branchpilot list` Command

## Goal
Add a `list` command that shows all tickets, working seamlessly after `init`.

## Core Requirements

### Simple Composable Design
**Works immediately after init:**
```bash
branchpilot init     # Sets up tickets/ with examples
branchpilot list     # Shows all tickets in configured dirs
branchpilot run      # Processes due tickets
```

### Ticket Discovery & Display
1. Read `dirs` from `.branchpilot.toml` (same as `run` command)
2. Parse and validate each ticket found
3. Calculate status: `due` (past when), `pending` (future when), `invalid` (errors)
4. Display in clean table format

### Filtering Options
- `--status <pending|due|invalid|all>` (default: all)
- `--days <n>` to show tickets due within n days
- `--json` for machine-readable output
- NO `--dir` flag (uses same config as `run` for consistency)

### Time Display
- Show relative time ("in 2 hours", "3 days ago")
- Include absolute time in verbose mode
- Respect timezone configuration
- Sort by due date (earliest first)

## Key Considerations

### User Experience
- Color-code by status (green=pending, yellow=due, red=invalid)
- Show validation errors for invalid tickets
- Summary line: "Found 5 tickets: 2 pending, 1 due, 2 invalid"
- Empty state: helpful message when no tickets found

### Performance
- Parallel file reading for large directories
- Cache parsed tickets during execution
- Early exit for filtered queries

### Integration Points
- Reuse `md-tickets.ts` parsing logic
- Use existing validation from `types.ts`
- Leverage `config.ts` for directory resolution
- Format with `chalk` for colors (add dependency if not already covered by some existing one - check)

### Edge Cases
- Malformed YAML (show file path and error)
- Missing required fields (list what's missing)
- Duplicate branches across tickets (warn)
- Tickets in subdirectories (include relative path)

## Implementation Hints
- Add command to `cli.ts` with filtering options
- Create `src/core/list.ts` module
- Add `formatRelativeTime()` utility using luxon
- Consider table formatter like `cli-table3`
- Return structured data for JSON output

## Display Format Example
```
Status   Branch          Title                    When          Path
───────────────────────────────────────────────────────────────────────
✓ due    fix-bug-123     Fix critical bug        2 hours ago   tickets/bug.md
⏳ pend   add-feature     Add new feature         in 3 days     tickets/feature.md
✗ inv    broken          [Invalid: missing when]               tickets/broken.md

Found 3 tickets: 1 due, 1 pending, 1 invalid
```

## Success Criteria
- Fast scanning of multiple directories
- Clear status indicators
- Helpful validation errors
- Multiple output formats (table, json)
- Useful filtering capabilities

Carefully think hard, ultrathink analyse, build a plan and then execute this. Ensure all tests and docs are updated as you go.
