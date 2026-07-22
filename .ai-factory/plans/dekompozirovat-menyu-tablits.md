<!-- handoff:task:ff7e1c36-2778-4609-ba7e-669a24e1aec9 -->
# Implementation Plan: Decompose Table Handle Menus

**Mode:** Fast
**Created:** 2026-07-21
**Branch:** `main` (fast-plan mode; no branch changes)
**Scope:** Behavior-preserving Vue refactor of the row/column table-handle menu and control markup.

## Settings

- [x] **Testing:** Yes — the July 21, 2026 rework requires focused Vitest coverage and recorded RED/GREEN evidence for the decomposed table-menu behavior.
- [ ] **Logging:** Verbose planning default; do not introduce new runtime logging. Preserve the existing `console.warn` in `TableHandle.vue` for failed row/column selection, and use typecheck/lint output only as local implementation diagnostics.
- [ ] **Docs:** No — do not modify product or developer documentation.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** Skipped by autonomous Handoff defaults.

## Goal

Reduce duplication in `packages/editor/src/components/table/TableHandle.vue` and `packages/editor/src/components/table/TableHandleMenuContent.vue` by:

1. modelling row/column action groups as typed reactive data;
2. rendering repeated menu action and action-group UI through focused presentational components;
3. rendering row and column drag/menu controls through one orientation-aware component.

Keep every existing table operation, menu primitive contract, positioning behavior, and editor integration unchanged.

## Behavioral Invariants

- [x] Preserve all row and column actions: toggle header, move, add, sort, cell color, table-cell alignment, clear contents, duplicate, and delete.
- [x] Preserve the current action labels, icons, order, group/separator placement, visibility rules, enabled/disabled state, and header active state for both orientations.
- [x] Preserve `TableHandleMenuContent` props and reactive selection refresh through `useEditorSelectionSignal`; all actions must continue using the current `editor`, `index`, `orientation`, and `tablePos`.
- [x] Continue reusing `ColorMenu.vue` and `TableAlignMenu.vue` rather than duplicating or changing their table-cell behavior.
- [x] Preserve `TableHandle` teleport mounting, row/column Floating UI references and styles, opposite-handle hiding while a menu is open, menu open/close freeze state, full line selection, drag classes, drag start/end calls, and drag-flag reset when handles disappear.
- [x] Preserve trigger semantics and accessibility: `button` type, labels, `aria-haspopup`, `aria-expanded`, placement (`top-start` for rows and `bottom-start` for columns), and `MenuContent` close propagation.
- [x] Do not change public component exports, `EditorProvider.vue` integration, Tiptap table commands, table action helpers, CSS, dependencies, tests, or documentation.

## Tasks

### Phase 1 — Extract Repeated Menu Presentation

- [x] **1. Create focused table-handle menu presentation components.**
  - [x] **Files:** Create `packages/editor/src/components/table/TableHandleMenuAction.vue` and `packages/editor/src/components/table/TableHandleMenuActionGroup.vue`.
  - [x] Implement a typed, presentation-only action row that renders the existing `MenuItem`/ghost `Button` structure from an action object, including icon, label, disabled state, selection handler, and optional active state.
  - [x] Implement a presentation-only group that renders a non-empty action array with the existing `MenuGroup`, stable item keys, and optional trailing horizontal separator; keep it free of editor/composable/table-command imports.
  - [x] Match existing classes and primitive attributes exactly so disabled styling, keyboard selection, and active-state data attributes remain unchanged.
  - [x] **Expected behavior:** any ordinary table-handle action can be rendered from data without duplicating the `MenuItem`/`Button` template and without changing command execution.
  - [x] **Dependencies:** None.
  - [x] **Logging:** Add no runtime logs; components remain stateless and silent.

### Phase 2 — Convert Table Menu Actions to Data

- [x] **2. Rebuild `TableHandleMenuContent` around typed section data and the extracted presentation components.**
  - [x] **Files:** Modify `packages/editor/src/components/table/TableHandleMenuContent.vue`; consume `packages/editor/src/components/table/TableHandleMenuAction.vue` and `packages/editor/src/components/table/TableHandleMenuActionGroup.vue`.
  - [x] Retain one reactive base-arguments computation driven by `useEditorSelectionSignal`, then normalize header, move, add, sort, clear, duplicate, and delete into typed action records/section arrays consumed by the template.
  - [x] Keep the first-index-only header condition, header active state, direction/side-specific icons and labels, and all current `can*`/visibility checks. Do not convert unavailable commands into selectable rows.
  - [x] Render move, add, sort, and footer actions through the shared group/action components; keep the Color/Alignment subsection explicit so `ColorMenu` and `TableAlignMenu` retain their current injected-editor and prop behavior, while rendering clear through the shared action component.
  - [x] Preserve the current `15rem` menu width, exact group order, and separators, including no leading/trailing separator when an optional action group is absent.
  - [x] **Expected behavior:** the SFC coordinates menu data and unique submenu content only; every existing row and column command remains available under the same conditions and executes the same helper with unchanged arguments.
  - [x] **Dependencies:** Task 1.
  - [x] **Logging:** Add no logs; retain action-helper error handling and use local static-check output for diagnostics only.

### Phase 3 — Unify Row/Column Handle Controls

- [x] **3. Extract the repeated draggable row/column menu control and reduce `TableHandle` to state coordination.**
  - [x] **Files:** Create `packages/editor/src/components/table/TableHandleControl.vue`; modify `packages/editor/src/components/table/TableHandle.vue`.
  - [x] Move the duplicated `Menu` trigger, draggable button, `MenuContent`, and `TableHandleMenuContent` wiring into an orientation-aware control component. Accept only the orientation-specific state/presentation inputs it needs (open state, dragging state, floating reference/style, current index, and table position) and emit explicit open-change and drag lifecycle events back to the parent.
  - [x] Keep orientation-specific placement, CSS modifier, ARIA label, index binding, and row/column drag event mapping deterministic within the control; it must not own editor lookup, selection, freeze/unfreeze, table positioning, or drag-state mutations.
  - [x] Retain `TableHandle.vue` as the coordinator for editor/state subscriptions, positioning composables, visibility calculations, `selectLine`, menu freeze/unfreeze, `rowDragStart`/`colDragStart`/`dragEnd`, and hidden-handle drag reset. Remove only imports/template branches made redundant by the extraction.
  - [x] Review both orientation paths to ensure opening a handle still selects the full row/column, hides the opposite handle, keeps the menu mounted when hover state clears, and unfreezes handles only when the matching menu closes.
  - [x] **Expected behavior:** consumers and `EditorProvider.vue` keep mounting `TableHandle` unchanged, while row and column UI differ only through explicit orientation data rather than duplicated markup.
  - [x] **Dependencies:** Task 2 may proceed independently at first, but complete this task after Task 2 so the final integration review covers the recomposed menu.
  - [x] **Logging:** Do not add new logs or remove the existing selection-failure warning; preserve current silent drag/menu behavior otherwise.

### Phase 4 — Perform Static Validation

- [x] **4. Validate the refactor boundaries and behavior-preservation checklist.**
  - [x] **Files:** Inspect the modified and new files under `packages/editor/src/components/table/`; inspect `packages/editor/src/components/notion/EditorProvider.vue`, `packages/editor/src/components/table/TableCellHandleMenu.vue`, and `packages/editor/src/components/ui/TableAlignMenu.vue` without changing them unless a direct compatibility correction is required.
  - [x] Run `npm run typecheck --workspace=@i-prikot/editor` and `npm run lint --workspace=@i-prikot/editor`; these are static checks, not automated test suites.
  - [x] Review the diff and manually trace both row and column configurations: closed/open menu state, header availability at index `0`, optional movement/add/sort groups, color/alignment/clear group, duplicate/delete group, and drag start/end cleanup.
  - [x] Confirm no test or documentation files were added or modified and that no changes leaked into table action utilities, extension commands, public exports, styles, or unrelated menu consumers.
  - [x] **Expected behavior:** Vue/TypeScript and lint checks pass, and inspection confirms the full action set plus handle lifecycle remain behaviorally equivalent.
  - [x] **Dependencies:** Tasks 1–3.
  - [x] **Logging:** Preserve verbose command output as local diagnostics only; add no production logging.

### Phase 5 — Rework: Add Behavioral Regression Coverage

- [x] **5. Protect the decomposed table-menu behavior with targeted component tests.**
  - [x] **Files:** Added focused Vitest coverage under `test/editor/components/` for `TableHandleMenuContent.vue`, `TableHandleControl.vue`, and `TableHandle.vue`; this plan records the observed RED/GREEN command outcomes.
  - [x] Verify row and column action groups expose the expected actions only when their helpers allow them, and that selecting an action calls the unchanged table-action helper with the original arguments.
  - [x] Verify the extracted orientation-aware control preserves placement, ARIA state, menu-content inputs, and drag/open event forwarding.
  - [x] Verify the coordinator freezes handles and selects the correct row or column on open, hides the opposite control while open, and unfreezes only when the matching control closes.
  - [x] **Expected behavior:** tests protect the behavioral contracts preserved by Tasks 1–3 without changing table action helpers, extension commands, or drag algorithms.
  - [x] **Dependencies:** Tasks 1–4.
  - [x] **Logging:** Added no production logging; retained the existing selection-failure warning behavior.
  - [x] **RED evidence (July 21, 2026):** A reversible mutation changed the row placement from `top-start` to `bottom-start`; `npm run test -- test/editor/components/table-handle-control.test.ts` exited `1` with the expected placement assertion failure. The correct source was restored immediately.
  - [x] **GREEN evidence (July 21, 2026):** `npm run test -- test/editor/components/table-handle-menu-content.test.ts test/editor/components/table-handle-control.test.ts test/editor/components/table-handle.test.ts` passed (`3` files, `7` tests); `npm run typecheck --workspace=@i-prikot/editor`, `npm run lint --workspace=@i-prikot/editor`, and targeted ESLint also passed.

## Acceptance Criteria

- [x] `TableHandleMenuContent.vue` represents its ordinary action groups as typed reactive data rather than repeating per-item menu markup.
- [x] Repeated action row/group UI exists in small presentation components that contain no editor-state or table-command logic.
- [x] `TableHandle.vue` no longer contains parallel row and column menu-trigger/template implementations; an orientation-aware child renders the shared control.
- [x] Every pre-refactor table operation, condition, icon, label, disabled/active state, separator, menu placement, ARIA attribute, selection behavior, and drag lifecycle remains intact.
- [x] `ColorMenu.vue` and `TableAlignMenu.vue` remain shared, unchanged implementations for table menu consumers.
- [x] `npm run typecheck --workspace=@i-prikot/editor` and `npm run lint --workspace=@i-prikot/editor` pass; targeted behavioral tests protect the decomposed table menu.

## Out of Scope

- [ ] Adding or changing tests outside the focused table-menu behavioral coverage required by the 2026-07-21 rework request.
- [ ] Changing table command/action helper semantics, Tiptap table-handle extension behavior, or table drag-and-drop algorithms.
- [ ] Redesigning menu styles, changing CSS classes, modifying primitive menu components, or changing user-visible labels/action order.
- [ ] Refactoring `TableCellHandleMenu.vue`, `ColorMenu.vue`, `TableAlignMenu.vue`, `EditorProvider.vue`, exports, dependencies, or documentation beyond compatibility inspection.
