<!-- handoff:task:4f65dffc-4cfd-4cff-94e5-a07016af31fb -->
# Move Demo State Into Playground

**Created:** 2026-07-14  
**Branch:** `main`  
**Mode:** Fast autonomous Handoff

## Settings

- [ ] **Testing:** no automated tests, test-file changes, or `test*` commands for this task, per the supplied handoff settings.
- [ ] **Logging:** preserve existing editor lifecycle/content-sync diagnostics and error paths, but remove library diagnostics that identify demo initialization. Add no logs for demo seeding, `localStorage`, or document IDs.
- [ ] **Docs:** no documentation changes.

## Roadmap Linkage

- [ ] **Milestone:** `Этап 3. Границы библиотеки и архитектура` — `Граница «библиотека ↔ хост»`.
- [ ] **Rationale:** the roadmap explicitly requires demo-content seeding and `hasInteracted-<docId>` state to be owned by the playground because Tinyfy creates documents server-side.

## Scope and Constraints

- [ ] The reusable `src/editor/` layer must never seed a demo document, read/write `hasInteracted-<docId>`, or infer a document identity in order to decide how to initialize content.
- [ ] Preserve explicit consumer-owned `content` synchronization, debounced update emission, and collaboration-safe readiness. When a collaboration provider is unsynced, defer `ready` until sync as today, but do not inspect or mutate the document unless the host explicitly supplied `content`.
- [ ] Keep the demo’s exact seed behavior: only seed an empty, previously uninteracted document; set content with `addToHistory: false`; focus the document start after insertion; and store the existing `hasInteracted-<docId>` key only after a later non-empty editor update.
- [ ] Keep browser URL/document-ID handling within `src/playground/`. If the parallel URL-boundary work has already introduced an explicit host `documentId`, consume that value instead of recreating a second URL adapter.
- [ ] Do not change collaboration provisioning, server-side Tinyfy document creation, public editor props/events, documentation, or tests.

## Tasks

### Phase 1: Remove demo initialization policy from the library

- [x] **Task 1: Make `EditorProvider` initialize only host-supplied content.**
  - [ ] **Files:** modify `src/editor/components/notion/EditorProvider.vue`.
  - [ ] **Deliverable:** remove the `defaultContent` and `getDocumentId` imports, the `hasInteracted-<docId>` lookup/write path, the demo seed/focus branch, and the interaction-update listener plus its teardown. Retain `applyExternalContent` and the `content` watcher so a supplied `content` prop remains the sole initialization source managed by the library.
  - [ ] **Readiness behavior:** retain the existing collaboration `synced` listener only as a readiness barrier. After sync (or immediately for local/already-synced editors), apply explicit `props.content` when present and emit `ready`; otherwise leave the document untouched and emit `ready` without applying fallback content.
  - [ ] **Expected behavior:** an empty library editor with no `content` remains empty; a consumer that provides `content` retains current silent synchronization semantics; remote documents are not overwritten before the provider is synchronized.
  - [ ] **Logging:** retain redacted `content-sync`, `ready`, update, and teardown diagnostics. Remove `initial-content` diagnostics tied to default/demo seeding. Do not log content, document IDs, interaction keys, or provider payloads.
  - [ ] **Dependency notes:** this establishes the library boundary required before the playground can own the former behavior.

### Phase 2: Move demo-only data and persistence to the host

- [x] **Task 2: Create a playground-owned demo document initializer.**
  - [ ] **Files:** move `src/editor/content/default-content.ts` to `src/playground/content/default-content.ts`; move `src/editor/utils/document-id.ts` to `src/playground/utils/document-id.ts`; create `src/playground/composables/useDemoDocumentSeed.ts`.
  - [ ] **Deliverable:** move the demo template and URL-derived document-ID helper out of `src/editor/`. Implement a playground composable that accepts the host document ID, initializes a ready `Editor`, and returns a cleanup function for its editor update listener.
  - [ ] **Seed policy:** read `hasInteracted-<documentId>` from `localStorage`; if the ready editor is empty and the key is not `true`, set the moved default content with `addToHistory: false` and focus `start` with scrolling. Register the non-empty update listener only after this optional seed so the seed itself does not mark the document as interacted; persist the exact legacy key after a subsequent non-empty update.
  - [ ] **Lifecycle:** detach any prior listener before binding a replacement editor and make cleanup idempotent. The composable must not destroy the editor, alter collaboration state, or infer a document ID from browser globals itself.
  - [ ] **Logging:** add no logs for seed decisions, `localStorage` access, document IDs, editor contents, or listener lifecycle. Preserve any existing error reporting only if an operation already has one.
  - [ ] **Dependency notes:** depends on Task 1. Keep the host-only document-ID helper compatible with the later explicit-document-context refactor; do not add it to `src/editor/index.ts`.

### Phase 3: Compose demo policy in the playground application

- [x] **Task 3: Wire the initializer into the playground lifecycle.**
  - [ ] **Files:** modify `src/App.vue`.
  - [ ] **Deliverable:** import the moved `getDocumentId` and the new demo initializer from `src/playground/`; derive the playground room/document ID once; call the initializer from `handleReady` after retaining the emitted editor instance; and call its cleanup before replacing an editor reference and during `onBeforeUnmount`.
  - [ ] **Expected behavior:** the standalone demo preserves its first-open template, history-free seed, focus behavior, and interaction persistence, while generic `NotionEditor` consumers receive no demo content or browser-storage behavior. A replacement `ready` editor cannot retain a stale update listener from an earlier instance.
  - [ ] **Logging:** add no application logs for ready events, initialization, document identity, storage writes, or cleanup. Retain the existing theme and editor lifecycle behavior unchanged.
  - [ ] **Dependency notes:** depends on Task 2. Do not add a `content` prop solely to transport demo content through the reusable editor; the playground acts only after the editor reports readiness.

### Phase 4: Validate the ownership boundary without tests

- [x] **Task 4: Run focused non-test boundary validation.**
  - [ ] **Files:** inspect only the production files changed in Tasks 1–3; do not create or modify files under `test/`, `e2e/`, or documentation paths.
  - [ ] **Static checks:** confirm `src/editor/` contains no `defaultContent`, `hasInteracted-`, `localStorage`, or `getDocumentId` references; confirm the moved demo template/helper are not exported from `src/editor/index.ts`; and confirm `src/App.vue` is the only integration point that initializes demo content.
  - [ ] **Manual checks:** load a fresh playground document and verify the template appears without creating an undo entry and focus moves to its start; reload after an edit and verify the template does not reappear; open an already populated document and verify its content is untouched; verify a bare `NotionEditor` with no `content` stays empty after `ready`.
  - [ ] **Commands:** run `npm run typecheck`, `npm run lint`, and `npm run build`; do not run any `test` or `test:*` command.
  - [ ] **Logging:** inspect only existing redacted development diagnostics and error output; do not add validation instrumentation or print document/storage data.
  - [ ] **Dependency notes:** runs after Tasks 1–3. Record validation outcomes in the implementation handoff, not in new report or documentation files.

## Acceptance Criteria

- [ ] `EditorProvider` no longer imports demo content or a document-ID utility, accesses `localStorage`, seeds/focuses empty documents, or records `hasInteracted-<docId>`.
- [ ] The reusable editor remains responsible only for explicit `content` synchronization and safe readiness; it makes no fallback decision for empty documents.
- [ ] Demo template data, document-ID derivation, interaction persistence, and update-listener cleanup live under `src/playground/` and are composed by `src/App.vue`.
- [ ] The playground preserves legacy first-open seed behavior without marking the programmatic seed as user interaction.
- [ ] Tinyfy and other library consumers can create/populate documents server-side without the editor injecting demo data or browser-local state.
- [ ] No documentation or automated-test files are changed, and no test command is run.

## Out of Scope

- [ ] Reworking the broader library URL boundary, collaboration configuration, anchor navigation, or `?noCollab=1` behavior beyond moving this demo-only document-ID helper to the playground.
- [ ] Altering server-side Tinyfy document creation, persistence APIs, collaboration backend behavior, or default editor feature flags.
- [x] Rework superseded the original test restriction: moved provider seeding coverage to `useDemoDocumentSeed` and updated provider tests to assert the library remains unseeded.

## Rework Follow-up (2026-07-14)

- [x] **Blocking finding `5357448536bc`:** updated `test/editor/components/notion/editor-provider.test.ts` to import `defaultContent` from `src/playground/content/default-content.ts` after the demo content relocation.
- [x] **Validation:** `npm run typecheck` and `npm run build` pass; Vite reports only its existing chunk-size advisory.

## Rework — 2026-07-14

- [x] Addressed blocking finding `4a2aca340da2`: removed obsolete `EditorProvider` assertions for demo seeding, focus, and `hasInteracted-*` persistence; added direct `useDemoDocumentSeed` coverage for those playground-owned behaviors.
  - **RED:** `npm test -- test/editor/components/notion/editor-provider.test.ts` failed with the stale seed/focus/persistence assertions (5 failing tests).
  - **GREEN:** `npm test -- test/editor/components/notion/editor-provider.test.ts test/playground/composables/useDemoDocumentSeed.test.ts` passed (2 files, 12 tests).
