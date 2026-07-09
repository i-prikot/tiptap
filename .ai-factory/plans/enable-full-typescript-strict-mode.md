<!-- handoff:task:b1d122d3-f259-4c4a-8f1b-2f51b6032633 -->
# Implementation Plan: Enable full TypeScript strict mode

Branch: main
Created: 2026-07-09

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no
- [ ] Mode: fast
- [ ] Scope: remove the `noImplicitAny` override from `tsconfig.json`, fix only resulting implicit-`any` compile errors, and avoid unrelated strictness or refactor work.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped because this autonomous Handoff plan runs without interactive milestone selection.

## Research Context
No active research summary was found in `.ai-factory/RESEARCH.md`.

## Current Findings
- [ ] `tsconfig.json` already has `"strict": true` but disables part of strict mode with `"noImplicitAny": false`.
- [ ] Probe command `npx vue-tsc --noEmit --noImplicitAny true` currently reports one blocker: `src/editor/extensions/indent.ts:148` has an implicit `any` parameter named `current`.
- [ ] `src/editor/utils/tiptap-utils.ts` defines `updateNodesAttr(..., value: unknown | ((current: unknown) => unknown))`, so the safest first fix is to explicitly type the callback parameter at the call site unless additional errors appear.
- [ ] Existing git state includes unrelated local modification `M .husky/pre-commit`; do not edit or revert it for this task.

## Tasks

### Phase 1: Baseline Strict Diagnostics
- [x] Task 1: Capture the current implicit-`any` baseline before edits.
  - [ ] Deliverable: confirm the exact `noImplicitAny` diagnostics produced by the current codebase.
  - [ ] Commands: run `npx vue-tsc --noEmit --noImplicitAny true` from `/home/www/tiptap` and note only diagnostics related to enabling `noImplicitAny`.
  - [ ] Files: no intended file edits in this task.
  - [ ] Logging requirements: do not add runtime logging; keep compiler output in terminal context only and note file path, line, column, and TypeScript error code for each finding.
  - [ ] Dependency notes: run before changing `tsconfig.json` so implementation can distinguish known blockers from newly introduced issues.

### Phase 2: Enable Full Strict Mode
- [x] Task 2: Remove the `noImplicitAny` override from TypeScript configuration.
  - [ ] Deliverable: TypeScript strict mode is no longer weakened by `"noImplicitAny": false`.
  - [ ] Files: edit `tsconfig.json` only; remove the `"noImplicitAny": false` entry and keep valid JSON formatting with no trailing comma issues.
  - [ ] Expected behavior: `strict: true` now implies `noImplicitAny: true` through the TypeScript compiler defaults.
  - [ ] Logging requirements: do not add runtime logging; if the config edit causes compiler diagnostics, preserve the full diagnostic text in terminal output for the next task.
  - [ ] Dependency notes: depends on Task 1 baseline.

### Phase 3: Fix Strict Compile Errors
- [x] Task 3: Fix implicit-`any` diagnostics caused by enabling `noImplicitAny`.
  - [ ] Deliverable: all implicit-`any` errors introduced by Task 2 are resolved with minimal type annotations or narrow type improvements.
  - [ ] Files: start with `src/editor/extensions/indent.ts`; likely fix is to type the `updateNodesAttr` callback parameter at the indent update call as `unknown` before converting it with `Number(current)`.
  - [ ] Expected behavior: indent, outdent, set-indent, and unset-indent command behavior remains unchanged; only compile-time types become explicit.
  - [ ] Logging requirements: do not add new runtime logging for this type-only cleanup; preserve existing `console.warn`/`console.error` diagnostics in touched files and do not introduce `console.log`.
  - [ ] Dependency notes: depends on Task 2; if additional implicit-`any` errors appear, fix only those directly caused by full strict mode and avoid broader `any` cleanup tracked separately in the roadmap.

### Phase 4: Compile Verification
- [x] Task 4: Verify full strict mode compiles cleanly.
  - [ ] Deliverable: the project typecheck passes with full TypeScript strict mode enabled.
  - [ ] Commands: run `npm run typecheck`; optionally run `npm run build` only if typecheck passes and a full production compile sanity check is desired.
  - [ ] Files: review `git diff -- tsconfig.json src/editor/extensions/indent.ts` and `git status --short` to confirm the diff is scoped to this task plus any pre-existing unrelated changes.
  - [ ] Logging requirements: do not add runtime logging; include compiler command output in the implementation summary and explicitly call out any remaining diagnostics if verification fails.
  - [ ] Dependency notes: depends on Task 3; do not run or add automated tests because this plan is configured with `Testing: no`.
