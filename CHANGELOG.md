# Changelog

## [0.7.0] - 2025-08-16

### 🚀 Features

- Add timeout to gh commands

### 🐛 Bug Fixes

- Normalise repo paths for consistent branch restoration
- Prevent gh CLI from hanging on interactive prompts

### 💼 Other

- Simplify Biom pre-commit command
- Simplify Biome config
- Add "npm audit" to release process
- Move release building to CI

### 🚜 Refactor

- Simplify function names
- Simplify "when" ticket option

### 📚 Documentation

- Simplify README
- Improve README
- Improve README
- Improve README
- Improve recommended PM2 command
- Improve README
- Improve README
- Improve README

### 🧪 Testing

- Fix windows tests
- Fix windows tests
- Fix windows tests
- Adjust CI Node.js test matrix

## [0.6.0] - 2025-08-13

### 🚀 Features

- Add tickets autoMerge option
- Add watch command

### 📚 Documentation

- Improve recommended PM2 command
- Improve recommended PM2 command

## [0.5.1] - 2025-08-12

### 🚜 Refactor

- Improve consistency of output formatting

### 🧪 Testing

- Improve tests

## [0.5.0] - 2025-08-12

### 🚀 Features

- Add loading spinner for commands that take a while

### 🚜 Refactor

- Remove dry run, switch to simple-git, restructure code
- Show repo name not ticket filename in list command
- Use consola for logging

### 📚 Documentation

- Improve README
- Improve docs
- Improve README
- Improve README
- Improve README
- Improve PM2 example docs

### ⚙️ Miscellaneous Tasks

- Improve consistency of tool description
- Remove old files

## [0.4.8] - 2025-08-10

### 🐛 Bug Fixes

- Handle merged branches and no-commit scenarios

### 🧪 Testing

- Improve list command mocking

### ⚙️ Miscellaneous Tasks

- Tidy .gitignore

## [0.4.7] - 2025-08-10

### 💼 Other

- Simplify npm scripts

### 🚜 Refactor

- Unify --verbose and list behaviour

### 📚 Documentation

- Adjust package.json keywords

### ⚙️ Miscellaneous Tasks

- Set packageManager version
- Add .gitattributes file for windows

## [0.4.6] - 2025-08-10

### 💼 Other

- Fix CHANGELOG.md formatting

### ⚙️ Miscellaneous Tasks

- Error when no tickets found

## [0.4.5] - 2025-08-10

### 🐛 Bug Fixes

- Improve release notes generation for GitHub releases
- Use HEAD instead of future tag for release notes generation
- Simplify release notes generation in release-it config
- Improve release notes generation for GitHub releases

## [0.4.4] - 2025-08-10

### 🐛 Bug Fixes

- Fix --version returning wrong version

### 💼 Other

- Fix GitHub Release body building

## [0.4.3] - 2025-08-10

### 💼 Other

- Fix GitHub Release body building

### 🚜 Refactor

- Simplify timezone configuration

### 📚 Documentation

- Improve README
- Improve README

## [0.4.2] - 2025-08-10

### 🐛 Bug Fixes

- Validate timezone strings and repository paths

### 💼 Other

- Improve release notes building

### 📚 Documentation

- Simplify README

### ⚙️ Miscellaneous Tasks

- Remove SPDX license identifier comments
- Check for uncommitted changes before checkout to prevent data loss
- Improve handling of invalid TOML

## [0.4.1] - 2025-08-10

### 💼 Other

- Fix GitHub Release description output

### 📚 Documentation

- Add npm badge to README

## [0.4.0] - 2025-08-10

### 🚀 Features

- Add XDG_CONFIG_HOME support
- Add init command
- Add list command

### 💼 Other

- Adjust GitHub Release description output
- Migrate to TS commitlint config

### 🚜 Refactor

- Switch from yargs to commander
- Rename --dry to --dry-run
- Add -v flag and improve robustness when PR already merged

### 🧪 Testing

- Simplify windows tests
- Adjust timezone in tests
- Fix ubuntu tests

### ⚙️ Miscellaneous Tasks

- Tidy files

## [0.3.0] - 2025-08-10

### 💼 Other

- Adjust GitHub Release description output

### 🚜 Refactor

- Streamline config and CLI with sensible defaults

## [0.2.0] - 2025-08-10

### 🐛 Bug Fixes

- Fix release process

### 💼 Other

- Add release-it/git-cliff release process

### 🚜 Refactor

- Improve output

## [0.1.0] - 2025-08-10

### 🐛 Bug Fixes

- Fix build

### 💼 Other

- Add Biome and commitlint pre-commit hook
- Fill out more of package.json
- Add TS check to pre-commit hook
- Adjust bin path

### 📚 Documentation

- Add CI badge to README
- Add CHANGELOG.md

### 🧪 Testing

- Fix Windows unit tests
- Fix windows tests

