<!-- handoff:task:08eaa0df-8932-4391-95b2-1bd231065a41 -->
# Implementation Plan: Cover `table-utils.ts`

Branch: `main`
Created: 2026-07-11

## Settings
- [ ] Testing: no — this task itself creates the requested unit suite; do not add wider or unrelated coverage.
- [ ] Logging: verbose — preserve focused Vitest command output as implementation diagnostics; add no application logging.
- [ ] Docs: no — emit only the implementation workflow's `WARN [docs]`; do not edit documentation.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff defaults; the scope nevertheless maps directly to the existing `Этап 2. Тестирование: фундамент` item for `table-utils.ts`.

## Scope

- [ ] Add one focused Vitest suite at `test/editor/utils/table-utils.test.ts` for `getTable`, `cellsOverlapRectangle`, `countEmptyRowsFromEnd`, `countEmptyColumnsFromEnd`, and `selectCellsByCoords`.
- [ ] Exercise real ProseMirror table semantics with `Schema`, `tableNodes`, `EditorState`, `TableMap`, and `CellSelection`; use a typed minimal `Editor` mock instead of mounting Vue or a Tiptap editor view.
- [ ] Keep `src/editor/utils/table-utils.ts`, table components, extensions, test configuration, package scripts, and documentation unchanged unless a test reveals a separate production defect.

## Tasks

### Phase 1 — Shared Table Fixtures and Table Lookup

- [x] Task 1: Create deterministic ProseMirror fixtures and cover `getTable()` in `test/editor/utils/table-utils.test.ts`.
  - [ ] Deliverable: add local helpers that construct a schema from basic `doc`/`paragraph`/`text` nodes plus `tableNodes`, build empty, whitespace-only, text-filled, and merged-cell tables, calculate the table node position, and return an `EditorState` exposed through a typed minimal `Editor` mock.
  - [ ] Expected behavior: establish that test fixtures use the real `TableMap` rather than hand-written map objects, and keep all state/selection construction local to the spec file.
  - [ ] Expected behavior: verify `getTable()` returns `null` for `null`/`undefined` editors and when no table surrounds the selection; verify an explicit valid table position returns the table node, exact `pos`, `start = pos + 1`, resolved depth, and matching `TableMap`; verify an invalid explicit position falls back to the table around the current selection.
  - [ ] Files: `test/editor/utils/table-utils.test.ts`.
  - [ ] Dependency notes: establishes fixture helpers used by Tasks 2 and 3; production source must not be modified for fixture setup.
  - [ ] Logging requirements: add no runtime logs. Use fixture names and nested `describe` blocks that identify table shape, selection location, and lookup path so Vitest output pinpoints a failing contract.

### Phase 2 — Rectangle Boundaries and Empty Trailing Lines

- [x] Task 2: Cover merge-boundary detection and trailing empty row/column counts using the shared fixtures.
  - [ ] Deliverable: add `cellsOverlapRectangle()` cases using `TableMap.get(table)` and explicit `Rect` values for an ordinary table, rectangles touching table edges, rectangles that fully contain a merged cell, and rectangles whose left/right or top/bottom boundary cuts through a horizontal or vertical merge.
  - [ ] Expected behavior: return `false` when no merged cell crosses a rectangle boundary, including edge-aligned and fully-contained cases; return `true` for every boundary that excludes part of a merged cell.
  - [ ] Deliverable: add paired `countEmptyRowsFromEnd()` and `countEmptyColumnsFromEnd()` cases for no editor/invalid table position, completely empty tables, consecutive empty trailing lines, whitespace-only paragraph content, and the first non-empty trailing line that terminates counting.
  - [ ] Expected behavior: count only contiguous empty rows or columns from the end, treat trimmed whitespace as empty according to `isCellEmpty()`, and avoid double-counting cells that span multiple coordinates in a merged-cell table.
  - [ ] Files: `test/editor/utils/table-utils.test.ts`.
  - [ ] Dependency notes: depends on Task 1 fixture helpers; use real merged cell attributes (`colspan`/`rowspan`) so `TableMap.positionAt()` and deduplication are exercised together.
  - [ ] Logging requirements: add no runtime logs. Name assertions by the crossing side (`left`, `right`, `top`, `bottom`) and empty-line orientation so the failure output identifies the affected map branch.

### Phase 3 — Coordinate-Based Cell Selection Modes

- [x] Task 3: Cover `selectCellsByCoords()` validation, coordinate normalization, merged-cell recovery, and all result modes.
  - [ ] Deliverable: assert that a missing editor, missing table at `tablePos`, and an empty coordinate list return `undefined` without dispatching.
  - [ ] Expected behavior: in default `state` mode, select the rectangular range bounded by the minimum and maximum supplied coordinates, return a new `EditorState`, and expose a `CellSelection` with anchor/head positions matching the table map.
  - [ ] Expected behavior: clamp negative and oversized row/column coordinates to valid table bounds before selection; use a merged-cell fixture to exercise equal anchor/head positions. For valid rectangular `TableMap` data, equal corners mean the requested rectangle is wholly covered by one merged cell, so the recovery scan has no distinct in-range cell to select.
  - [ ] Expected behavior: in `transaction` mode, return a `Transaction` containing the `CellSelection` without applying it to the original state; in `dispatch` mode, call the supplied callback exactly once with that transaction and return `undefined`.
  - [ ] Files: `test/editor/utils/table-utils.test.ts`.
  - [ ] Dependency notes: depends on Tasks 1–2 fixture and map conventions; do not replace production error handling or console calls solely to make tests easier.
  - [ ] Logging requirements: add no runtime logs. Assert dispatch call count, result type, selection class, and anchor/head positions explicitly so a failure distinguishes mode routing from coordinate/map handling.

### Phase 4 — Focused Validation and Change Isolation

- [x] Task 4: Run the requested suite and verify the patch is limited to the table-utility tests.
  - [ ] Deliverable: run `npm test -- test/editor/utils/table-utils.test.ts` and `npm run typecheck`; capture the exact commands and outcomes in the implementation summary.
  - [ ] Expected behavior: the focused spec passes in the configured `happy-dom` environment and all strict TypeScript checks accept the ProseMirror fixture types.
  - [ ] Expected behavior: inspect the final diff to confirm the functional change is limited to `test/editor/utils/table-utils.test.ts` and does not overwrite the repository's pre-existing working-tree changes.
  - [ ] Defect handling: this is a test-only task, so do not manufacture a TDD RED/GREEN production change. If a test reveals a real behavior defect in `src/editor/utils/table-utils.ts`, preserve the failing contract as evidence, stop scope expansion, and propose a separate source-fix task with RED/GREEN evidence under `.ai-factory/RULES.md`.
  - [ ] Files: `test/editor/utils/table-utils.test.ts`.
  - [ ] Dependency notes: depends on Tasks 1–3.
  - [ ] Logging requirements: add no application logs. Preserve Vitest/typecheck terminal output as verbose diagnostics and identify any unrelated failures or pre-existing modified files without changing them.

## Acceptance Criteria

- [ ] `test/editor/utils/table-utils.test.ts` uses repository-standard Vitest imports and a minimal typed ProseMirror/Tiptap fixture; it does not mount Vue components or create browser/e2e coverage.
- [ ] `getTable()` is covered for absent editor, no surrounding table, explicit table lookup, and invalid-position fallback to the current selection.
- [ ] `cellsOverlapRectangle()` is covered for non-overlapping rectangles and for horizontal/vertical merged-cell crossings on all relevant boundaries.
- [ ] `countEmptyRowsFromEnd()` and `countEmptyColumnsFromEnd()` are covered for contiguous trailing emptiness, whitespace, non-empty stopping cells, invalid input, and merged-cell deduplication.
- [ ] `selectCellsByCoords()` is covered for invalid inputs, coordinate clamping, default state creation, transaction and dispatch modes, and equal-position merged-cell handling. The plan explicitly records why distinct-cell recovery is unreachable for valid `TableMap` data.
- [ ] The focused Vitest command and `npm run typecheck` pass, with no runtime source, test configuration, package, documentation, roadmap, or unrelated working-tree modifications.

## Out of Scope

- [ ] Tests for other `table-utils.ts` exports, including DOM helpers, row/column collectors, selection restoration, `selectLastCell()`, and `updateSelectionAfterAction()`.
- [ ] Tests or changes for `src/editor/utils/table-actions.ts`, table Vue components, `table-kit.ts`, `table-handle.ts`, or browser/integration table workflows.
- [ ] Production changes to `src/editor/utils/table-utils.ts`, additional test tooling or configuration, coverage-threshold work, CI changes, documentation, roadmap edits, or commits.

## Rework — 2026-07-11

- [x] Add a direct equal-anchor/head merged-cell test and clarify the valid-`TableMap` reachability constraint for distinct-cell recovery.
