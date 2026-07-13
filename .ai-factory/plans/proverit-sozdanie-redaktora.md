<!-- handoff:task:5e3d4b11-7a56-42b1-88de-dbef42282989 -->
# Implementation Plan: Verify Editor Creation

Branch: `main`
Created: 2026-07-13

## Settings
- [ ] Testing: no additional coverage — the requested integration-test suite is the implementation deliverable.
- [ ] Logging: verbose test diagnostics; do not add runtime logging to production code.
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 2. Тестирование: фундамент (до рефакторинга и пакетизации)"
Rationale: This work delivers the editor-creation integration coverage listed in the milestone.

## Scope and Constraints
- [ ] Create only the editor-creation integration tests; production behavior, application logs, and documentation are out of scope.
- [ ] Preserve the existing `Vitest` + `happy-dom` configuration and automatic Vue Test Utils unmounting in `test/setup.ts`.
- [ ] Exercise the real extension objects assembled by `EditorProvider`, while mocking only the `useEditor` lifecycle, visual child components, and external composables needed to make the component deterministic.
- [ ] If a characterization test exposes an existing production defect, keep the failure reproducible and propose a separate fix instead of expanding this plan's scope.

## Tasks

### Phase 1: Deterministic EditorProvider Harness
- [x] Task 1: Add a focused `EditorProvider` integration-test harness in `test/editor/components/notion/editor-provider.test.ts`.
  - [x] Deliverable: mount `src/editor/components/notion/EditorProvider.vue` with a fixed document ID, isolated `localStorage`, a minimal `Y.Doc`, stubbed visual children, and deterministic mocks for `useUser`, `useToc`, `provideTiptapEditor`, and `@tiptap/vue-3`'s `useEditor`.
  - [x] Expected behavior: the `useEditor` mock captures the full creation options and returns a controllable editor ref; test helpers can invoke `onCreate`, invoke registered editor events, inspect chain calls, and simulate an unsynced collaboration provider's `synced` callback without network access.
  - [x] Expected behavior: reset mocks, DOM state, timers, `localStorage`, and captured callbacks after each case so the serialized Vitest worker cannot leak `hasInteracted-<documentId>` state between scenarios.
  - [x] Files: `test/editor/components/notion/editor-provider.test.ts`.
  - [x] Dependency notes: establishes the fixture API used by Tasks 2 and 3; do not alter `src/editor/components/notion/EditorProvider.vue`, `test/setup.ts`, or `vitest.config.ts` unless the focused suite proves an infrastructure blocker.
  - [x] Logging requirements: add no runtime logs. Use scenario-specific test names and assertion messages that identify the creation branch, document ID, and expected seed action; rely on Vitest's verbose failure output rather than `console` calls.

### Phase 2: Creation and Extension Registration
- [x] Task 2: Characterize successful component mounting and the editor extension configuration.
  - [x] Deliverable: use the Task 1 harness to assert that `EditorProvider` mounts its ready-state shell when the editor ref is available and publishes that ref through `provideTiptapEditor`.
  - [x] Expected behavior: verify the captured `useEditor` options retain the editor CSS class, supplied placeholder, and the complete production extension assembly. Assert the presence and relevant configuration of the project-critical extensions: disabled StarterKit horizontal rule/history behavior, standalone `HorizontalRule`, `TableKit`, `NodeBackground`, `NodeAlignment`, `Indent`, `Image`, `ImageUploadNode`, `TableOfContents`, `ListNormalization`, `TripleClickBlockSelection`, `UniqueID`, `UiState`, and `TocNode`.
  - [x] Expected behavior: mount once without a provider and once with a provider; prove collaboration extensions are absent in the local case and included with the supplied Yjs document/user metadata in the collaboration case, while local StarterKit undo/redo remains enabled and collaborative undo/redo is disabled.
  - [x] Files: `test/editor/components/notion/editor-provider.test.ts`.
  - [x] Dependency notes: depends on Task 1. Keep assertions at the public `useEditor` configuration boundary; do not duplicate unit tests for individual extension command behavior.
  - [x] Logging requirements: add no runtime logs. Name extension assertions by the configuration contract they protect so regressions point to the omitted or misconfigured extension.

### Phase 3: Seed Content and Interaction-State Rules
- [x] Task 3: Cover default-content seeding for empty documents and all `hasInteracted` gates.
  - [x] Deliverable: add a scenario matrix to `test/editor/components/notion/editor-provider.test.ts` around the captured `onCreate` callback and fake editor chain/event API.
  - [x] Expected behavior: with an empty editor and no `hasInteracted-<documentId>` key, assert one content chain writes `defaultContent` with `setMeta('addToHistory', false)`, then runs the start-focus chain.
  - [x] Expected behavior: with `hasInteracted-<documentId>` equal to `true`, or with a non-empty editor, assert that no default-content or focus chain runs. When the registered `update` callback observes a non-empty editor that was initially uninteracted, assert it stores the exact document-specific key as `true`.
  - [x] Expected behavior: for an unsynced provider, assert seeding is deferred until its registered `synced` listener fires and the zero-delay timer is flushed; assert an already-synced provider follows the immediate path. Keep the provider fake limited to the `isSynced` and `on('synced', callback)` contract used by the component.
  - [x] Files: `test/editor/components/notion/editor-provider.test.ts`.
  - [x] Dependency notes: depends on Task 1 and uses the mounted configuration verified in Task 2. This task owns seed timing and storage behavior; it must not change the default-content fixture or document-ID utility.
  - [x] Logging requirements: add no runtime logs. Give each matrix row a descriptive state tuple (empty/non-empty, interaction flag, provider sync state) so failures expose the violated persistence rule immediately.

## Validation
- [x] Run the focused suite: `npm test -- test/editor/components/notion/editor-provider.test.ts`.
- [x] Run `npm run typecheck` only if the new Vue/TypeScript test helpers introduce type-level changes.
- [x] Record the focused command and its observed result in the implementation handoff. Do not add broad coverage, lint, documentation, or unrelated test work.
