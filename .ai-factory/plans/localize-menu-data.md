<!-- handoff:task:75f020fe-f112-4dd0-933d-3fe3c94b430e -->
# Implementation Plan: Localize Menu Data

Branch: `main`
Created: 2026-07-23

## Settings
- [ ] Testing: no (explicit task constraint; do not add, modify, or run automated tests)
- [ ] Logging: verbose development diagnostics only; do not add runtime logging for normal translation resolution, resolved labels, search keywords, host catalogs, or editor content
- [ ] Docs: no (do not create or update documentation artifacts)

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by the autonomous Handoff task configuration.

## Scope and Decisions
- [x] Keep localization library-owned through the existing typed `useEditorI18n()` resolver and English/Russian package catalogs. Do not add `vue-i18n`, a global locale store, locale-specific imports in menu data, or new dependencies.
- [x] Store only stable IDs, icons, actions, and typed `EditorMessageKey` values in static menu/palette metadata. Resolve display strings with `t(...)` inside computed menu factories or render-time callbacks so existing UI reflects live `locale` and `messages` changes without recreating the editor.
- [x] Preserve host-owned copy exactly: `SlashMenuConfig.customItems`, `itemGroups` group overrides, and persisted labels for unknown/custom recent colors remain caller data rather than being translated by the editor package.
- [x] Preserve command IDs, node/mark names, CSS values, color tokens, icon selection, item ordering, disabled/active checks, keyboard shortcuts, and existing action/error diagnostics. Do not overwrite unrelated in-progress localization changes already present in the working tree.

## Tasks

### Phase 1: Normalize Menu Metadata
- [x] **Task 1: Complete typed key-based metadata for slash and drag-context menus.**
  - [x] **Files:** modify `packages/editor/src/components/ui/slash-menu/slash-menu-items.ts`, `packages/editor/src/components/ui/slash-menu/SlashDropdownMenu.vue`, `packages/editor/src/composables/useDragContextMenuItems.ts`, `packages/editor/src/i18n/en/menus.ts`, and `packages/editor/src/i18n/ru/menus.ts` only where a required leaf is missing or a literal remains.
  - [x] Reconcile the existing in-progress slash-menu migration so `ITEM_METADATA` keeps typed title, description, keyword, and group keys while `getSlashMenuItems()` resolves them through its injected resolver at item-generation time; retain custom item and custom group-string precedence.
  - [x] Make every built-in DragContextMenu and turn-into label resolve inside its computed item factory with `t(...)`; do not reuse static English `label` fields exposed by underlying command composables. Keep each original conditional visibility, shortcut, action, active state, and ordering intact.
  - [x] Add or align matching English and Russian catalog leaves for every built-in string moved into these factories, including slash search keywords as pipe-delimited localized values. Keep catalog keys type-safe against `EditorMessageKey`.
  - [x] **Logging requirements:** add no ordinary localization logs. Preserve the resolver's existing development-only fallback diagnostics without passing resolved messages, menu queries, host override objects, or document data into logs.

### Phase 2: Localize Table-Handle Actions
- [x] **Task 2: Ensure table-handle action data exports message keys and resolves labels reactively.**
  - [x] **Files:** modify `packages/editor/src/components/table/table-handle/TableHandleMenuContent.vue`, relevant `packages/editor/src/utils/table-actions/*.ts` label maps, and `packages/editor/src/i18n/en/table.ts` / `packages/editor/src/i18n/ru/table.ts` only as required for missing keys.
  - [x] Convert all built-in row/column header, movement, insertion, sorting, clear, duplicate, and delete metadata from rendered label strings to typed table message keys; keep table-action helpers presentation-free and free of Vue/i18n imports.
  - [x] Resolve each key in `TableHandleMenuContent.vue`'s reactive item computations using `useEditorI18n().t`, including orientation- and selection-dependent labels. Preserve the current actions, disabled states, separator/group layout, and table selection behavior.
  - [x] Reconcile rather than replace the working-tree changes in `TableHandleMenuContent.vue` and related table action files so this task remains compatible with concurrent localization work.
  - [x] **Logging requirements:** no new table-menu logging. Preserve existing table-action errors/diagnostics and rely on the centralized development-only i18n fallback events for missing translation keys; never log labels, table content, or selection data solely for localization.

### Phase 3: Remove Palette Name Literals
- [x] **Task 3: Make built-in color palette names key-only and resolve them at UI computation time.**
  - [x] **Files:** modify `packages/editor/src/types/color.ts`, `packages/editor/src/composables/useColorText.ts`, `packages/editor/src/composables/useColorHighlight.ts`, `packages/editor/src/composables/useColorMenu.ts`, `packages/editor/src/components/ui/color/ColorTextPopoverContent.vue`, `packages/editor/src/components/ui/color/ColorHighlightPopoverContent.vue`, `packages/editor/src/i18n/en/colors.ts`, and `packages/editor/src/i18n/ru/colors.ts` as needed.
  - [x] Replace English `label` literals in the built-in `TEXT_COLORS` and `HIGHLIGHT_COLORS` definitions with required typed color message keys. Keep color CSS variables, contrast/border values, serialization values, and palette order unchanged.
  - [x] Adjust color metadata and helper typing so catalog-backed palette entries resolve through `t(...)` at computed/render time, while arbitrary persisted recent colors retain their supplied label only when no known palette value/key exists.
  - [x] Apply the same resolver to accessible color controls, navigation items, color-change payloads, and recent-color comparisons so a locale/message update refreshes names without rebuilding palette constants or translating custom values.
  - [x] **Logging requirements:** do not log color names, CSS values, recent-color storage contents, or resolver output. Retain any existing development-only diagnostics and non-localization error behavior unchanged.

### Phase 4: Static Completion Validation
- [x] **Task 4: Validate localization boundaries and render-time resolution without test work.**
  - [x] **Files:** inspect every file changed in Tasks 1–3; do not create or modify test or documentation files.
  - [x] Run the editor package's applicable TypeScript and focused lint/format validation for changed files; correct only type, import-order, formatting, or lint failures caused by this migration.
  - [x] Perform a targeted literal scan across slash-menu, drag-context-menu, table-handle/table-action, and color-palette modules. Reconcile legitimate non-rendered identifiers and host-provided fallback data, and confirm built-in visible labels map to typed catalog keys.
  - [x] Manually exercise or inspect the reactive paths to confirm that changing editor `locale` or `messages` updates slash results, drag-context items, table-handle items, palette names, recent known-color names, and related accessible labels without remounting or recreating the editor.
  - [x] **Logging requirements:** validation must confirm that no runtime translation logging was introduced and that missing-key/fallback diagnostics remain development-gated and redacted. Do not run automated tests because `Testing: no` is explicit.

## Rework (2026-07-23)
- [x] Refresh an active slash suggestion lifecycle through the plugin so locale or catalog changes rerun `onUpdate` and rebuild the current query results.
- [x] Replace `TURN_INTO_BLOCKS` English `label` literals with typed `messageKey` metadata so direct consumers receive only localizable keys.
- [x] Verify the focused formatter, ESLint, and editor TypeScript checks; automated tests remain unrun because `Testing: no` is explicit.

## Completion Criteria
- [x] Built-in slash, drag-context, and table-handle menu labels, descriptions, groups, and keywords originate from typed English/Russian catalog keys and resolve at menu-generation or computed-render time.
- [x] Built-in text/highlight palette names contain no hardcoded user-facing English labels; known recent palette values use localized names while unknown custom recents preserve host data.
- [x] Locale and host-message changes update existing menu/palette UI without introducing a global i18n dependency, stale module-initialized text, or editor recreation.
- [x] Internal command behavior and host customization contracts remain unchanged, no tests/docs are added, and only localization-related validation fixes are made.
