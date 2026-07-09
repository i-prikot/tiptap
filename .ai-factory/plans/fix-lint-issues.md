<!-- handoff:task:45974cad-531f-4acf-ab70-a705c0521080 -->
# Implementation Plan: Fix lint issues

Branch: main
Created: 2026-07-09

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no
- [ ] Mode: fast
- [ ] Scope: `src/` only; keep changes minimal and do not fix unrelated issues outside this task.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped because this autonomous Handoff plan runs without interactive milestone selection.

## Research Context
No active research summary was found in `.ai-factory/RESEARCH.md`.

## Tasks

### Phase 1: Baseline And Autofix
- [x] Task 1: Capture the current lint baseline for `src/` without changing files.
  - [x] Deliverable: identify the current ESLint warnings/errors in `src/**/*.{ts,vue}` before manual edits.
  - [x] Commands: run `npx eslint src` from `/home/www/tiptap` and save the output mentally/locally for comparison only; do not create report files.
  - [x] Files: no intended file edits in this task.
  - [x] Logging requirements: do not add runtime logging; if lint output points at existing diagnostics, note whether the issue is about `console` usage, unused symbols, Vue template rules, or TypeScript rules.
  - [x] Dependency notes: run before autofix so remaining manual work can be distinguished from auto-formatting changes.

- [x] Task 2: Run ESLint autofix over the whole `src/` tree.
  - [x] Deliverable: apply safe automated fixes produced by ESLint for all source files under `src/`.
  - [x] Commands: prefer `npx eslint src --fix` to keep the task scoped to `src/`; do not use broader formatting commands unless ESLint explicitly requires it.
  - [x] Files: only files under `src/` may be changed; inspect any unexpected edits and revert changes outside `src/` if they appear.
  - [x] Logging requirements: do not introduce new runtime logging; if autofix changes existing `console` calls or diagnostics, keep only `console.warn`/`console.error` allowed by `eslint.config.js`.
  - [x] Dependency notes: depends on Task 1 baseline.

### Phase 2: Manual Lint Cleanup
- [x] Task 3: Re-run lint for `src/` and classify remaining findings.
  - [x] Deliverable: produce a short working list of remaining lint findings grouped by rule and affected file.
  - [x] Commands: run `npx eslint src` after autofix.
  - [x] Files: no intended file edits unless a finding is clearly trivial and safe to fix immediately in `src/`.
  - [x] Logging requirements: do not add logging; preserve useful existing `warn`/`error` diagnostics and remove or refactor disallowed debug `console.log` usage if reported.
  - [x] Dependency notes: depends on Task 2 so only non-autofixable issues remain.

- [x] Task 4: Fix remaining TypeScript and Vue lint issues manually with minimal edits.
  - [x] Deliverable: resolve all remaining ESLint findings in `src/` while preserving behavior.
  - [x] Likely fixes: remove unused imports/variables, prefix intentionally-unused parameters with `_`, narrow simple types where required, adjust Vue template/script lint findings, and replace disallowed debug logging with no-op removal or `console.warn`/`console.error` only when diagnostic behavior is intentional.
  - [x] Files: affected files under `src/`, likely `src/**/*.ts` and `src/**/*.vue` only.
  - [x] Logging requirements: do not add broad verbose instrumentation for this cleanup; when touching existing diagnostics, keep messages actionable and at allowed levels (`WARN`/`ERROR`) without leaking sensitive values.
  - [x] Dependency notes: depends on Task 3 classification; do not address unrelated style, architecture, or feature changes.

### Phase 3: Verification
- [x] Task 5: Verify lint is clean for `src/` and review the diff for scope.
  - [x] Deliverable: `src/` passes ESLint and the diff contains only minimal lint-related edits.
  - [x] Commands: run `npx eslint src`; optionally run `npm run lint` only if the implementer wants to confirm repository-wide lint status after the scoped pass.
  - [x] Files: no new files; review `git diff -- src` and `git status --short`.
  - [x] Logging requirements: confirm no new `console.log` or noisy diagnostics were introduced; any remaining `console.warn`/`console.error` should be intentional and allowed by lint config.
  - [x] Dependency notes: depends on Task 4; if repository-wide lint reports issues outside `src/`, leave them untouched and mention them separately.
