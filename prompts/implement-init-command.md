# Implement `branchpilot init` Command

## Goal
Add an `init` command that bootstraps a project so `branchpilot run` works immediately after.

## Core Requirements

### Simple Composable Design
**After `init`, `run` must work without any flags:**
```bash
branchpilot init     # Sets up everything
branchpilot run      # Processes tickets immediately
```

### Directory Strategy
**Default: Create `tickets/` subdirectory**
- Creates `tickets/` directory
- Generates `.branchpilot.toml` with `dirs = ["tickets"]`
- Places example tickets in `tickets/`
- This ensures `run` knows where to look

### Interactive Setup Flow
1. Detect if already initialized (check for `.branchpilot.toml`)
2. Create `tickets/` directory (or custom via `--dir`)
3. Generate `.branchpilot.toml` with `dirs` config
4. Create 2-3 example tickets with staggered times (one due now for testing)
5. Show success: "Run 'branchpilot run' to process tickets"

### Configuration Generation
- Creates `.branchpilot.toml` with `dirs = ["tickets"]`
- Includes helpful comments in the TOML file
- Detects timezone from system for examples

### Example Tickets to Generate
1. `tickets/example-immediate.md` - Due 1 minute ago (will process on first run)
2. `tickets/example-scheduled.md` - Due tomorrow at 10am
3. `tickets/example-advanced.md` - Due in 3 days with labels, reviewers

## Key Considerations

### User Experience
- Just one optional flag: `--force` to reinitialize
- Always creates `tickets/` directory with examples
- Clear output: "Initialized branchpilot in <path>. Run 'branchpilot run' to process tickets."

### Integration Points
- Reuse `doctor.ts` validation logic
- Use existing config types from `types.ts`
- Leverage `paths.ts` for cross-platform paths
- Use `gitgh.ts` for branch detection

### Edge Cases
- Existing `.branchpilot.toml` (require `--force` to overwrite)
- Existing `tickets/` directory (skip if exists, unless `--force`)
- No git repo (warn but continue)
- No gh CLI (warn but continue)

## Implementation Hints
- Add command to `cli.ts` using Commander pattern
- Create new `src/core/init.ts` module
- Use `fs.promises` for async file operations
- Generate TOML with comments using template strings
- Return structured result for testing

## Success Criteria
- **Composability**: After `init`, `run` works with no additional setup
- **Immediate feedback**: First example ticket processes on first `run`
- **Clear config**: Always sets `dirs` explicitly in `.branchpilot.toml`
- **Simple mental model**: Init sets up structure, run processes tickets
- **No surprises**: User knows exactly where tickets live

Carefully think hard, ultrathink analyse, build a plan and then execute this. Ensure all tests and docs are updated as you go.
