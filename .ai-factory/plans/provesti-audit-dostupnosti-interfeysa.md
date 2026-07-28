<!-- handoff:task:2cec5c2d-1087-4aa0-95ef-4cb7ac62be75 -->
# Implementation Plan: Audit Editor Interface Accessibility

Branch: `main` (fast Handoff plan; do not create or switch branches)
Created: 2026-07-27

## Settings
- [ ] Testing: no — the Handoff task explicitly sets `tests:false`; do not add or modify automated tests despite the default TDD rule in `.ai-factory/RULES.md`.
- [ ] Logging: verbose, development-only — normal keyboard/focus transitions must not emit production logs because they are high-frequency library events. If diagnostics are needed while implementing, use the established logger (not `console`) at `DEBUG`, include only component/action/state, and exclude editor content, queries, and user data.
- [ ] Docs: no — the Handoff task explicitly sets `docs:false`; do not create consumer documentation or changelog entries.

## Roadmap Linkage
Milestone: "none"
Rationale: Fast autonomous Handoff mode skips roadmap linkage.

## Scope and Audit Baseline
- [x] Scope is the public Vue editor package under `packages/editor/src`; preserve its existing component catalog-barrel boundaries (`primitives` → `ui`/`table`/`notion`).
- [x] Inspect every direct consumer of `Menu`, `DropdownMenu`, `Popover`, and `Toolbar` while applying the shared contract. Priority surfaces are formatting and mobile toolbars, turn-into, color/link popovers, drag/table context menus, and slash/mention/emoji suggestions.
- [x] Current finding: `DropdownMenuTrigger.vue`, `Menu.vue`, and `Popover.vue` use a `display: contents` wrapper with click-only state management. Their actual triggers do not receive a complete `aria-haspopup`, `aria-expanded`, or `aria-controls` relationship.
- [x] Current finding: `DropdownMenuContent.vue`, `MenuContent.vue`, and `Popover.vue` close on `Escape` or outside pointer input, but do not establish an opening focus target or reliably return focus to the invoking trigger after keyboard dismissal, selection, or outside dismissal.
- [x] Current finding: `DropdownMenuItem.vue` and `MenuItem.vue` render role-bearing `div` wrappers around native `Button` controls in multiple consumers (for example `TurnIntoDropdownContent.vue`). This creates nested interactive semantics and does not provide a roving-tabindex menu contract.
- [x] Current finding: primitive menus do not consistently implement `ArrowUp`/`ArrowDown`, `Home`/`End`, `Enter`/`Space`, or hierarchical `ArrowLeft`/`ArrowRight` behavior. `useMenuNavigation.ts` currently covers toolbar/suggestion flows only.
- [x] Current finding: `SuggestionMenu.vue` exposes `role="listbox"`, while its slash, mention, and emoji item buttons do not expose matching `option`, `aria-selected`, and `aria-activedescendant` semantics for the active virtual item.
- [x] Current finding: generic popovers lack an explicit accessible role/name contract, so form-like link and palette popovers need consumer-provided labels and predictable focus treatment.

## Accessibility Contract
- [x] Native `<button>` remains the sole interactive element for actions; do not leave `role="menuitem"` or `role="button"` wrappers around another focusable control.
- [x] Menu triggers expose `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`; menu contents have stable IDs and `role="menu"`; enabled menu actions are `role="menuitem"` with one roving tab stop.
- [x] Non-modal popovers expose a role and accessible name appropriate to their content. Link-editing surfaces use an explicitly labelled dialog-like contract; color and other action pickers use their matching menu/listbox contract rather than an unlabeled generic container.
- [x] On open, move focus only when the interaction begins from the keyboard; on close, restore it to the still-connected invoking trigger unless selection intentionally returns focus to the ProseMirror editor. Do not trap focus in non-modal surfaces.
- [x] Suggestions retain editor focus and use `aria-activedescendant` on the editor; the selected item is announced through `role="option"` and `aria-selected`.
- [x] Keep existing pointer behavior, Floating UI placement, Teleport targets, close-on-select behavior, and editor-selection preservation intact.

## Tasks

### Phase 1: Shared Interaction Foundation
- [x] **Task 1: Introduce a shared overlay accessibility/focus helper and expose it through the composable barrel.**
  - [x] Files: `packages/editor/src/composables/useOverlayAccessibility.ts` (new), `packages/editor/src/composables/index.ts`, `packages/editor/src/composables/useMenuNavigation.ts`.
  - [x] Deliverable: centralize stable content-ID generation, capture/restore of the invoking trigger, keyboard-origin detection, guarded focus movement, and reusable roving-item helpers. Extend the existing menu-navigation API only where it makes menu, toolbar, and suggestion behavior consistent; preserve its existing public consumers.
  - [x] Behavior: skip disabled/hidden items, tolerate unmounted Teleport content, avoid stealing focus from pointer users, and make focus restoration a no-op when the trigger was removed or an item command has focused the editor.
  - [x] Logging: emit no normal open/close/focus logs. If the project has an established logger, optionally add development-only `DEBUG` diagnostics for impossible references or failed focus restoration, containing component/action/state only; otherwise add no logger dependency or `console` calls.
  - [x] Dependency notes: this contract is required before changing primitive menu and popover interactions.

### Phase 2: Primitive Menus and Toolbar
- [x] **Task 2: Make `DropdownMenu` an ARIA-connected, keyboard-operable single-level menu without nested interactive controls.**
  - [x] Files: `packages/editor/src/components/primitives/dropdown-menu/DropdownMenu.vue`, `DropdownMenuTrigger.vue`, `DropdownMenuContent.vue`, `DropdownMenuItem.vue`, `dropdown-menu-context.ts`, and `packages/editor/src/components/ui/turn-into/TurnIntoDropdown.vue`, `TurnIntoDropdownContent.vue` as the reference consumer migration.
  - [x] Deliverable: pass trigger/content references and stable IDs through context; apply `aria-haspopup`, `aria-expanded`, and `aria-controls` to the actual trigger; set an ID on menu content; replace role-bearing wrappers around `Button` with a single interactive menuitem implementation.
  - [x] Behavior: support `ArrowUp`/`ArrowDown`, `Home`/`End`, `Enter`/`Space`, and `Escape`; open from the trigger with the expected first/last item; close after enabled selection when `closeOnSelect` is true; restore focus to the trigger on cancellation/outside dismissal without preventing editor commands from refocusing the editor.
  - [x] Logging: preserve the shared development-only diagnostics policy from Task 1; never log menu labels, editor contents, or every keypress.
  - [x] Dependency notes: depends on Task 1. Apply the same contract to all remaining direct `DropdownMenu*` consumers discovered by the scoped inventory before considering this task complete.

- [x] **Task 3: Rework hierarchical `Menu` primitives and migrate context/table/color consumers to one focusable semantic action per item.**
  - [x] Files: `packages/editor/src/components/primitives/menu/Menu.vue`, `MenuContent.vue`, `MenuItem.vue`, `menu-context.ts`; priority consumers `packages/editor/src/components/ui/drag-context-menu/DragContextMenu.vue`, `packages/editor/src/components/ui/color/ColorMenu.vue`, `packages/editor/src/components/table/table-align/TableAlignMenu.vue`, `packages/editor/src/components/table/table-cell-handle/TableCellHandleMenu.vue`, and `packages/editor/src/components/table/table-handle/TableHandleMenuContent.vue`.
  - [x] Deliverable: add trigger/content ARIA relationships and a roving focus model that works across nested menus while keeping the current hover delay and `closeAll` behavior.
  - [x] Behavior: `ArrowRight` opens and enters a submenu; `ArrowLeft` closes it and returns to its parent trigger; `Escape` closes the active level and restores the appropriate trigger; `Enter`/`Space` select enabled terminal actions; pointer traversal between a trigger and its Teleported submenu remains functional.
  - [x] Logging: use only the Task 1 development `DEBUG` hook for impossible focus/reference states; do not add high-volume interaction telemetry or log user-visible menu labels.
  - [x] Dependency notes: depends on Tasks 1–2 for the shared interaction API and single-action item convention. Preserve `closeOnSelect=false` behavior for menus that intentionally remain open.

- [x] **Task 4: Harden toolbar and generic popover semantics, then label and migrate affected toolbar/form surfaces.**
  - [x] Files: `packages/editor/src/components/primitives/toolbar/Toolbar.vue`, `packages/editor/src/components/primitives/button/Button.vue`, `packages/editor/src/components/primitives/popover/Popover.vue`; priority consumers `packages/editor/src/components/ui/toolbar/NotionToolbarFloating.vue`, `packages/editor/src/components/ui/mobile-toolbar/MobileToolbar.vue`, `MobileToolbarMain.vue`, `MobileToolbarHighlighter.vue`, `MobileToolbarLink.vue`, `packages/editor/src/components/ui/color/ColorHighlightPopover*.vue`, `ColorTextPopover*.vue`, and `packages/editor/src/components/ui/link/LinkPopover.vue`, `LinkContent.vue`.
  - [x] Deliverable: keep `role="toolbar"` and give every icon-only control an accessible name; ensure toolbar roving navigation does not hijack text inputs or controls inside open overlays; add a typed popover semantics API for role, label/labelledby, initial focus, and focus-return policy.
  - [x] Behavior: toolbar arrow navigation continues to work among enabled sibling controls; Tab leaves the toolbar according to normal browser behavior; link forms receive a programmatic name and a useful initial focus; color/action surfaces announce the appropriate menu/listbox/dialog role rather than an unlabeled generic popover; `Escape` closes the active popover and returns focus predictably.
  - [x] Logging: retain the Task 1 development-only `DEBUG` policy for failed focus targets and omit normal toolbar/popup events from runtime logs.
  - [x] Dependency notes: depends on Task 1. Do not introduce focus traps or modal `aria-modal` behavior for the existing non-modal Teleported overlays.

### Phase 3: Suggestion Surface Semantics
- [x] **Task 5: Complete listbox semantics for slash, mention, and emoji suggestions while preserving editor-centric keyboard control.**
  - [x] Files: `packages/editor/src/components/ui/suggestion/SuggestionMenu.vue`, `packages/editor/src/components/ui/slash-menu/SlashMenuItem.vue`, `packages/editor/src/components/ui/mention-menu/MentionMenuItem.vue`, `packages/editor/src/components/ui/emoji-menu/EmojiMenuItem.vue`, plus `SlashDropdownMenu.vue`, `MentionDropdownMenu.vue`, and `EmojiDropdownMenu.vue` if IDs/selected state must be threaded through their slots.
  - [x] Deliverable: give the listbox a stable ID; apply its active descendant to the focused editor; give each rendered item a stable option ID, `role="option"`, and `aria-selected`; retain visual selection/scroll-into-view behavior and image alt text.
  - [x] Behavior: editor focus stays in ProseMirror while arrow navigation updates the announced active option; `Enter` selects the active item; `Escape` dismisses only the current suggestion session; empty, async-refreshing, and removed-item lists never leave a stale active descendant.
  - [x] Logging: do not log typed queries, mention identities, emoji search terms, or selected content. Limit any development diagnostics to `DEBUG` lifecycle/focus-state failures under the shared policy.
  - [x] Dependency notes: depends on Task 1 for reusable active-item ID and keyboard-state behavior; retain the existing `@pointerdown.prevent` selection-preservation contract.

## Manual Accessibility Gates
- [ ] Verify only through manual browser and assistive-technology checks; this plan intentionally contains no automated-test task.
- [ ] Keyboard-only: tab into each toolbar and trigger; open menus/popovers; traverse items with arrows, Home/End, Enter/Space, and submenu Left/Right; dismiss with Escape and outside pointer input; confirm expected focus return.
- [ ] Screen reader: confirm trigger expanded/collapsed state, menu item/action names and disabled state, labelled link/color popovers, and selected slash/mention/emoji options announced from the editor-focused listbox.
- [ ] Regression: verify pointer selection, Teleport positioning, hover submenus, close-on-select, color/link editor commands, drag-handle locking, and editor selection preservation still match current behavior.

## Commit Plan
- [ ] **Commit 1** (after Tasks 1–2): `feat(editor): add accessible dropdown menu interactions`
- [ ] **Commit 2** (after Tasks 3–4): `feat(editor): improve menu and overlay accessibility`
- [ ] **Commit 3** (after Task 5): `feat(editor): expose suggestion listbox semantics`
