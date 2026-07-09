<!-- handoff:task:8a1045aa-4832-4723-9b40-c18dc21ba52d -->
# Implementation Plan: Configure Prettier

Branch: main
Created: 2026-07-08

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no
- [ ] Mode: fast
- [ ] Plan file: `.ai-factory/plans/configure-prettier.md`

## Roadmap Linkage
Milestone: "Этап 0. Инфраструктура качества (фундамент)"
Rationale: This task directly implements the roadmap item "Подключить Prettier и согласовать его правила с ESLint" and supports the existing ESLint quality baseline.

## Research Context
Source: none

Goal: Add Prettier formatting support for the Vue 3 + TypeScript + Vite codebase and make ESLint formatting-neutral to prevent rule conflicts.
Constraints: Do not add tests or documentation tasks; keep changes inside `/home/www/tiptap`; preserve the current flat ESLint config style; avoid branch or worktree changes in Handoff mode.
Decisions: Use Prettier as the formatter and `eslint-config-prettier` as the ESLint conflict-disabling layer; add npm scripts for formatting and format checks.
Open questions: none

## Tasks

### Phase 1: Dependencies And Configuration
- [x] Task 1: Add Prettier tooling dependencies in `package.json` and `package-lock.json`.
  - [x] Deliverable: Add `prettier` and `eslint-config-prettier` to `devDependencies` using npm so the lockfile remains consistent.
  - [x] Expected behavior: `npm install` restores both formatter dependencies reproducibly without changing runtime dependencies.
  - [x] Files: `package.json`, `package-lock.json`
  - [x] Logging requirements: No application runtime logging is needed; capture the package manager command output, warnings, and dependency resolution errors in the implementation notes if installation fails.
  - [x] Dependencies: none

- [x] Task 2: Create project Prettier configuration and ignore rules.
  - [x] Deliverable: Add `.prettierrc.json` with formatting choices aligned to the current code style, including single quotes and no semicolons, and add `.prettierignore` for generated, dependency, cache, secret, and AI-factory artifact paths.
  - [x] Expected behavior: Prettier formats source/config files consistently while skipping `node_modules/`, `dist/`, caches, environment files, and `.ai-factory/` artifacts.
  - [x] Files: `.prettierrc.json`, `.prettierignore`
  - [x] Logging requirements: No application runtime logging is needed; record any Prettier config parse errors or ignored-path surprises from CLI output during validation.
  - [x] Dependencies: Task 1

### Phase 2: ESLint Integration And Scripts
- [x] Task 3: Disable ESLint formatting conflicts via the flat config.
  - [x] Deliverable: Import `eslint-config-prettier` in `eslint.config.js` and append it after Vue/TypeScript/project rules so conflicting stylistic rules are turned off last.
  - [x] Expected behavior: `npm run lint` continues to report code-quality issues, while Prettier owns whitespace, quote wrapping, line wrapping, and other formatting concerns.
  - [x] Files: `eslint.config.js`
  - [x] Logging requirements: No application runtime logging is needed; capture ESLint config/load errors and rule conflict diagnostics from `npm run lint` output if validation fails.
  - [x] Dependencies: Task 1

- [x] Task 4: Add formatting npm scripts and run non-test validation.
  - [x] Deliverable: Add `format` and `format:check` scripts in `package.json`, then validate with `npm run format:check`, `npm run lint`, `npm run typecheck`, and optionally `npm run build` if time allows.
  - [x] Expected behavior: Developers can format the repo with one command and CI/local checks can verify formatting without modifying files.
  - [x] Files: `package.json`
  - [x] Logging requirements: No application runtime logging is needed; keep verbose command output for formatter/linter/typechecker failures, including exact file paths and commands to rerun.
  - [x] Dependencies: Tasks 2 and 3

## Implementation Notes
- [x] Preferred Prettier baseline: `semi: false`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`, `arrowParens: "always"`, and Vue defaults unless validation reveals a project-specific mismatch.
- [x] Place `eslint-config-prettier` last in the exported ESLint flat-config array so it can disable conflicting rules from `@eslint/js`, `typescript-eslint`, `eslint-plugin-vue`, and local rule groups.
- [x] Do not add test tasks because this plan was requested with `tests:false`; use formatter/linter/typechecker/build validation only.
- [x] Do not add documentation tasks because this plan was requested with `docs:false`.

## Next Steps
- [x] Start implementation with `$aif-implement` using `.ai-factory/plans/configure-prettier.md`.
