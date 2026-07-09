<!-- handoff:task:165489d8-e4b4-4c9e-8a82-b7a9b24196bb -->
# Implementation Plan: Set Up Pre-Commit Checks

Branch: main
Created: 2026-07-09

## Settings
- [x] Testing: no
- [x] Logging: verbose
- [x] Docs: no
- [x] Mode: fast
- [x] Plan file: `.ai-factory/plans/set-up-pre-commit-checks.md`

## Roadmap Linkage
Milestone: "Этап 0. Инфраструктура качества (фундамент)"
Rationale: This task directly implements the roadmap item "Настроить pre-commit хук (husky + lint-staged) на lint/format/typecheck" and builds on the existing ESLint, Prettier, and npm quality scripts.

## Research Context
Source: none

Goal: Configure a Husky pre-commit hook backed by lint-staged so staged source files are linted and formatted before commit, while TypeScript/Vue typechecking runs at the project level.
Constraints: Do not add tests or documentation tasks; keep all changes inside `/home/www/tiptap`; use npm because `package-lock.json` is present; preserve existing ESLint flat config and Prettier configuration.
Decisions: Add `husky` and `lint-staged` as development dependencies; keep staged-file lint/format commands in lint-staged; run full `npm run typecheck` from the pre-commit script because Vue project typechecking is not safely file-scoped.
Open questions: none

## Existing Context
- [x] Project stack: Vue 3 + TypeScript + Vite, with ESLint flat config in `eslint.config.js` and Prettier config in `.prettierrc.json`.
- [x] Current scripts in `package.json`: `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, and `build` already exist.
- [x] Current package manager signal: `package-lock.json`; update dependencies with npm so `package-lock.json` remains authoritative.
- [x] Current hook state: no `.husky/` directory and no lint-staged configuration were found.

## Tasks

### Phase 1: Confirm Pre-Commit Scope
- [x] Task 1: Inspect the current quality-tooling baseline before editing.
  - [x] Deliverable: Confirm exact scripts, ignore files, and tool versions in `package.json`, `package-lock.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, and `.gitignore`.
  - [x] Expected behavior: Implementation uses the existing npm/ESLint/Prettier/typecheck commands instead of introducing duplicate tooling or conflicting config.
  - [x] Files: `package.json`, `package-lock.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`
  - [x] Logging requirements: No application runtime logging is needed; capture command/config observations as INFO-level implementation notes, and preserve full stderr/stdout for missing-tool or malformed-config failures.
  - [x] Dependencies: none

### Phase 2: Add Hook Dependencies And Scripts
- [x] Task 2: Add Husky and lint-staged to the npm development toolchain.
  - [x] Deliverable: Install `husky` and `lint-staged` as dev dependencies with npm, updating both `package.json` and `package-lock.json`.
  - [x] Expected behavior: Fresh `npm install` restores the pre-commit tooling reproducibly without adding runtime dependencies.
  - [x] Files: `package.json`, `package-lock.json`
  - [x] Logging requirements: No application runtime logging is needed; record npm install warnings, dependency resolution messages, and any engine/version incompatibility as WARN or ERROR implementation notes.
  - [x] Dependencies: Task 1

- [x] Task 3: Wire npm scripts for Husky installation and a reusable pre-commit entry point.
  - [x] Deliverable: Add or preserve a `prepare` script that runs `husky`, and add a `precommit` script that runs `lint-staged` followed by `npm run typecheck`.
  - [x] Expected behavior: Hooks are installed after dependency installation, and the pre-commit behavior can be run manually with `npm run precommit`.
  - [x] Files: `package.json`
  - [x] Logging requirements: No application runtime logging is needed; keep npm script output verbose enough to identify whether failures came from Husky setup, lint-staged, or typecheck.
  - [x] Dependencies: Task 2

### Phase 3: Configure Staged-File Checks
- [x] Task 4: Add lint-staged configuration for relevant changed files.
  - [x] Deliverable: Create `.lintstagedrc.json` or an equivalent lint-staged config that runs `eslint --fix` and `prettier --write` for staged JavaScript/TypeScript/Vue files, and `prettier --write` for supported staged config/style/markdown files.
  - [x] Expected behavior: `lint-staged` receives staged file paths, only touches relevant staged files, restages fixes automatically, and leaves project-wide type safety to `npm run typecheck`.
  - [x] Files: `.lintstagedrc.json` or `package.json`
  - [x] Logging requirements: No application runtime logging is needed; preserve lint-staged file lists and ESLint/Prettier diagnostics for failures, especially unsupported extensions or ignored-file surprises.
  - [x] Dependencies: Task 3

### Phase 4: Install The Git Hook And Validate
- [x] Task 5: Create and validate the Husky pre-commit hook.
  - [x] Deliverable: Add `.husky/pre-commit` that runs `npm run precommit`, then validate the setup with non-test commands such as `npm run precommit`, `npx lint-staged --debug` when useful, and `npm run typecheck`.
  - [x] Expected behavior: A local commit triggers lint-staged lint/format on staged files and then project typecheck; failures block the commit with actionable CLI output.
  - [x] Files: `.husky/pre-commit`, `package.json`, `.lintstagedrc.json` or `package.json`
  - [x] Logging requirements: No application runtime logging is needed; capture full hook/precommit command output, classify lint/format/typecheck failures by command, and include exact rerun commands in implementation notes.
  - [x] Dependencies: Task 4

## Commit Plan
- [x] Commit 1: `chore: add pre-commit tooling` after Tasks 1-3 update dependencies and npm scripts.
- [x] Commit 2: `chore: configure pre-commit checks` after Tasks 4-5 add lint-staged config, Husky hook, and validation notes.

## Implementation Notes
- [x] Do not add test tasks because this plan was requested with `tests:false`; validation should use existing quality commands only.
- [x] Do not add documentation tasks because this plan was requested with `docs:false`.
- [x] Prefer direct lint-staged commands (`eslint --fix`, `prettier --write`) over `npm run lint` or `npm run format`, because the existing npm scripts are project-wide and not file-scoped.
- [x] Run `npm run typecheck` as a project-level hook step because Vue SFC and TypeScript project references are not reliably validated by passing only staged file paths.
- [x] Keep generated hook scripts portable for POSIX shell usage and avoid branch/worktree changes in Handoff mode.
- [x] Rework 2026-07-09: Pin `lint-staged` to `15.5.2` because it declares `node >=18.12.0`, preserving the existing Node 18/20-compatible project baseline instead of requiring `node >=22.22.1`.

## Next Steps
- [x] Start implementation with `$aif-implement` using `.ai-factory/plans/set-up-pre-commit-checks.md`.
