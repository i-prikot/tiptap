<!-- handoff:task:724ec1ee-6d4a-49a7-928b-376fee2ce75e -->
# Implementation Plan: Verify Table Commands

**Created:** 2026-07-13  
**Branch:** `main`  
**Mode:** Fast / autonomous Handoff

## Settings

- [x] **Testing:** No additional test scope — the requested deliverable itself is the integration-test suite.
- [x] **Logging:** Verbose test diagnostics through descriptive test names and assertion messages; do not add runtime logging or mock `console` output without a behavior-specific need.
- [x] **Docs:** No documentation changes.

## Roadmap Linkage

- [x] **Milestone:** `none`
- [x] **Rationale:** Explicitly skipped for this focused test-only task.

## Goal

Add integration coverage for the live Tiptap table command stack using a real editor instance with `StarterKit` and the project’s `TableKit`. The suite must prove that a 3×3 table can be inserted, rows can be added and removed, selected cells can be merged and split, and deleting the sole remaining row is rejected without removing or corrupting the table.

## Scope and Constraints

- [x] Add only table integration tests under `test/editor/extensions/`; preserve existing unit tests in `test/editor/utils/table-actions.test.ts`.
- [x] Exercise document transactions and command results through a mounted Tiptap editor, not mocked editor commands or Vue menu click paths.
- [x] Reuse the project’s test lifecycle conventions: attach the editor to a DOM element and destroy every editor/remove test DOM in `afterEach`.
- [x] Assert structural state with `TableMap`, table-node attributes, command return values, and stable document snapshots where needed; avoid brittle serialized HTML assertions.
- [x] Do not change application code, test configuration, npm scripts, documentation, roadmap, or unrelated working-tree files unless a failing invariant exposes a narrowly scoped implementation defect.

## Tasks

### Phase 1 — Build the Table Integration Harness

- [x] Create `test/editor/extensions/table.integration.test.ts` with a real `@tiptap/core` `Editor` mounted in `happy-dom`, configured with `StarterKit` and `TableKit` using the same table options as `src/editor/components/notion/EditorProvider.vue` (`resizable: true`, `cellMinWidth: 120`).
  - [x] Track created editors and host elements; in `afterEach`, destroy each editor, clear the provided DOM, and restore a clean document body.
  - [x] Add focused helpers to locate the single table node, obtain dimensions from `TableMap`, select cells by row/column coordinates with `CellSelection`, and report clear assertion failures for missing tables/cells.
  - [x] **Logging:** Use explicit test/expectation messages that identify the failed command and expected table dimensions; add no production logging.

### Phase 2 — Cover Insert and Row Mutations

- [x] Add integration scenarios in `test/editor/extensions/table.integration.test.ts` that insert a 3×3 table and then mutate rows through the real editor command chain.
  - [x] Insert with `insertTable({ rows: 3, cols: 3, withHeaderRow: false })`; assert the command succeeds, the document contains one table, and `TableMap` reports height `3` and width `3`.
  - [x] Place the selection in a known table cell, execute `addRowAfter()`, and assert that the table grows to 4×3 while retaining the original 3×3 grid structure.
  - [x] Select a row in the expanded table, execute `deleteRow()`, and assert that the table returns to 3×3 and remains a valid table node.
  - [x] **Logging:** Make assertion messages state the precondition selection and expected post-command dimensions; do not emit application logs.

### Phase 3 — Cover Merge, Split, and Last-Row Protection

- [x] Add integration scenarios in `test/editor/extensions/table.integration.test.ts` for cell merging/splitting and the one-row deletion invariant.
  - [x] Select two adjacent cells in a 3×3 table, run `mergeCells()`, and assert a merged cell with the expected `colspan`/`rowspan` plus the reduced physical cell count.
  - [x] Keep the merged cell selected, run `splitCell()`, and assert the 3×3 grid is restored with unmerged cell spans.
  - [x] Create or reduce a table to exactly one row, capture its JSON/dimensions, call `deleteRow()`, and assert the command reports rejection (or is disabled by the application command boundary) and leaves the one-row table/document unchanged.
  - [x] If this invariant currently fails, add the smallest production guard at the command boundary responsible for row deletion, then keep the integration assertion as the regression test. Do not broaden the change to unrelated table behavior.
  - [x] **Logging:** Include failure messages that distinguish rejected deletion from accidental table removal or document mutation; avoid `console` spies unless verifying an intentional error path.

## Validation

- [x] Run `npm test -- test/editor/extensions/table.integration.test.ts` and confirm all table scenarios pass.
- [x] Run `npm run typecheck` to verify the new editor/table helper types.
- [x] Record the targeted RED/GREEN command outcomes in the implementation handoff to satisfy `.ai-factory/RULES.md`; no separate documentation artifact is required.

## Out of Scope

- [x] Vue UI interaction tests for `TableCellHandleMenu.vue`, `TableExtendRowColumnButtons.vue`, table resizing, column actions, drag/drop, and selection overlays.
- [x] New coverage for table sorting, duplication, header toggles, content clearing, alignment, colors, or table-handle behavior.
- [x] Changes to `vitest.config.ts`, `test/setup.ts`, package scripts, CI, documentation, roadmap, or unrelated modified files.
