# Changelog

## [0.4.0] - 2025-08-10

### Build

- Adjust GitHub Release description output
- Migrate to TS commitlint config

### Chore

- Tidy files

### Feat

- Add XDG_CONFIG_HOME support
- Add init command
- Add list command

### Refactor

- Switch from yargs to commander
- Rename --dry to --dry-run
- Add -v flag and improve robustness when PR already merged

### Test

- Simplify windows tests
- Adjust timezone in tests
- Fix ubuntu tests

## [0.3.0] - 2025-08-10

### Build

- Adjust GitHub Release description output

### Refactor

- Streamline config and CLI with sensible defaults

## [0.2.0] - 2025-08-10

### Build

- Add release-it/git-cliff release process

### Chore

- Configure renovate to ignore node engine updates
- Refine Node.js Renovate config
- Update node.js to >=20.19.4

### Fix

- Fix release process

### Refactor

- Improve output

## [0.1.0] - 2025-08-10

### Build

- Add Biome and commitlint pre-commit hook
- Fill out more of package.json
- Add TS check to pre-commit hook
- Adjust bin path

### Docs

- Add CI badge to README
- Add CHANGELOG.md

### Fix

- Fix build

### Test

- Fix Windows unit tests
- Fix windows tests

