<!-- handoff:task:c0fb54ca-5a8c-4036-af2b-2b28fa0747d1 -->
# Reduce unnecessary editor rerenders

**Branch:** `main`  
**Created:** 2026-07-22  
**Mode:** fast

## Settings

- [ ] **Testing:** no — do not add or change automated tests for this task.
- [ ] **Logging:** verbose development diagnostics for subscription lifecycle and decisions; do not log every editor transaction or selection event on the hot path.
- [ ] **Docs:** no — no documentation checkpoint or documentation changes.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** Skipped in autonomous Handoff mode. The work directly supports the existing Stage 7 performance item for eliminating unnecessary editor rerenders.

## Audit Summary

- [ ] `useUiEditorState` currently copies every `UiEditorState` field into a reactive object on **every** editor `transaction`; it is mounted by `EditorContentArea`, `DragContextMenu`, and `NotionToolbarFloating`, although each uses only a subset of fields.
- [ ] `UiState` command handlers mutate extension storage directly, so a dedicated typed editor event is the reliable boundary for reactive UI updates; the project already follows this pattern with `tableHandleState`.
- [ ] `TableSelectionOverlay`, `CollabUsers`, and `useUndoRedo` listen to all transactions. Keep subscriptions only where required, but prevent reactive writes and visual refreshes unless the relevant table metadata, collaborator list, or command availability actually changed.
- [ ] Existing `selectionUpdate` listeners are generally component-local and should remain local when they drive that component's selection-dependent visibility or geometry.

## Tasks

### Phase 1 — Emit precise UI-state changes

- [x] **Add a typed, changed-key `uiStateUpdate` editor event.**
  - [ ] **Files:** `packages/schema/src/extensions/ui-state.ts`, `packages/schema/src/types/tiptap-augmentations.ts`
  - [ ] **Deliverable:** Centralize `UiState` storage writes behind a helper that compares the previous and next value, mutates only when the value changes, and emits one typed event containing the changed keys and their current values. Cover single-field commands and `resetUiState`; preserve existing command names and storage defaults.
  - [ ] **Expected behavior:** UI commands notify only consumers of actual UI-state mutations, without relying on unrelated ProseMirror transactions. No event is emitted for a no-op write.
  - [ ] **Logging:** Add development-only debug diagnostics for extension initialization and command/event lifecycle. Avoid per-event console output in production and avoid transaction-level logging.
  - [ ] **Dependencies:** None.

### Phase 2 — Make shared UI consumers field-selective

- [x] **Replace full `uiState` snapshots with keyed reactive subscriptions.**
  - [ ] **Files:** `packages/editor/src/composables/useUiEditorState.ts`, `packages/editor/src/composables/index.ts`
  - [ ] **Deliverable:** Refactor the composable to accept a typed list of requested `UiEditorState` keys and subscribe to `uiStateUpdate`, updating only selected fields included in the event payload. Preserve editor replacement/unmount cleanup and reset selected values when no editor is available.
  - [ ] **Expected behavior:** A consumer depending on `isDragging` does not receive reactive writes for AI or comment state, and unrelated document transactions do not update the composable.
  - [ ] **Logging:** Use the existing development-diagnostics pattern to report subscription creation/removal and selected keys; do not log individual state updates.
  - [ ] **Dependencies:** Phase 1.

- [x] **Migrate mounted editor UI to the smallest required state slices.**
  - [ ] **Files:** `packages/editor/src/components/notion/notion-editor/EditorContentArea.vue`, `packages/editor/src/components/ui/drag-context-menu/DragContextMenu.vue`, `packages/editor/src/components/ui/toolbar/NotionToolbarFloating.vue`
  - [ ] **Deliverable:** Request only the fields each component reads: AI completion fields for `EditorContentArea`; `aiGenerationActive` and `isDragging` for `DragContextMenu`; and AI/comment/drag/lock fields for `NotionToolbarFloating`. Keep existing visible behavior, including post-drag suppression and AI acceptance.
  - [ ] **Expected behavior:** Typing and unrelated editor transactions do not rerender these components through `uiState`; a relevant command still updates the affected component immediately.
  - [ ] **Logging:** Retain existing behavior diagnostics; add no render-loop or transaction logs in component code.
  - [ ] **Dependencies:** Phase 2 composable refactor.

### Phase 3 — Narrow remaining broad transaction reactions

- [x] **Guard transaction-backed view updates by relevant state changes.**
  - [ ] **Files:** `packages/editor/src/components/table/table-selection/TableSelectionOverlay.vue`, `packages/editor/src/components/notion/collaboration/CollabUsers.vue`, `packages/editor/src/composables/useUndoRedo.ts`, `packages/editor/src/composables/useFloatingToolbarVisibility.ts`
  - [ ] **Deliverable:**
    - [ ] In `TableSelectionOverlay`, refresh selection geometry from `transaction` only when `columnResizingPluginKey` metadata changes; keep `selectionUpdate` for genuine selection changes and retain resize-loop cleanup.
    - [ ] In `CollabUsers`, compare the normalized collaborator list before assigning `users` so ordinary document transactions cannot rerender the avatar menu.
    - [ ] In `useUndoRedo`, assign `canExecute` and `isVisible` only when their computed values change, while retaining correctness for editor, command, and availability changes.
    - [ ] In `useFloatingToolbarVisibility`, ignore transactions that do not alter `HIDE_FLOATING_META` or selection state.
  - [ ] **Expected behavior:** Metadata-driven table resizing, collaborator changes, undo/redo availability, and floating-toolbar visibility remain responsive, while unrelated typing and transactions avoid reactive writes.
  - [ ] **Logging:** Keep subscription lifecycle diagnostics at debug level; log only exceptional cleanup or invalid-state paths, never every transaction.
  - [ ] **Dependencies:** Phase 1 is required for the UI-state path; the transaction guards can be implemented independently but should be validated together.

### Phase 4 — Verify rerender isolation manually

- [ ] **Exercise editor interactions and confirm update boundaries without adding tests.**
  - [ ] **Files:** No source changes expected; inspect the components and composables changed in Phases 1–3.
  - [ ] **Deliverable:** Use Vue Devtools or temporary development diagnostics to verify that typing updates document-dependent UI only, and that targeted interactions still update their owners: drag start/end, drag-menu open/close, floating-toolbar selection changes, table column resize, undo/redo, and collaborator presence changes when collaboration is available.
  - [ ] **Expected behavior:** No stale UI, leaked listeners after editor replacement/unmount, duplicate custom-event subscriptions, or broad component rerenders from unrelated transactions.
  - [ ] **Logging:** Review verbose development diagnostics for subscribe/unsubscribe balance; remove any temporary profiling output before completion.
  - [ ] **Dependencies:** Phases 1–3.

## Completion Criteria

- [x] `UiState` emits typed, no-op-safe updates and all migrated consumers listen only to their requested fields.
- [x] Unrelated document transactions no longer trigger full `uiState` copies or reactive assignments in the audited components.
- [x] Transaction listeners that remain are justified by selection or plugin metadata and avoid writes when their derived value is unchanged.
- [ ] Editor interaction behavior and cleanup semantics remain intact; no tests or docs are added under this task's settings.
