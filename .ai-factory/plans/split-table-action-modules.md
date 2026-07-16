<!-- handoff:task:a988850a-76fc-4ae1-be3b-5348f4c7a91e -->
# Implementation Plan: Split Table Action Modules

Branch: `main`
Created: 2026-07-14

## Settings
- [x] Testing: yes — add and run the focused `test/editor/utils/table-actions.test.ts` behavioral regression suite, including recorded RED/GREEN evidence.
- [ ] Logging: verbose — preserve the existing `console.error` boundaries and messages during this behavior-preserving refactor; do not introduce new runtime logging solely for file extraction.
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped for this autonomous Handoff fast plan.

## Goal and Constraints
- [ ] Replace the single `src/editor/utils/table-actions.ts` implementation with focused internal modules for movement, structural add/delete actions, sorting, merge/split, headers, and clearing.
- [ ] Keep `src/editor/utils/table-actions.ts` as the compatibility facade so existing component, composable, and test imports continue to resolve without consumer changes.
- [ ] Preserve all exported names, types, labels, command eligibility checks, transaction behavior, selection updates, and error handling exactly; this task must not change table-action behavior.
- [ ] Keep shared editor/table helpers private to the table-actions module directory unless they are already part of the public `table-actions` API.
- [x] Add a targeted behavioral regression test through the unchanged `table-actions.ts` facade before completing the extraction; documentation remains out of scope.

## Commit Plan
- [ ] **Commit 1** (after tasks 1-4): `refactor: split table action operation modules`
- [ ] **Commit 2** (after tasks 5-7): `refactor: add table actions compatibility barrel`

## Tasks

### Phase 1: Establish Shared and Structural Modules
- [x] **Task 1: Extract the internal shared contract and helpers.** Create `src/editor/utils/table-actions/shared.ts` for `RowColumnArgs`, `AddSide`, `MoveDirection`, `SortDirection`, `MergeSplitAction`, extension-name constants, transaction dispatch helpers, safe header checks, resettable cell attributes, and any other cross-domain-only utilities. Repoint extracted operation modules at this file using relative imports; re-export all currently public types from the facade. **Files:** `src/editor/utils/table-actions/shared.ts`, `src/editor/utils/table-actions.ts`. **Dependencies:** none. **Logging:** Preserve helper error fallbacks and ensure extraction does not add logs or alter existing error strings.

- [x] **Task 2: Move structural table actions into one focused module.** Create `src/editor/utils/table-actions/add-delete.ts` containing the duplicate-row/column flow plus all add-row/column and delete-row/column labels, `can*` predicates, and command functions. Keep current `CellSelection` versus coordinate-selection branches, merged-cell restrictions, post-action selection updates, and return values intact. Import shared values from `shared.ts` and table primitives from `../table-utils` / Tiptap packages directly. **Files:** `src/editor/utils/table-actions/add-delete.ts`, `src/editor/utils/table-actions.ts`. **Dependencies:** Task 1. **Logging:** Preserve the existing duplicate/add/delete `console.error` handling and error text exactly; no new logs.

- [x] **Task 3: Move row/column movement actions into a dedicated module.** Create `src/editor/utils/table-actions/movement.ts` for `MOVE_LABELS`, `isMoveDirectionValid`, `canMoveRowColumn`, and `moveRowColumn`. Maintain the direction/orientation validation, header restrictions, table-boundary checks, merged-cell rectangle checks, selection conversion, and dispatch behavior. **Files:** `src/editor/utils/table-actions/movement.ts`, `src/editor/utils/table-actions.ts`. **Dependencies:** Task 1. **Logging:** Retain the existing move failure boundary and `console.error('Error moving table row/column:', error)` message without adding diagnostics.

- [x] **Task 4: Move header controls into a dedicated module.** Create `src/editor/utils/table-actions/headers.ts` for `HEADER_LABELS`, `canToggleHeaderRowColumn`, `isHeaderRowColumnActive`, and `toggleHeaderRowColumn`. Preserve its editor command path, ProseMirror fallback path, selection handling, and header-state semantics. **Files:** `src/editor/utils/table-actions/headers.ts`, `src/editor/utils/table-actions.ts`. **Dependencies:** Task 1. **Logging:** Keep the current catch behavior and error messages unchanged; do not add runtime logging.

### Phase 2: Extract Remaining Action Domains
- [x] **Task 5: Move sorting actions into a dedicated module.** Create `src/editor/utils/table-actions/sorting.ts` for sort labels, cell/header text helpers, sort availability checks, and row/column sorting transactions. Preserve sort order, header treatment, merged-cell restrictions, transaction construction, selection restoration, and no-op behavior. **Files:** `src/editor/utils/table-actions/sorting.ts`, `src/editor/utils/table-actions.ts`. **Dependencies:** Task 1. **Logging:** Preserve all current sort error handling and contextual `console.error` output; do not add logs.

- [x] **Task 6: Move clear operations into a dedicated module.** Create `src/editor/utils/table-actions/clearing.ts` for row/column clear labels and visibility, clear eligibility and execution, `CLEAR_ALL_LABEL`, whole-table cell collection/selection helpers, and clear-all eligibility/execution. Retain reverse-order mutation, optional attribute resetting, `NodeSelection` support, and all empty-content guards. **Files:** `src/editor/utils/table-actions/clearing.ts`, `src/editor/utils/table-actions.ts`. **Dependencies:** Task 1. **Logging:** Preserve existing clear-operation `console.error` branches and messages, including nested row/column and selected-cell failures.

- [x] **Task 7: Move merge/split actions into a dedicated module.** Create `src/editor/utils/table-actions/merge-split.ts` for `MERGE_SPLIT_LABELS`, `canMergeCells`, `canSplitCell`, and `mergeSplitCells`. Keep table-extension eligibility checks, dry-run command checks, dispatch binding, boolean outcomes, and current error behavior unchanged. **Files:** `src/editor/utils/table-actions/merge-split.ts`, `src/editor/utils/table-actions.ts`. **Dependencies:** Task 1. **Logging:** Preserve `console.error(\`Error ${action}ing table cell:\`, error)` exactly and add no logging.

### Phase 3: Rebuild the Public Surface and Validate
- [x] **Task 8: Turn the original file into a stable compatibility facade.** Replace implementation code in `src/editor/utils/table-actions.ts` with explicit value and type re-exports from the focused modules (or a colocated internal `index.ts` if needed for clean organization). Verify that every symbol currently imported by `TableCellHandleMenu.vue`, `TableHandleMenuContent.vue`, `useNodeActions.ts`, and `test/editor/utils/table-actions.test.ts` remains exported from the unchanged path. Avoid consumer import rewrites unless TypeScript module resolution requires an explicit directory entry point. **Files:** `src/editor/utils/table-actions.ts`, optionally `src/editor/utils/table-actions/index.ts`; inspect the table-action consumers and extend `test/editor/utils/table-actions.test.ts` with facade-level behavioral coverage. **Dependencies:** Tasks 2-7. **Logging:** Confirm the facade is log-free and all operation-level logging remains in the extracted modules.

- [x] **Task 9: Run static and focused behavioral validation and review the refactor diff.** Run `npx vitest run test/editor/utils/table-actions.test.ts`, `npm run typecheck`, and `npm run lint`. Resolve only extraction-caused behavioral, import/export, type, lint, or module-resolution errors. Inspect the diff to confirm no table command behavior, consumer import path, error text, or unrelated workspace changes are altered. **Files:** all files created or modified by Tasks 1-8. **Dependencies:** Task 8. **Logging:** Validate that no logging was added, removed, renamed, or moved across behavior boundaries beyond equivalent relocation with its function.

- [x] **Task 10: Record mandatory TDD evidence for the extraction.** Add a facade-level explicit row-insertion test, run it RED against a controlled incorrect implementation of `addRowColumn`, then restore the extracted implementation and run the same command GREEN. Record the exact command and observed results below. **Files:** `test/editor/utils/table-actions.test.ts`, `src/editor/utils/table-actions/add-delete.ts`, `.ai-factory/plans/split-table-action-modules.md`. **Dependencies:** Task 9.

## TDD Evidence

- **RED — 2026-07-14:** Temporarily introduced the controlled behavioral regression `if (args.side === 'above') return false` at the start of `addRowColumn` in `src/editor/utils/table-actions/add-delete.ts`. Running `npx vitest run test/editor/utils/table-actions.test.ts -t "inserts a row above an explicit source row through the compatibility facade"` failed as intended: `1 failed | 19 skipped (20)`, with the facade assertion receiving `false` instead of the expected `true`. The temporary line was removed immediately after this run and is not part of the final change.
- **GREEN — 2026-07-14:** After restoring `addRowColumn`, the same command passed: `1 passed | 19 skipped (20)`.
- **Focused regression suite — 2026-07-14:** `npx vitest run test/editor/utils/table-actions.test.ts` passed: `20 passed (20)`.
