<!-- handoff:task:0b5170cd-d242-4afa-8e2b-c4a9f5e1d13e -->
# Implementation Plan: Добавить тестовые npm-скрипты

Branch: main
Created: 2026-07-10

## Settings
- [x] Testing: no
- [x] Logging: verbose
- [x] Docs: no

## Roadmap Linkage
Milestone: "Этап 2. Тестирование: фундамент (до рефакторинга и пакетизации)"
Rationale: This task directly completes the roadmap item "Добавить npm-скрипты `test`, `test:watch`, `test:coverage`".

## Current State
- [x] `package.json` already contains `test`, `test:watch`, and `test:coverage` scripts.
- [x] `vitest.config.ts` already configures Vitest with `jsdom`, `@vitejs/plugin-vue`, `passWithNoTests`, and V8 coverage output.
- [x] `package.json` already includes `vitest`, `@vitest/coverage-v8`, `jsdom`, and `@vue/test-utils` in `devDependencies`.
- [x] Existing unrelated working-tree change detected: `.husky/pre-commit`; do not modify or revert it for this task.

## Tasks

### Phase 1: Script Alignment
- [x] Task 1: Verify and normalize npm test scripts in `package.json`.
  - [x] Deliverable: `package.json` has exactly these standard scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, and `"test:coverage": "vitest run --coverage"`.
  - [x] Expected behavior: `npm run test` runs Vitest once, `npm run test:watch` starts Vitest watch mode, and `npm run test:coverage` generates coverage through the configured V8 provider.
  - [x] Files: `package.json`.
  - [x] Dependency notes: none.
  - [x] Logging requirements: do not add runtime application logging; rely on npm/Vitest CLI output. If a script value is changed, note the before/after values in the implementation summary.

### Phase 2: Dependency Consistency
- [x] Task 2: Ensure coverage script dependencies are present and lockfile stays consistent.
  - [x] Deliverable: `@vitest/coverage-v8` remains in `devDependencies`; update `package-lock.json` only if dependency metadata changes are required.
  - [x] Expected behavior: `test:coverage` can resolve the V8 coverage provider without prompting for an extra package install.
  - [x] Files: `package.json`, `package-lock.json`.
  - [x] Dependency notes: depends on Task 1 because dependency changes are only needed if script normalization reveals missing tooling.
  - [x] Logging requirements: do not add runtime application logging; record any package or lockfile changes in the implementation summary with package names and versions.

### Phase 3: Handoff Closure
- [x] Task 3: Confirm no unrelated files are touched while preserving existing local edits.
  - [x] Deliverable: the final diff for this task is limited to `package.json` and, only if necessary, `package-lock.json`; `.husky/pre-commit` remains untouched.
  - [x] Expected behavior: the implementation is a minimal npm-script change or a no-op if the scripts already match the required values.
  - [x] Files: `package.json`, `package-lock.json`.
  - [x] Dependency notes: depends on Tasks 1 and 2.
  - [x] Logging requirements: no runtime logging changes; include a concise final note that the scripts were already present or list the exact script updates made.

## Acceptance Criteria
- [x] `package.json` contains `test`, `test:watch`, and `test:coverage` with Vitest commands.
- [x] Coverage command uses `vitest run --coverage` and is backed by `@vitest/coverage-v8`.
- [x] No documentation files are changed for this task.
- [x] No new test files are created for this task.
- [x] Unrelated `.husky/pre-commit` changes are preserved and not included in task edits.

## Implementation Notes
- [x] This plan intentionally does not add test-writing tasks because the request set `tests:false`.
- [x] This plan intentionally does not add documentation tasks because the request set `docs:false`.
- [x] If the current repository state still matches the reconnaissance above, implementation may complete as a verified no-op with no file changes.
