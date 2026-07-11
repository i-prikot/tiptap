<!-- handoff:task:ef666d11-ea1a-4034-b2d5-f2a4f34864eb -->
# Implementation Plan: Cover `tiptap-utils`

Branch: main
Created: 2026-07-10

## Settings
- [ ] Testing: no additional test scope beyond the requested focused unit suite; the implementation deliverable itself is the new Vitest test file.
- [ ] Logging: verbose test-run diagnostics during implementation; add no runtime application logging because this is a test-only change.
- [ ] Docs: no user-facing or project-documentation changes.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff default; this work directly advances the unchecked pure-utilities test coverage item under "Этап 2. Тестирование: фундамент".

## Current State
- [x] Vitest is configured with `happy-dom` in `vitest.config.ts`, and `test/setup.ts` restores Vitest mocks after every test; existing `*.test.ts` specs are present in `src/editor/utils/__tests__/`.
- [x] The requested implementation target is `src/editor/utils/tiptap-utils.ts`; its public helpers include `clamp`, `parseShortcutKeys`, `sanitizeUrl`, and asynchronous `handleImageUpload`.
- [x] `handleImageUpload()` uses 500 ms timer intervals, emits progress from `0` through `100` in increments of `10`, rejects absent/oversized/cancelled uploads, and returns a fixed placeholder URL.
- [x] Existing unrelated working-tree changes include `.husky/pre-commit` and other `.ai-factory` plans/rules; do not modify, stage, revert, or fold them into this task.

## Scope
- [x] Add a colocated Vitest unit suite for the four named `tiptap-utils.ts` functions only.
- [x] Use isolated browser-platform stubs and fake timers for platform-dependent shortcut formatting and asynchronous upload progress.
- [x] Preserve production utility behavior, runtime logging, Vitest configuration, npm scripts, documentation, and unrelated files.

## Tasks

### Phase 1: Deterministic Synchronous Utility Coverage
- [x] Task 1: Add the synchronous `clamp`, `parseShortcutKeys`, and `sanitizeUrl` cases to a dedicated utility spec.
  - [ ] Deliverable: create `src/editor/utils/__tests__/tiptap-utils.test.ts` using Vitest's `describe`, `it`, `expect`, and controlled `navigator.platform` stubs.
  - [ ] Expected behavior: verify `clamp()` returns the supplied value inside the inclusive range and clamps values below `min` and above `max` to the respective boundary.
  - [ ] Expected behavior: verify `parseShortcutKeys()` returns `[]` for absent input; trims and splits default `+`-delimited shortcuts; formats non-macOS modifier/text keys; maps macOS modifiers and special keys to symbols; and honors custom delimiters and `capitalize: false` for ordinary keys.
  - [ ] Expected behavior: verify `sanitizeUrl()` accepts absolute and base-resolved relative URLs using built-in schemes, accepts caller-provided string/object schemes, and returns `#` for dangerous schemes and malformed URLs. Assert returned normalized `URL.href` values rather than input strings where URL normalization applies.
  - [ ] Files: `src/editor/utils/__tests__/tiptap-utils.test.ts`.
  - [ ] Dependency notes: none; establish per-test cleanup for platform stubs before covering the asynchronous helper.
  - [ ] Logging requirements: add no runtime logs. Use descriptive test names and focused assertions so Vitest output identifies the failed URL, shortcut-platform, or numeric-boundary contract.

### Phase 2: Image Upload Validation, Progress, and Cancellation
- [x] Task 2: Cover all public `handleImageUpload()` outcomes with fake timers and realistic `File` fixtures.
  - [ ] Deliverable: extend `src/editor/utils/__tests__/tiptap-utils.test.ts` with `File` fixtures, `vi.useFakeTimers()`, and a progress spy; restore real timers and clear pending timers after each upload case.
  - [ ] Expected behavior: verify a missing file rejects with its documented error, a file larger than `MAX_FILE_SIZE` rejects immediately, and a file exactly at the size limit is accepted.
  - [ ] Expected behavior: verify a valid upload waits through eleven 500 ms intervals, invokes the callback once for every progress value `[0, 10, ..., 100]` in order, and resolves with `/images/tiptap-ui-placeholder-image.jpg`.
  - [ ] Expected behavior: verify an already-aborted signal rejects without scheduling progress, and a signal aborted after an emitted progress update rejects on the next loop check without emitting subsequent progress values.
  - [ ] Files: `src/editor/utils/__tests__/tiptap-utils.test.ts`.
  - [ ] Dependency notes: depends on Task 1's cleanup discipline so fake timers and navigator stubs cannot leak into subsequent cases.
  - [ ] Logging requirements: add no runtime logs. Name timer assertions by progress/cancellation phase and preserve failing Vitest output as diagnostic evidence in the implementation summary.

### Phase 3: Targeted Verification and Isolation
- [x] Task 3: Execute the focused suite and confirm the patch remains limited to the requested unit tests.
  - [ ] Deliverable: run `npm test -- src/editor/utils/__tests__/tiptap-utils.test.ts` and `npm run typecheck`; record the commands and observed outcomes, including the required RED and GREEN evidence, in the implementation summary.
  - [ ] Expected behavior: first run the targeted test(s) before production changes (no production change is expected for this test-only task); the final focused suite and typecheck pass under the configured `happy-dom` environment, with no pending timers or leaked globals.
  - [ ] Expected behavior: inspect the final diff to confirm only `src/editor/utils/__tests__/tiptap-utils.test.ts` is added for the functional change and pre-existing unrelated working-tree changes remain untouched.
  - [ ] Files: `src/editor/utils/__tests__/tiptap-utils.test.ts`.
  - [ ] Dependency notes: depends on Tasks 1–2; if a test exposes a production defect, stop after documenting the failing contract and propose a separate source-fix task rather than broadening this task.
  - [ ] Logging requirements: add no runtime logs. Retain targeted test/typecheck command output as diagnostics and explicitly identify any unrelated pre-existing changes that were left untouched.

## Acceptance Criteria
- [x] `src/editor/utils/__tests__/tiptap-utils.test.ts` exists and uses the repository's Vitest + `happy-dom` setup.
- [x] `clamp()` is covered for in-range, lower-bound, and upper-bound results.
- [x] `parseShortcutKeys()` is covered for empty input, trimming/default splitting, macOS/non-macOS formatting, special modifier symbols, custom delimiters, and capitalization control.
- [x] `sanitizeUrl()` is covered for safe absolute/relative URLs, allowed custom protocols, dangerous schemes, and invalid input.
- [x] `handleImageUpload()` is covered for missing/oversized/limit-size files, complete progress and placeholder resolution, pre-abort, and mid-upload abort behavior using isolated fake timers.
- [x] The focused Vitest command and `npm run typecheck` pass, with no production code, docs, test configuration, npm script, or unrelated working-tree modifications.

## Out of Scope
- [ ] Tests for other exports from `tiptap-utils.ts`, including ProseMirror selection/node helpers, schema checks, `chunkArray()`, and mark attributes.
- [ ] Tests or changes for `table-utils.ts`, `table-actions.ts`, `selection-utils.ts`, `trigger-utils.ts`, composables, extensions, Vue components, or browser/e2e flows.
- [ ] Changes to `src/editor/utils/tiptap-utils.ts`, runtime logging, `vitest.config.ts`, `test/setup.ts`, CI, package scripts, documentation, roadmap, or unrelated working-tree changes.
