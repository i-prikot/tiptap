<!-- handoff:task:c7c84f20-c385-4e9a-9a83-3805f4b439eb -->
# Implementation Plan: Clarify menu primitive boundaries

Branch: `main`
Created: 2026-07-14

## Settings

- [ ] Testing: no (explicitly disabled for this task)
- [ ] Logging: verbose (no runtime logging is expected because this work only clarifies existing contracts)
- [ ] Docs: no (no product/documentation checkpoint; source-level API guidance below is the required task deliverable)

## Roadmap Linkage

Milestone: "none"
Rationale: Autonomous Handoff mode defaults to no roadmap linkage, and this focused primitive-contract clarification has no requested milestone change.

## Decision

Retain `Menu` and `DropdownMenu` as separate primitives; do not merge them.

- [x] `Menu` is the editor-action/context-menu primitive: it supports nested submenus, hover-open and delayed-close behavior for submenus, a parent-chain `closeAll` path, and the `MenuItem` `select` contract. Existing callers use it for block, table, color, mobile-toolbar, and contextual action menus.
- [x] `DropdownMenu` is the compact trigger-owned selector primitive: it requires an explicit `DropdownMenuTrigger`, exposes `side` / `align` / `sideOffset` positioning, and provides simple content/group/label/item wrappers. Existing callers use it for standalone selector-style controls such as `TurnIntoDropdown` and collaboration-user controls.
- [x] Their overlapping Floating UI lifecycle is intentionally not a reason to combine their interaction contracts. Preserve all public component names, props, events, DOM structure, styles, and current caller assignments.

## Rework Record

- [x] 2026-07-15: Updated the reciprocal `DropdownMenu` guides to describe `Menu` placement as supplied by the owning `Menu`, matching its provided `placement: props.placement` context.
- [x] 2026-07-15: Restored the fixed `Teleport to="body"` wrappers in `MenuContent` and `DropdownMenuContent`; their boundary clarification remains comments-only and does not change overlay DOM containment.

## Tasks

### Phase 1 — Codify the primitive contracts

- [x] **1. Add a concise, reciprocal usage-boundary guide to the two primitive roots.**
  - [x] **Files:** Modify `src/editor/components/primitives/menu/Menu.vue` and `src/editor/components/primitives/dropdown-menu/DropdownMenu.vue`.
  - [x] **Deliverable:** Replace the migration-origin-only component comments with maintainable API guidance that states when to choose each primitive, identifies the supported caller categories, and explicitly directs maintainers not to substitute one for the other solely because both render positioned menus.
  - [x] **Expected behavior:** `Menu` documentation names nested submenu behavior, placement supplied by the owning `Menu`, hover timing, and parent-chain close semantics as its differentiators. `DropdownMenu` documentation names its explicit trigger composition, side/alignment/offset API, and single-level selector intent as its differentiators. Keep the current runtime implementation and public APIs unchanged.
  - [x] **Logging requirements:** Add no runtime logging. Do not log menu state, user selections, editor content, or DOM events; these comments are the only intended change.

- [x] **2. Document the behavior-level boundary at the content and item contracts that implement it.**
  - [x] **Files:** Modify `src/editor/components/primitives/menu/MenuContent.vue`, `src/editor/components/primitives/menu/MenuItem.vue`, `src/editor/components/primitives/dropdown-menu/DropdownMenuContent.vue`, and `src/editor/components/primitives/dropdown-menu/DropdownMenuItem.vue`.
  - [x] **Deliverable:** Refine the existing source comments so the distinction is visible where maintainers discover supported props and events: `MenuContent`/`MenuItem` explain nested-chain closing and `@select`; `DropdownMenuContent`/`DropdownMenuItem` explain click-based selection closing and configurable top-level placement without submenu-chain behavior.
  - [x] **Expected behavior:** Preserve all current Teleport targets, Floating UI middleware, Escape/outside-click handling, close-on-select defaults, disabled behavior, item slot structure, CSS classes, and event semantics. Do not introduce a compatibility prop, adapter, shared base component, or style migration.
  - [x] **Logging requirements:** Add no runtime logging. Retain existing diagnostics only; do not instrument open/close, pointer, keyboard, or click handlers.
  - [ ] **Dependencies:** Task 1.

### Phase 2 — Verify boundary alignment without migrations

- [x] **3. Audit direct consumers against the documented choice and preserve the current assignments.**
  - [x] **Files:** Review `src/editor/components/ui/ColorMenu.vue`, `src/editor/components/ui/DragContextMenu.vue`, `src/editor/components/ui/MobileToolbar.vue`, `src/editor/components/ui/TableAlignMenu.vue`, `src/editor/components/table/TableCellHandleMenu.vue`, `src/editor/components/table/TableHandle.vue`, `src/editor/components/ui/TurnIntoDropdown.vue`, and `src/editor/components/notion/CollabUsers.vue`; modify only a source comment if needed to remove an ambiguity discovered during the audit.
  - [x] **Deliverable:** Confirm nested/contextual editor actions remain on `Menu` and standalone trigger-owned selectors remain on `DropdownMenu`; record no migration when all existing callers satisfy the published contract.
  - [x] **Expected behavior:** No user-visible behavior changes, no component renames, no import rewrites, and no changes to menu styling or overlay positioning. A caller may move only if it demonstrably violates the new contract, which the current review does not indicate.
  - [x] **Logging requirements:** Add no runtime logging or audit telemetry. Keep this as a static contract review only.
  - [x] **Dependencies:** Tasks 1–2.

### Phase 3 — Focused non-test validation

- [x] **4. Validate the comment-only change and scope boundary.**
  - [x] **Files:** Review the files modified by Tasks 1–2 and the final diff; do not modify test files, CSS files, public API barrels, or unrelated working-tree changes.
  - [x] **Deliverable:** Run `npm run typecheck` if the repository is otherwise runnable, then inspect the diff to confirm that the work only documents the retained separation and leaves runtime behavior untouched. If type checking is blocked by pre-existing working-tree failures, report that separately without attempting unrelated repairs.
  - [x] **Expected behavior:** Type checking remains clean for the touched area; no tests are added, changed, or executed because tests are explicitly disabled.
  - [x] **Logging requirements:** Do not add runtime logs. Treat command output solely as local implementation diagnostics.
  - [x] **Dependencies:** Task 3.

## Completion Criteria

- [x] `Menu` and `DropdownMenu` each contain a clear, reciprocal source-level selection guide.
- [x] The documented boundary matches the existing implementations and their current callers.
- [x] No merge, abstraction extraction, public API change, behavior change, CSS change, or consumer migration is introduced.
- [x] No tests, test files, product documentation, roadmap entries, or unrelated working-tree files are modified.

## Out of Scope

- [ ] Merging `Menu` and `DropdownMenu`, including a shared context, trigger, item, or base-component abstraction.
- [ ] Changing Floating UI positioning, Teleport targets, dismiss behavior, submenu timers, or close-on-select behavior.
- [ ] Adding keyboard-navigation, accessibility, styling, or interaction behavior not already present.
- [ ] Adding, updating, or running tests; creating end-user documentation; or changing roadmap artifacts.

## Rework Log

- [x] 2026-07-15: Уточнено, что закрытие Menu-цепочки для конечного `MenuItem`
  зависит от `MenuContent.closeOnSelect`; при `false` событие `@select`
  срабатывает без вызова `closeAll`.
