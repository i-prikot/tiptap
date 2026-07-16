<!-- handoff:task:bd56ac7e-202f-4432-a0b7-b75e863919cc -->
# Implementation Plan: Split Table Utility Modules

Branch: `main`
Created: 2026-07-14

## Settings
- [x] Testing: no (explicit task constraint; do not add, edit, or run tests)
- [x] Logging: verbose implementation workflow; preserve runtime log statements, levels, and messages exactly
- [x] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff defaults; this internal refactor supports the existing architecture-boundary work without claiming milestone completion.

## Scope and Compatibility
- [x] Split `src/editor/utils/table-utils.ts` into focused internal modules for TableMap navigation, cell-selection behavior, and calculations/predicates/DOM helpers.
- [x] Retain `src/editor/utils/table-utils.ts` as the stable public facade so existing components, composables, extensions, table actions, and tests keep their current import path.
- [x] Preserve function signatures, exported types/constants, return values, selection semantics, merged-cell handling, and existing `console.warn` / `console.error` messages.
- [x] Do not alter user-owned changes, including the currently modified `test/editor/utils/table-utils-branches.test.ts`.

## Commit Plan
- [ ] **Commit 1** (after tasks 1-3): `refactor: extract focused table utility modules`
- [ ] **Commit 2** (after tasks 4-5): `refactor: preserve table utility facade exports`

## Tasks

### Phase 1: Establish Shared Contracts and Navigation
- [x] **Task 1: Extract shared table utility contracts.** Create `src/editor/utils/table-utils/shared.ts` for the public sizing constants (`EMPTY_CELL_HEIGHT`, `EMPTY_CELL_WIDTH`, `RESIZE_MIN_WIDTH`), shared types (`Orientation`, `IndexedCell`, `IndexedCells`, `RowOrColumnCells`, `TableInfo`, `DomCellInfo`), and only the internal helpers needed by more than one focused module. Keep exported type shapes and constant values unchanged; avoid introducing a circular dependency between focused modules. **Files:** `src/editor/utils/table-utils/shared.ts`, `src/editor/utils/table-utils.ts`. **Dependencies:** none. **Logging:** Do not add runtime logs; preserve the original logging ownership by moving no log-producing behavior into shared contracts.

- [x] **Task 2: Move TableMap navigation and line discovery into a focused module.** Create `src/editor/utils/table-utils/table-map.ts` for `getTable`, row/column index resolution, row/column cell collection (`getRowCells`, `getColumnCells`, `getRowOrColumnCells`), line coordinate derivation (`getIndexCoordinates`), and trailing-empty-line counts. Preserve lookup by explicit table position versus current selection, `CellSelection` handling, map bounds, duplicate merged-cell tracking, and the existing empty-result objects. Import shared contracts from `shared.ts` and ProseMirror/Tiptap dependencies directly. **Files:** `src/editor/utils/table-utils/table-map.ts`, `src/editor/utils/table-utils/shared.ts`, `src/editor/utils/table-utils.ts`. **Dependencies:** Task 1. **Logging:** These helpers currently perform no runtime logging; keep them log-free and do not change any caller-visible failure behavior.

### Phase 2: Isolate Selection and Calculation Behavior
- [x] **Task 3: Move cell-selection detection and mutations into a focused module.** Create `src/editor/utils/table-utils/cell-selection.ts` for `getTableSelectionType`, `selectCellsByCoords`, `selectLastCell`, `setCellAttr`, `updateSelectionAfterAction`, and `runPreservingCursor`. Preserve each selection mode (`state`, `transaction`, `dispatch`), fallback/corner handling for merged cells, cursor mapping, selection dispatch timing, and boolean/undefined results. Reuse `table-map.ts` instead of duplicating TableMap lookup logic. **Files:** `src/editor/utils/table-utils/cell-selection.ts`, `src/editor/utils/table-utils/table-map.ts`, `src/editor/utils/table-utils.ts`. **Dependencies:** Tasks 1-2. **Logging:** Retain `console.error('Failed to create cell selection:', error)` and `console.warn('selectLastCell: cell position not found in map', …)` verbatim at their current failure boundaries; add no new diagnostics.

- [x] **Task 4: Move table calculations, predicates, and DOM bridges into a focused module.** Create `src/editor/utils/table-utils/table-calculations.ts` for DOM/node predicates and lookup (`isHTMLElement`, `safeClosest`, `domCellAround`, `getCellIndicesFromDOM`, `getTableFromDOM`, `isCellEmpty`, `isTableNode`), scalar/rectangle helpers (`clamp`, `marginRound`, `rectEq`, `cellsOverlapRectangle`), and their private helpers. Preserve DOM traversal stop conditions, `TableMap` coordinate calculations, null/undefined contracts, and exact rectangle/merged-cell semantics. **Files:** `src/editor/utils/table-utils/table-calculations.ts`, `src/editor/utils/table-utils/shared.ts`, `src/editor/utils/table-utils.ts`. **Dependencies:** Tasks 1-2. **Logging:** Preserve `console.warn('Could not get cell position:', error)` and `console.warn('Could not get table from DOM:', error)` exactly; pure helpers remain log-free.

### Phase 3: Restore Public Surface and Validate Refactor
- [x] **Task 5: Rebuild `table-utils.ts` as a compatibility facade and perform static validation.** Replace implementation in `src/editor/utils/table-utils.ts` with explicit value and type re-exports from the focused modules. Confirm every current consumer remains compatible without import rewrites, including `TableExtendRowColumnButtons.vue`, `TableHandle.vue`, `TableSelectionOverlay.vue`, `TableHandleMenuContent.vue`, `TableAlignMenu.vue`, `useNodeActions.ts`, `useTableAlignCell.ts`, `useTableHandlePositioning.ts`, `extensions/table-handle.ts`, `extensions/table-kit.ts`, and `utils/table-actions.ts`. Run only `npm run typecheck` and `npm run lint`; resolve extraction-caused module, type, import, or lint errors without modifying tests or unrelated workspace changes. Review the final diff for full export parity and unchanged runtime logging. **Files:** `src/editor/utils/table-utils.ts`, `src/editor/utils/table-utils/shared.ts`, `src/editor/utils/table-utils/table-map.ts`, `src/editor/utils/table-utils/cell-selection.ts`, `src/editor/utils/table-utils/table-calculations.ts`. **Dependencies:** Tasks 2-4. **Logging:** Keep the facade log-free and verify all pre-existing warning/error messages remain in the extracted behavior that emits them; report validation output in the implementation handoff, not in runtime code.
