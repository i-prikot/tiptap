<!-- handoff:task:9a298fac-eea9-4720-b238-a7881c301ba0 -->
# Decompose table handle extension

**Mode:** Fast
**Created:** 2026-07-14
**Branch:** `main`
**Scope:** Behavior-preserving internal refactor of the table-handle extension

## Settings

- [ ] **Testing:** No — do not add, change, or run test suites for this task.
- [ ] **Logging:** Verbose planning default; do not introduce runtime logging because the existing editor extension is intentionally silent. If temporary diagnostics are required while implementing, remove them before completion.
- [ ] **Docs:** No — do not change product or developer documentation.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** Autonomous fast-mode planning defaults to no roadmap linkage.

## Goal

Split `src/editor/extensions/table-handle.ts` into focused internal modules for:

1. ProseMirror plugin/view lifecycle and hover state;
2. row/column drag-and-drop behavior and drag-preview construction;
3. drag-source and dropcursor decoration generation.

Keep `src/editor/extensions/table-handle.ts` as the public compatibility facade so all existing imports, command augmentation, UI composables, and integration points retain their current API and behavior.

## Behavioral Invariants

- [x] Preserve the public exports: `TableHandleExtension`, `TableHandlePlugin`, `tableHandlePluginKey`, `rowDragStart`, `colDragStart`, `dragEnd`, `TableHandleState`, and `TableDraggingState`.
- [x] Preserve hover tracking, freeze/unfreeze command metadata, table-handle state emission, selection restoration on table-cell mousedown, and listener cleanup.
- [x] Preserve row/column drag effects, preview styling and cleanup, selected-cell relocation, and `moveTableRow`/`moveTableColumn` dispatch behavior.
- [x] Preserve decoration classes and geometry: `table-cell-dragging-source` and `tiptap-table-dropcursor` must remain visually and positionally equivalent.
- [x] Keep extension code in `src/editor/extensions/` free of Vue component imports and avoid changing table UI/composable consumers.

## Tasks

### Phase 1 — Establish module contracts

- [x] **1. Create the table-handle module boundary and retain the public facade.**
  - [x] **Files:** Modify `src/editor/extensions/table-handle.ts`; create `src/editor/extensions/table-handle/types.ts`.
  - [x] Move `DraggedCellOrientation`, `TableDraggingState`, and `TableHandleState` into `types.ts`; define only the minimal shared internal contracts needed by the plugin, drag behavior, and decoration modules.
  - [x] Turn `table-handle.ts` into the stable entry point that re-exports every existing public runtime symbol and type from the new modules, without changing consumer import paths.
  - [x] Confirm the type-only consumers in `src/editor/composables/useTableHandleState.ts`, `src/editor/composables/useTableHandlePositioning.ts`, and `src/editor/types/tiptap-augmentations.d.ts` continue to resolve through `../extensions/table-handle`.
  - [x] **Logging:** Do not add runtime logs; preserve the current silent API.
  - [x] **Dependencies:** None.

### Phase 2 — Extract isolated behaviors

- [x] **2. Move drag-and-drop behavior into a dedicated module.**
  - [x] **Files:** Create `src/editor/extensions/table-handle/drag-and-drop.ts`; modify `src/editor/extensions/table-handle.ts` and later `src/editor/extensions/table-handle/plugin.ts`.
  - [x] Relocate drag-image cloning/style-copy helpers, row/column preview construction, drag start/end entry points, drag-over target calculation, and drop-to-row/column move behavior.
  - [x] Use a narrow plugin-view/context interface or callbacks for active table-handle state instead of importing the concrete ProseMirror view class, preventing a circular dependency between plugin and drag modules.
  - [x] Preserve the existing singleton active-view semantics, data-transfer effects, drag-image offsets, document cleanup listeners, selection reset, transaction metadata, and invalid-drop behavior.
  - [x] **Logging:** Do not add drag-event logs or alter error behavior; retain the existing invalid-drop exception message and return values.
  - [x] **Dependencies:** Task 1.

- [x] **3. Move drag decorations into a dedicated module.**
  - [x] **Files:** Create `src/editor/extensions/table-handle/decorations.ts`; later modify `src/editor/extensions/table-handle/plugin.ts`.
  - [x] Extract the ProseMirror decoration builder from the plugin `props.decorations` callback into a focused function that receives the editor, document state, and active drag/table state required to create decorations.
  - [x] Preserve source-cell node decorations and row/column dropcursor widget placement, dimensions, and CSS class names exactly; return the same `undefined`/`null` outcomes when no drag state is active.
  - [x] Keep direct dependencies limited to ProseMirror/Tiptap and table utilities; do not couple this module to Vue UI state.
  - [x] **Logging:** Do not add decoration or transaction logs.
  - [x] **Dependencies:** Task 1.

### Phase 3 — Extract plugin orchestration

- [x] **4. Move the ProseMirror plugin and view lifecycle into a dedicated module.**
  - [x] **Files:** Create `src/editor/extensions/table-handle/plugin.ts`; modify `src/editor/extensions/table-handle.ts`.
  - [x] Move `tableHandlePluginKey`, `TableHandleView`, `TableHandlePlugin`, state/meta handling, hover/mousedown/update/destroy lifecycle, and extension command/plugin registration into the plugin module.
  - [x] Delegate drag event processing to `drag-and-drop.ts` and decoration construction to `decorations.ts`, while keeping all event listener targets, event ordering, emitted `tableHandleState` payloads, and cleanup behavior unchanged.
  - [x] Keep `TableHandleExtension` behavior and command names identical, including `freezeHandles` and `unfreezeHandles`; expose them through the compatibility facade.
  - [x] **Logging:** Do not add listener, hover, or lifecycle logs; preserve current editor event emissions only.
  - [x] **Dependencies:** Tasks 2 and 3.

### Phase 4 — Integrate and validate without tests

- [x] **5. Normalize imports and perform non-test static validation.**
  - [x] **Files:** Review and, only if required by the extracted module paths, modify `src/editor/extensions/table-handle.ts`; do not modify UI or test files solely for this refactor.
  - [x] Verify no external import path changes are required for `src/editor/components/table/TableHandle.vue`, `src/editor/composables/useTableHandleState.ts`, `src/editor/composables/useTableHandlePositioning.ts`, `src/editor/types/tiptap-augmentations.d.ts`, or the existing table-handle integration test.
  - [x] Run `npm run typecheck` and lint the touched extension files. Do **not** run or add tests because testing is explicitly disabled for this task.
  - [x] Inspect the final diff to confirm it only decomposes the extension, preserves exported symbols, and adds no runtime logging or documentation changes.
  - [x] **Logging:** Verify no new `console` or application logging statements were introduced.
  - [x] **Dependencies:** Task 4.

## Commit Plan

1. `refactor(table): extract table handle drag and decoration modules` — complete Tasks 1–3.
2. `refactor(table): isolate table handle ProseMirror plugin` — complete Tasks 4–5.

## Completion Criteria

- [x] `src/editor/extensions/table-handle.ts` remains the working public entry point.
- [x] Plugin, drag-and-drop, and decoration responsibilities live in separate focused files under `src/editor/extensions/table-handle/`.
- [x] Existing table-handle UI/composable/type imports continue to compile without path changes.
- [x] Row and column handle behavior, plugin metadata, emitted state, and decoration markup are preserved by inspection and static validation.
- [x] No test, documentation, or unrelated source changes are included.
