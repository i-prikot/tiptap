<!-- handoff:task:1dbc813e-5830-4f4b-9244-7699ca0f8ed9 -->
# Implementation Plan: Localize Component Interface Strings

Branch: `main`
Created: 2026-07-23

## Settings
- [x] Testing: rework exceptions on 2026-07-23 — updated the affected table-menu test for blocking finding `27bebd788f77`; focused Vitest file passes. Renamed conflicting color-button bindings for blocking finding `5ec7bf4af2d2`; focused ESLint and color-label Vitest checks pass.
- [ ] Logging: verbose development diagnostics only; never log resolved messages, interpolation values, editor content, or host-supplied catalogs
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 8. Локализация (i18n)"
Rationale: This migrates the remaining component-facing copy onto the already selected library-owned localization contract.

## Scope and Decisions
- [ ] Continue using the editor-scoped `useEditorI18n()` resolver and typed package catalog. Do not add `vue-i18n`, a global locale store, or a host-plugin dependency.
- [ ] Resolve text in component setup, computed state, or menu factories invoked at render time so changing `locale` or `messages` updates existing UI without recreating the editor. Do not capture translated copy at module initialization.
- [ ] Localize visible labels, tooltips, placeholders, `title` attributes, and accessible names. Exclude CSS selectors, icons, keyboard shortcuts, URLs, MIME values, and user/host content such as emoji names or uploaded-image alt text.
- [ ] Keep the English and Russian catalog trees structurally identical. Missing host overrides must retain the established English fallback and must never render raw translation keys.
- [ ] Convert internal table action label maps to typed message-key maps; pure table-action behavior remains independent of Vue and of resolved display text.

## Commit Plan
- [ ] **Commit 1** (after Tasks 1-3): `refactor(editor): localize notion and ui component copy`
- [ ] **Commit 2** (after Tasks 4-5): `refactor(editor): localize table controls and validate copy migration`

## Tasks

### Phase 1: Complete the typed translation seam
- [x] **Task 1: Add every required component-copy key and safe dynamic-message formatting to the selected resolver.** Extend the typed catalog contract and matching English/Russian namespace modules for the audited `common`, `toolbar`, `colors`, `links`, `image`, `table`, and `toc` strings, including color/action accessible-name patterns and the current-block `Turn into` label. Extend `EditorI18nContext.t` with an optional named-value argument so parameterized catalog strings (for example `{label}`) are substituted at display time while existing one-argument calls remain valid. Keep resolver fallback semantics intact and preserve key typing for every call site. **Files:** `packages/editor/src/composables/useEditorI18n.ts`, `packages/editor/src/i18n/types.ts`, `packages/editor/src/i18n/en/{common,toolbar,colors,links,image,table,toc}.ts`, `packages/editor/src/i18n/ru/{common,toolbar,colors,links,image,table,toc}.ts`, and their catalog index files only if composition exports change. **Dependencies:** none. **Logging:** retain the existing development-only `EditorI18n` locale/fallback diagnostics; do not log message keys, resolved text, interpolation values, host dictionaries, or user data.

### Phase 2: Migrate notion, primitive, and UI copy
- [x] **Task 2: Replace all `notion/` and `primitives/` interface literals with reactive resolver calls.** Migrate the loading default, table-of-contents accessible label, collaboration/default identity copy, editor facade placeholders where they originate in the component layer, and toolbar landmark text to `t(...)`. Use computed bindings rather than static prop defaults when a translated value must react to locale changes, while leaving host-provided prop values untouched. **Files:** `packages/editor/src/components/notion/feedback/LoadingSpinner.vue`, `packages/editor/src/components/notion/toc/TocSidebar.vue`, affected files under `packages/editor/src/components/notion/collaboration/` and `packages/editor/src/components/notion/notion-editor/`, and `packages/editor/src/components/primitives/toolbar/Toolbar.vue`. **Dependencies:** Task 1. **Logging:** add no component logger; continue relying on the resolver's development diagnostics and never emit interface copy or collaboration identity data.

- [x] **Task 3: Localize every hardcoded `ui/` label, metadata field, and dynamic accessibility string.** Use `useEditorI18n()` in color, drag-context, image, link, mobile-toolbar, slash-command, suggestion, and turn-into components; replace fixed template text, `aria-label`, `placeholder`, and `title` values with catalog keys. Ensure color menu data and generated aria labels use canonical color/action keys, and make `slash-menu-items.ts` plus any action/menu factories resolve labels, descriptions, and search metadata from the active resolver at factory time. Route the dynamic current-block label through the parameterized resolver instead of retaining an English template fragment. **Files:** affected files under `packages/editor/src/components/ui/color/`, `drag-context-menu/`, `image/`, `link/`, `mobile-toolbar/`, `slash-menu/`, `suggestion/`, and `turn-into/`; include `packages/editor/src/components/ui/slash-menu/slash-menu-items.ts`. **Dependencies:** Task 1. **Logging:** add no UI logging; preserve resolver diagnostics only and never log selected color names, search queries, URLs, or resolved text.

### Phase 3: Localize table controls without coupling table behavior to copy
- [x] **Task 4: Replace table-control literals and exported English table labels with typed message-key lookups.** Update table menus, handle controls, extension buttons, and clear/merge actions to call `t(...)` for visible and accessible text. Refactor internal `*_LABELS`/`CLEAR_ALL_LABEL` exports in `utils/table-actions/` into typed key maps (keeping action behavior and direction/orientation decisions unchanged), then resolve those keys inside Vue components and `useTableClearAllContents`. Cover alignment, row/column add/remove, header, move, sort, duplicate, delete, clear, and merge/split actions. **Files:** `packages/editor/src/components/table/table-align/TableAlignMenu.vue`, `packages/editor/src/components/table/table-cell-handle/TableCellHandleMenu.vue`, `packages/editor/src/components/table/table-extend/TableExtendRowColumnButtons.vue`, `packages/editor/src/components/table/table-handle/{TableHandleControl.vue,TableHandleMenuContent.vue}`, `packages/editor/src/composables/useTableClearAllContents.ts`, `packages/editor/src/utils/table-actions.ts`, and `packages/editor/src/utils/table-actions/{add-delete,clearing,headers,merge-split,movement,sorting}.ts`. **Dependencies:** Task 1. **Logging:** do not introduce logging in pure table actions; component/composable text resolution continues to use the existing development-only resolver diagnostics without action context or translated values.

### Phase 4: Validate the migration without test work
- [x] **Task 5: Perform a scoped literal audit and non-test static validation.** Search `packages/editor/src/components/{notion,ui,table,primitives}` and the table-label integration files for remaining hardcoded user-facing text; remove any discovered literals or explicitly retain only documented non-interface exemptions from the scope decisions. Confirm both catalogs satisfy the typed tree, imports stay within the established component/composable boundaries, locale changes update computed/menu output, and no raw message keys can reach the DOM. Run `npm run typecheck` and `npm run lint --workspace=@i-prikot/editor`; do not run, add, modify, or plan tests and do not make documentation changes. **Files:** all files changed by Tasks 1-4; no test or documentation files. **Dependencies:** Tasks 2-4. **Logging:** verify diagnostics remain development-only and contain no resolved copy, parameters, host messages, document content, or user data.

## Rework Record
- [x] **2026-07-23:** Resolved blocking finding `27bebd788f77` by mocking `useEditorI18n`, using table message-key fixtures with an identity `t(...)` resolver, and stubbing the directly imported `TableAlignMenu` in `test/editor/components/table-handle-menu-content.test.ts`.
- [x] **2026-07-23:** Resolved blocking finding `67b2de1e8a7b` by resolving optional color-control labels through `useEditorI18n()`: `colors.highlight`, `colors.removeHighlight`, and parameterized `colors.textColorAria`. **TDD evidence:** RED — `npm test -- --run test/editor/composables/color-label-localization.test.ts` failed because the Russian provider received `Highlight`; GREEN — the same test passes (1/1) after the resolver calls.
