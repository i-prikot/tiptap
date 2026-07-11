<!-- handoff:task:99fba28b-55da-4d4e-ad9e-566cb972bfba -->
# Покрыть `table-actions.ts`

**Created:** 2026-07-11  
**Branch:** `main`  
**Scope:** Add focused Vitest unit coverage for table action eligibility (`can*`) and execution (`do`) paths; do not change production table behavior.

## Settings

- [x] **Deliverable test suite:** yes — this task's sole functional deliverable is unit tests.
- [x] **Test-command execution:** no — disabled by the Handoff request (`tests:false`); the implementation handoff must not add a separate test-run/verification task.
- [x] **Logging:** verbose implementation diagnostics through descriptive Vitest test names and exact assertions; add no runtime logging or production `console` calls.
- [x] **Docs:** no — do not alter documentation, roadmap, package scripts, Vitest configuration, or setup files.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** Skipped by autonomous Handoff default. The work corresponds to the existing Stage 2 `table-actions.ts` unit-test item but must not edit the roadmap.

## Rework Record

- [x] **2026-07-11:** Addressed review finding `f26b767020d0`: the stateful `dispatch` fixture now applies each `Transaction` to the current `EditorState` before updating the mocked editor and view state.

## Implementation Context

- [ ] Target module: `src/editor/utils/table-actions.ts`.
- [ ] New spec: `test/editor/utils/table-actions.test.ts`, following the existing `test/editor/utils/table-utils.test.ts` ProseMirror schema/table-fixture pattern.
- [ ] The fixture must emulate the minimal `Editor` contract used by the module: mutable `state`, `view.dispatch()` that updates it, `isEditable`, `extensionManager.extensions`, command/chain stubs where the CellSelection paths require them, and `isActive()` for header-state checks.
- [ ] Use `tableNodes()` and genuine `EditorState`, `CellSelection`, and `TableMap` data rather than mocking table algorithms. Register `tableHandleExtension` and/or `table` by name in the fixture to exercise the real extension guards.
- [ ] Keep expected document assertions structural: read row/column cell text, node types, dimensions, and merged-cell attributes after each dispatched transaction. Restore spies (including any `console.warn` guard) through the shared test setup.

## Tasks

### Phase 1: Build a Stateful Table-Editor Test Fixture

- [x] **Task 1: Create the dedicated table-actions spec and reusable typed fixtures.**
  - [ ] **Deliverable:** Add `test/editor/utils/table-actions.test.ts` with a local ProseMirror schema (`tableNodes()`), table/cell/header factories, table-coordinate and cell-text readers, and a stateful editor mock whose dispatch applies returned transactions for subsequent assertions.
  - [ ] **Expected behavior:** Support text-selection and `CellSelection` setups, regular and header cells, merged cells (`colspan`/`rowspan`), editable/read-only modes, present/missing `tableHandleExtension` and `table` extension registrations, and command/chain spies for Tiptap-only branches.
  - [ ] **Expected behavior:** Provide focused helpers for selecting a row/column, creating a rectangular cell selection, and asserting table dimensions/content without coupling tests to component rendering or DOM behavior.
  - [ ] **Files:** `test/editor/utils/table-actions.test.ts`.
  - [ ] **Dependency notes:** Foundation for Tasks 2–3; keep all fixtures local to this spec unless an existing test helper already satisfies the exact editor-state update contract.
  - [ ] **Logging requirements:** Add no runtime logs. Use named fixture builders and scenario-specific test labels; suppress/assert unavailable-extension warnings only where needed so a failed eligibility guard remains identifiable in Vitest output.

### Phase 2: Cover Duplicate, Move, and Sort Can/Do Contracts

- [x] **Task 2: Add unit tests for row/column duplication, movement, and sorting.**
  - [ ] **Deliverable:** Extend `test/editor/utils/table-actions.test.ts` for `canDuplicateRowColumn()`/`duplicateRowColumn()`, `isMoveDirectionValid()`/`canMoveRowColumn()`/`moveRowColumn()`, and `canSortRowColumn()`/`sortRowColumn()`.
  - [ ] **Expected behavior:** For duplicate actions, verify editable+handle-extension prerequisites, no-table/invalid-index/merged-cell refusals, row and column duplication from explicit `tablePos` text selections, and CellSelection command-chain paths. Assert copied text and cell attributes appear in the inserted row/column while source content remains intact.
  - [ ] **Expected behavior:** For move actions, verify valid direction pairs (`row`: up/down; `column`: left/right), invalid orthogonal directions, first/last boundary refusals, header-line refusals, merged-rectangle refusal, and successful row/column reordering with returned `true` and updated table content.
  - [ ] **Expected behavior:** For sort actions, verify editability/extension/table-size guards; reject merged, empty-only, and undersized lines; then assert ascending and descending stable rearrangement, header cells remaining fixed, case-insensitive text comparison, and empty data cells moved after non-empty cells.
  - [ ] **Files:** `test/editor/utils/table-actions.test.ts`.
  - [ ] **Dependency notes:** Depends on Task 1's stateful fixture. Use separate fixture instances per scenario so dispatched transactions and selection changes cannot leak between duplicate, move, and sort assertions.
  - [ ] **Logging requirements:** Add no runtime logs. Name cases by orientation, direction, and guard condition; assert the boolean result plus resulting document state so a failure identifies whether eligibility or dispatch behavior regressed.

### Phase 3: Cover Header Toggle and Merge/Split Can/Do Contracts

- [x] **Task 3: Add unit tests for header-state switching and merging/splitting cells.**
  - [ ] **Deliverable:** Extend `test/editor/utils/table-actions.test.ts` for `canToggleHeaderRowColumn()`, `isHeaderRowColumnActive()`, `toggleHeaderRowColumn()`, `canMergeCells()`, `canSplitCell()`, and `mergeSplitCells()`.
  - [ ] **Expected behavior:** For header actions, verify the `table` extension and editable-state guards, restrict toggling to index `0`, cover both explicit `tablePos` and CellSelection command paths, and assert row/column cells change between `tableCell` and `tableHeader`. Verify active-state detection for a CellSelection (`editor.isActive`) and non-CellSelection node inspection.
  - [ ] **Expected behavior:** For merge/split actions, verify missing editor, read-only, and missing-table-extension guards; confirm merging a rectangular `CellSelection` produces a merged cell and returns `true`; then confirm splitting that merged cell restores the expected grid dimensions/cell structure and returns `true`. Cover ineligible selections returning `false` without dispatching a document change.
  - [ ] **Files:** `test/editor/utils/table-actions.test.ts`.
  - [ ] **Dependency notes:** Depends on Task 1. Keep merge and split in a controlled sequential fixture only where split explicitly consumes the prior merge result; use fresh fixtures for all negative cases.
  - [ ] **Logging requirements:** Add no runtime logs. Use assertions for return values, dispatch counts, node types, and `colspan`/`rowspan` so failures expose the exact header or merge/split state transition.

## Acceptance Criteria

- [x] `test/editor/utils/table-actions.test.ts` is the only functional file added or changed for this task.
- [x] The spec uses the repository's configured Vitest + `happy-dom` environment and real ProseMirror table state/transactions for behavior under test.
- [x] Duplicate, move, and sort expose both representative `can*` refusals and successful `do` paths for row and column orientations where supported.
- [x] Sort coverage preserves header cells, handles case-insensitive order, places empty cells last, and refuses merged/empty/undersized lines.
- [x] Header coverage validates index-zero restriction, active-state detection, and successful row/column toggles for both selection strategies.
- [x] Merge/split coverage validates eligibility guards and round-trips a rectangular selection through a merged cell back to a valid grid.
- [x] No production source, runtime logging, docs, roadmap, package scripts, Vitest configuration, or unrelated working-tree changes are introduced.

## Out of Scope

- [ ] Coverage for add/delete/clear table actions, Vue table components, drag-handle extension behavior, browser/e2e interaction, or visual rendering.
- [ ] Production fixes in `src/editor/utils/table-actions.ts` or `src/editor/utils/table-utils.ts`; if tests reveal a defect, record the failed contract and create a separate source-fix task.
- [ ] Running test, typecheck, lint, format, coverage, or broader verification commands as part of this Handoff plan (`tests:false`).
