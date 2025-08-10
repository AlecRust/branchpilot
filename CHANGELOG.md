# Changelog

## v0.1.0

### 🎉 Initial Release

### Features
- Process Markdown tickets with scheduled timestamps
- Create GitHub PRs automatically when tickets are due
- Cross-repository support
- Timezone-aware scheduling
- Configurable push modes (force-with-lease, ff-only, force)
- Rebase support before pushing
- Doctor command for environment validation
- Dry-run mode for testing

### CLI Commands
- \`branchpilot run --dir <paths>\` - Process due tickets
- \`branchpilot doctor\` - Validate environment setup

### Configuration
- Global config: \`~/.config/branchpilot/config.toml\`
- Repo config: \`.branchpilot.toml\`
- Ticket front matter for per-ticket settings
