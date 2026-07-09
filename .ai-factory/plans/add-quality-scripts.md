<!-- handoff:task:fa909f22-c843-4fbf-b885-7ca084101d82 -->
# Implementation Plan: Add Quality Scripts

Branch: main
Created: 2026-07-09

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 0. Инфраструктура качества"
Rationale: Adds or confirms the checked roadmap requirement for npm scripts `lint`, `lint:fix`, and `format` in `package.json`.

## Existing Context
- [ ] Project stack: Vue 3 + TypeScript + Vite, with ESLint flat config and Prettier already configured.
- [ ] Current package manager signal: `package-lock.json`, so use npm script names and npm-compatible commands.
- [ ] Current `package.json` already contains `lint`, `lint:fix`, `format`, and `format:check`; implementation should verify these are intentional and only patch if they drift from the required behavior.

## Tasks

### Phase 1: Confirm Tooling Targets
- [x] Task 1: Inspect `package.json`, `eslint.config.js`, `.prettierrc.json`, and `.prettierignore` to confirm ESLint and Prettier are the intended quality tools and identify whether the required scripts are missing, outdated, or already correct. Logging requirements: no runtime logging changes; capture command/config observations in implementation notes, preserve tool stdout/stderr when validating, and treat config mismatches as WARN-level findings for the implementer.

### Phase 2: Update Package Scripts
- [x] Task 2: Ensure `package.json` contains exactly the required npm scripts with project-wide behavior: `lint` runs `eslint .`, `lint:fix` runs `eslint . --fix`, and `format` runs `prettier . --write`; keep existing compatible scripts such as `format:check` unchanged. Depends on Task 1. Logging requirements: no application logging changes; rely on npm/ESLint/Prettier stdout and stderr for diagnostics, and document any script normalization as INFO-level implementation notes.

### Phase 3: Validate Command Wiring
- [x] Task 3: Validate the script wiring without adding tests: run `npm run lint -- --help`, `npm run lint:fix -- --help`, and `npm run format -- --help` or an equivalent non-mutating command-resolution check to confirm npm can resolve ESLint and Prettier through the scripts. Depends on Task 2. Logging requirements: preserve full command output for failures, classify missing binary/script failures as ERROR-level findings, and avoid changing source formatting during validation unless explicitly needed.

### Phase 4: Review Final Diff
- [x] Task 4: Review the final diff to ensure only `package.json` changed when scripts needed patching; if scripts were already correct, leave source files unchanged and report that the implementation is already satisfied. Depends on Task 3. Logging requirements: no runtime logging changes; summarize changed files and validation output in final implementation notes with enough detail to debug failures.

## Implementation Notes
- INFO: `package.json` already contained the required quality scripts: `lint`, `lint:fix`, and `format`; no script normalization was needed.
- INFO: `eslint.config.js`, `.prettierrc.json`, and `.prettierignore` confirm ESLint and Prettier are the intended project-wide quality tools.
- INFO: `npm run lint -- --help`, `npm run lint:fix -- --help`, and `npm run format -- --help` all resolved their local CLIs successfully and exited with status 0.
