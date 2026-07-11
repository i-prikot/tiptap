<!-- handoff:task:41397d57-69e4-47a9-982d-7d5504c17aba -->
# Implementation Plan: Покрыть чистые утилиты

Branch: main
Created: 2026-07-10

## Settings
- [ ] Testing: the requested deliverable is limited to unit tests for the four named utilities; do not expand coverage to adjacent utilities, components, or integration flows.
- [ ] Logging: use verbose test-run diagnostics while implementing; add no runtime application logging because this is a test-only change.
- [ ] Docs: no user-facing or project-documentation changes.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff default; this work directly addresses the unchecked pure-utilities test item under "Этап 2. Тестирование: фундамент".

## Current State
- [x] Vitest uses `happy-dom` with one non-isolated thread in `vitest.config.ts`, with idempotent shared cleanup in `test/setup.ts`; no existing `*.test.ts` or `*.spec.ts` files were found outside dependencies.
- [x] The target source modules are `src/editor/utils/document-id.ts`, `src/editor/utils/user-utils.ts`, `src/editor/utils/throttle.ts`, and `src/editor/utils/toc-utils.ts`.
- [x] `src/editor/utils/__tests__/` is excluded from production coverage and is the appropriate colocated location for the new specs.
- [x] Existing unrelated working-tree changes include `.husky/pre-commit` and other `.ai-factory` artifacts; do not modify, stage, revert, or fold them into this task.

## Scope
- [x] Add deterministic unit tests for the public behavior and boundary cases of the four requested utility modules.
- [x] Use mocked randomness, fake timers, browser history, computed styles, scroll metrics, and minimal ProseMirror state/view fixtures where needed.
- [x] Keep runtime application logging, documentation, unrelated test suites, and unrelated working-tree changes unchanged. Rework exception: replace the hanging `jsdom` environment with `happy-dom`, serialize the test worker, and make TOC window detection environment-agnostic.

## Tasks

### Phase 1: URL, User, and Storage Utilities
- [x] Task 1: Add focused tests for document ID parsing and user utility contracts.
  - [x] Deliverable: create `src/editor/utils/__tests__/document-id.test.ts` and `src/editor/utils/__tests__/user-utils.test.ts` using Vitest and the existing DOM setup.
  - [x] Expected behavior: verify `getDocumentId()` returns the final pathname segment for nested paths and `default` for root or a trailing slash, without being affected by URL query/hash data.
  - [x] Expected behavior: make `Math.random()` deterministic to cover two- and three-part generated names, palette-based colors, UUID v4 version/variant and hexadecimal format, and repeatable avatar selection plus null/undefined/empty-name fallback.
  - [x] Expected behavior: cover `getStoredOrCreate()` returning a stored value without calling its factory, calling the factory when absent, and bypassing storage when `forceNew` is true; reset `localStorage`, URL state, and mocks between cases.
  - [x] Files: `src/editor/utils/__tests__/document-id.test.ts`, `src/editor/utils/__tests__/user-utils.test.ts`.
  - [x] Dependency notes: none; these tests establish the standard deterministic mock and cleanup style for the remaining utility suites.
  - [x] Logging requirements: add no runtime logs. If a scenario fails during implementation, retain the failing Vitest assertion/output as diagnostic evidence and report the affected public contract in the implementation summary.

### Phase 2: Throttle Timing Semantics
- [x] Task 2: Add fake-timer tests for leading, trailing, boundary, and cancellation behavior of `throttle()`.
  - [x] Deliverable: create `src/editor/utils/__tests__/throttle.test.ts` with an explicit nonzero fake system time and per-test restoration of real timers.
  - [x] Expected behavior: verify default leading invocation occurs immediately, rapid calls are coalesced into one trailing call using the latest arguments, and the trailing call runs only after the remaining wait interval.
  - [x] Expected behavior: verify `leading: false` defers the initial invocation, `trailing: false` suppresses queued work, calls at the wait boundary are handled once, and `cancel()` clears pending work and timer state.
  - [x] Files: `src/editor/utils/__tests__/throttle.test.ts`.
  - [x] Dependency notes: independent of Task 1, but follows its local mock-cleanup discipline to prevent fake timers or spies leaking into other suites.
  - [x] Logging requirements: add no runtime logs. Use named spies and precise timer assertions so Vitest output identifies the timing mode and invocation sequence when a test fails.

### Phase 3: TOC Normalization and Browser Navigation
- [x] Task 3: Add DOM and minimal ProseMirror fixture tests for the public helpers in `toc-utils.ts`.
  - [x] Deliverable: create `src/editor/utils/__tests__/toc-utils.test.ts` with typed TOC fixtures, controlled DOM rectangles/scroll metrics, and stubs for `getComputedStyle`, `scrollTo`, and history updates.
  - [x] Expected behavior: verify `normalizeHeadingDepths()` for empty input, rebased heading levels, repeated/decreasing levels, skipped levels without depth holes, and `originalLevel` precedence over `level`.
  - [x] Expected behavior: verify `getScrollableAncestor()` returns the nearest overflowing `auto`/`scroll` parent and falls back to `window` for non-scrollable ancestors.
  - [x] Expected behavior: verify `selectNodeAndHideFloating()` is a no-op without an editor and otherwise dispatches a `NodeSelection` transaction carrying `HIDE_FLOATING_META`.
  - [x] Expected behavior: verify `navigateToHeading()` handles a missing DOM node, skips scrolling for a visible heading, computes window and element-container offsets correctly for off-screen headings, applies default/custom behavior, selects a supplied editor position, and replaces the URL hash when an ID exists.
  - [x] Files: `src/editor/utils/__tests__/toc-utils.test.ts`.
  - [x] Dependency notes: depends on the existing DOM configuration only; do not create a browser/e2e test or change the TOC composables.
  - [x] Logging requirements: add no runtime logs. Keep fixture names descriptive and assert exact scroll/history/dispatch payloads so failures expose the browser-navigation branch that regressed.

### Phase 4: Targeted Verification and Isolation
- [x] Task 4: Run the requested test suites and verify the rework remains type-safe.
  - [x] Deliverable: execute the four requested specs and `npm run typecheck`; record commands and outcomes in the implementation summary.
  - [x] Expected behavior: all four new specs pass in the configured happy-dom environment, fake timers and global browser mocks are restored cleanly, and TypeScript accepts the fixtures under strict compiler settings.
  - [x] Files: `src/editor/utils/__tests__/document-id.test.ts`, `src/editor/utils/__tests__/user-utils.test.ts`, `src/editor/utils/__tests__/throttle.test.ts`, `src/editor/utils/__tests__/toc-utils.test.ts`.
  - [x] Dependency notes: depends on Tasks 1–3; do not broaden test scope. Rework exception: `navigateToHeading()` now compares directly with `window`, preserving the browser contract and avoiding cross-realm constructor mismatch.
  - [x] Logging requirements: add no runtime logs. Preserve command output as development diagnostics and explicitly confirm that unrelated working-tree changes remain untouched.

## Rework Verification (2026-07-10)
- [x] Resolved worker startup hang by replacing `jsdom` with `happy-dom`, using one non-isolated threads worker, and making `enableAutoUnmount()` idempotent across setup imports.
- [x] `npm test -- src/editor/utils/__tests__/document-id.test.ts src/editor/utils/__tests__/user-utils.test.ts src/editor/utils/__tests__/throttle.test.ts src/editor/utils/__tests__/toc-utils.test.ts --reporter=verbose --no-color` — 4 files passed, 26 tests passed, 54.15s.
- [x] `npm run typecheck`, `npx prettier --check vitest.config.ts test/setup.ts src/editor/utils/toc-utils.ts package.json`, and targeted `npx eslint` passed.

## Acceptance Criteria
- [x] Dedicated Vitest specs exist under `src/editor/utils/__tests__/` for all four requested utility modules.
- [x] Document ID, randomized user helpers, avatar/storage behavior, and storage bypass semantics are deterministic and covered by main and boundary scenarios.
- [x] Throttle behavior is covered with isolated fake timers for default modes, option combinations, boundary timing, latest trailing arguments, and cancellation.
- [x] TOC helpers are covered for level normalization, scroll-parent lookup, safe node selection/meta dispatch, scrolling branches, options, and URL hash updates.
- [x] The four requested specs pass alongside `npm run typecheck`; the rework changes only the DOM test environment, its shared setup, the TOC window guard, and lockfile metadata.

## Out of Scope
- [ ] Unit tests for `tiptap-utils.ts`, `table-utils.ts`, `table-actions.ts`, `selection-utils.ts`, `trigger-utils.ts`, suggestion utilities, composables, or Vue components.
- [x] Rework-only changes to `toc-utils.ts`, Vitest configuration, shared test setup, and the `happy-dom` dev dependency are limited to resolving the test-worker startup failure; no runtime logging, CI, or npm scripts changed.
- [x] User-facing documentation and roadmap edits.
