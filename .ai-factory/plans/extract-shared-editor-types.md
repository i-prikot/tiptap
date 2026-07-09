<!-- handoff:task:977b7529-6f31-45b6-92ba-17e1287c2174 -->
# Implementation Plan: Extract Shared Editor Types

Branch: main
Created: 2026-07-09

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 1. TypeScript: строгость и типы — Создать `src/editor/types/` и вынести туда общие интерфейсы (пользователь, TOC-элемент, цвет, пункт меню, suggestion-item)"
Rationale: This plan directly implements the unchecked roadmap item for centralizing shared editor interfaces.

## Scope
Create `src/editor/types/` as the shared type boundary for editor-wide reusable interfaces. Move reusable user, table-of-contents item, color, menu item, and suggestion item types out of feature/composable/component files, then update imports across the editor codebase without changing runtime behavior.

## Current Type Hotspots
- [x] User types: `CollabUser` in `src/editor/composables/useUser.ts`, `CaretUser` in `src/editor/components/notion/CollabUsers.vue`, and `MentionUser` in `src/editor/components/ui/MentionDropdownMenu.vue`.
- [x] Table-of-contents type: `TocItem` alias in `src/editor/utils/toc-utils.ts`, consumed by TOC composables/components.
- [x] Color types: `TextColor` in `src/editor/composables/useColorText.ts`, `HighlightColor` in `src/editor/composables/useColorHighlight.ts`, and `RecentColor` in `src/editor/composables/useRecentColors.ts`.
- [x] Menu item types: `MenuActionItem` in `src/editor/components/table/TableHandleMenuContent.vue`, duplicated `TurnIntoItem` shapes in drag/mobile/turn-into UI, and slash menu item interfaces in `src/editor/components/ui/slash-menu-items.ts`.
- [x] Suggestion item type: `SuggestionItem` in `src/editor/utils/suggestion/suggestion.ts`, imported by slash, mention, emoji, and generic suggestion menu UI.

## Tasks

### Phase 1: Shared Type Package
- [x] Task 1: Create the shared editor type directory and barrel exports.
  - [x] Deliverable: Add `src/editor/types/` with `index.ts` plus focused modules such as `user.ts`, `toc.ts`, `color.ts`, `menu.ts`, and `suggestion.ts`.
  - [x] Expected behavior: Consumers can import shared types from either `src/editor/types` or a focused module without circular runtime dependencies.
  - [x] Files: `src/editor/types/index.ts`, `src/editor/types/user.ts`, `src/editor/types/toc.ts`, `src/editor/types/color.ts`, `src/editor/types/menu.ts`, `src/editor/types/suggestion.ts`.
  - [x] Logging requirements: Type-only setup; add no runtime logging. If implementation scripts emit progress, keep messages verbose and limited to changed file paths.
  - [x] Dependencies: None.

- [x] Task 2: Move user-related interfaces into shared user types.
  - [x] Deliverable: Move `CollabUser`, `CaretUser`, and `MentionUser`-style shapes into `src/editor/types/user.ts`, choosing names that preserve existing intent and avoid broad ambiguous names like `User` where context matters.
  - [x] Expected behavior: `provideUser`, collaboration user list rendering, and mention search keep the same data shape and runtime behavior.
  - [x] Files: `src/editor/types/user.ts`, `src/editor/composables/useUser.ts`, `src/editor/components/notion/CollabUsers.vue`, `src/editor/components/ui/MentionDropdownMenu.vue`, `src/editor/components/ui/MentionMenuItem.vue`.
  - [x] Logging requirements: No runtime logging changes. If a runtime user flow must be touched, preserve existing behavior and avoid logging user names, IDs, avatars, or other potentially identifying values.
  - [x] Dependencies: Task 1.

- [x] Task 3: Move table-of-contents item typing into shared TOC types.
  - [x] Deliverable: Move the `TocItem` alias/type boundary from `src/editor/utils/toc-utils.ts` into `src/editor/types/toc.ts`, keeping compatibility with `TableOfContentDataItem` from `@tiptap-pro/extension-table-of-contents`.
  - [x] Expected behavior: TOC context, sidebar navigation, node rendering, and TOC utilities use the shared type and continue to receive the same item shape from Tiptap.
  - [x] Files: `src/editor/types/toc.ts`, `src/editor/utils/toc-utils.ts`, `src/editor/composables/useToc.ts`, `src/editor/components/notion/TocSidebar.vue`, `src/editor/nodes/toc/TocNodeView.vue`.
  - [x] Logging requirements: No runtime logging changes. If navigation code is modified beyond imports, keep any temporary debug output out of committed code.
  - [x] Dependencies: Task 1.

### Phase 2: Shared UI Types
- [x] Task 4: Move reusable color interfaces into shared color types.
  - [x] Deliverable: Move `TextColor`, `HighlightColor`, and `RecentColor` into `src/editor/types/color.ts`; introduce only minimal helper union/base types if they reduce duplication without changing object shapes.
  - [x] Expected behavior: Color palettes, recent-color storage, color popovers, color menu, and color composables keep the same labels, values, CSS class names, storage format, and application behavior.
  - [x] Files: `src/editor/types/color.ts`, `src/editor/composables/useColorText.ts`, `src/editor/composables/useColorHighlight.ts`, `src/editor/composables/useRecentColors.ts`, `src/editor/components/ui/ColorMenu.vue`, `src/editor/components/ui/ColorHighlightPopover.vue`, `src/editor/components/ui/ColorHighlightPopoverContent.vue`, `src/editor/components/ui/ColorTextPopoverContent.vue`.
  - [x] Logging requirements: Do not add runtime logging around color selection or localStorage. If localStorage parsing is touched, preserve current error handling and avoid logging stored values.
  - [x] Dependencies: Task 1.

- [x] Task 5: Move reusable menu item interfaces into shared menu types.
  - [x] Deliverable: Move generic reusable menu item shapes into `src/editor/types/menu.ts`, including table action menu item and turn-into menu item shapes where the same structure appears in multiple UI files.
  - [x] Expected behavior: Table handle menus, drag context menus, mobile toolbar menus, and turn-into dropdowns keep the same labels, icons, disabled states, selection handlers, and submenu behavior.
  - [x] Files: `src/editor/types/menu.ts`, `src/editor/components/table/TableHandleMenuContent.vue`, `src/editor/components/ui/DragContextMenu.vue`, `src/editor/components/ui/MobileToolbar.vue`, `src/editor/components/ui/TurnIntoDropdownContent.vue`.
  - [x] Logging requirements: No runtime logging changes. If menu command execution is touched, preserve existing command behavior and do not add logs for every selection.
  - [x] Dependencies: Task 1.

- [x] Task 6: Move suggestion item typing into shared suggestion types.
  - [x] Deliverable: Move `SuggestionItem<Context>` from `src/editor/utils/suggestion/suggestion.ts` into `src/editor/types/suggestion.ts`; re-export or import it so existing generic suggestion utilities and UI components use the shared type.
  - [x] Expected behavior: Slash, mention, emoji, and generic suggestion menus keep type inference for `context`, `command`, `title`, `subtext`, icons, keyboard navigation, and filtering.
  - [x] Files: `src/editor/types/suggestion.ts`, `src/editor/utils/suggestion/suggestion.ts`, `src/editor/components/ui/SuggestionMenu.vue`, `src/editor/components/ui/EmojiDropdownMenu.vue`, `src/editor/components/ui/MentionDropdownMenu.vue`, `src/editor/components/ui/MentionMenuItem.vue`, `src/editor/components/ui/SlashMenuItem.vue`, `src/editor/components/ui/slash-menu-items.ts`.
  - [x] Logging requirements: No runtime logging changes. Do not log suggestion queries or selected suggestion payloads because they may contain document text.
  - [x] Dependencies: Task 1.

### Phase 3: Import Cleanup and Verification
- [x] Task 7: Normalize type imports and remove obsolete local definitions.
  - [x] Deliverable: Update all affected files to use `import type` from shared type modules, remove duplicated local interfaces, and keep runtime imports unchanged.
  - [x] Expected behavior: No new circular dependencies, no runtime bundle changes from type-only imports, and all affected components/composables compile with the same public behavior.
  - [x] Files: All files touched by Tasks 2-6 plus any additional editor files found importing moved types.
  - [x] Logging requirements: No runtime logging changes. Keep cleanup limited to type imports and definitions; do not add console output.
  - [x] Dependencies: Tasks 2, 3, 4, 5, and 6.

- [x] Task 8: Run type-focused validation without adding tests.
  - [x] Deliverable: Run existing validation commands that do not create tests, preferably `npm run typecheck`, and optionally `npm run lint` if typecheck passes quickly.
  - [x] Expected behavior: The shared type extraction compiles under the current Vue/TypeScript configuration; any unrelated pre-existing failures are recorded separately without expanding scope.
  - [x] Files: No source changes expected unless validation reveals direct regressions from this refactor.
  - [x] Logging requirements: Capture command names and pass/fail status in implementation notes; do not add application logging.
  - [x] Dependencies: Task 7.

## Commit Plan
- [ ] **Commit 1** (after tasks 1-3): `refactor(editor): add shared user and toc types`
- [ ] **Commit 2** (after tasks 4-6): `refactor(editor): centralize color menu and suggestion types`
- [ ] **Commit 3** (after tasks 7-8): `chore(editor): normalize shared type imports`

## Implementation Notes
- [x] Keep this as a type extraction/refactor only; do not change editor behavior, labels, palettes, suggestion filtering, TOC navigation, or menu command logic.
- [x] Prefer focused type modules plus a barrel export. Avoid importing runtime code from `src/editor/types/`.
- [x] Use `import type` consistently for moved interfaces to prevent runtime dependency changes.
- [x] Do not add new tests or documentation files for this task because the plan was requested with `tests:false` and `docs:false`.
- [x] Validation: `npm run typecheck` passed.
- [x] Validation: `npm run lint` passed.
