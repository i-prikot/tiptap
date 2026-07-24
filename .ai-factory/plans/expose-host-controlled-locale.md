<!-- handoff:task:8f86fc9f-3dee-476a-985c-294ea8dac5c2 -->
# Implementation Plan: Expose Host-Controlled Locale

Branch: `main`
Created: 2026-07-23

## Settings
- [x] Testing: no (explicit task constraint; do not add, modify, or run automated tests)
- [x] Logging: preserve verbose, development-gated editor diagnostics; add no playground logging for locale selection, persisted values, or resolved text
- [x] Docs: no (do not create or update documentation artifacts)

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by the autonomous Handoff task configuration. This work directly supports the existing i18n roadmap item that requires a host-controlled `locale` and a persisted playground switcher.

## Scope and Decisions
- [x] Keep localization editor-scoped through the existing typed `provideEditorI18n()` / `useEditorI18n()` seam and built-in English/Russian catalogs. Do not introduce `vue-i18n`, a global locale store, a new dependency, or a second provider below `NotionEditor`.
- [x] Treat `NotionEditor` as the host API boundary: `locale` is optional, defaults through `defaultEditorLocale`, and remains reactive through `toRef(props, 'locale')`. Existing consumers that omit it must retain the Russian default and host `messages` overrides must remain independent of locale switching.
- [x] Limit the playground selector to the package's bundled `en` and `ru` locales. Persist only the selected locale under a namespaced key, reject missing/corrupt/unsupported stored values by falling back to the default locale, and never persist translated strings or full message catalogs.
- [x] A locale change must update the existing editor UI through reactive injection only. It must not change `documentId`, reset collaboration state, increment `editorSessionKey`, reseed content, or remount/recreate the editor.
- [x] Reconcile with the in-progress localization work already present in the working tree; do not overwrite unrelated i18n, component, menu, table, or dynamic-message changes.

## Tasks

### Phase 1: Finalize the reactive host locale contract
- [x] **Task 1: Verify and complete the public `locale` prop at the editor facade.**
  - [x] **Files:** modify only as needed: `packages/editor/src/components/notion/notion-editor/public-api.ts`, `packages/editor/src/components/notion/notion-editor/NotionEditor.vue`, and `packages/editor/src/composables/useEditorI18n.ts`.
  - [x] Ensure `NotionEditorProps` publicly exposes `locale?: EditorLocale` with the documented default/fallback behavior, and that `NotionEditor.vue` supplies a reactive prop reference to the single root `provideEditorI18n()` call.
  - [x] Preserve the existing typed `messages?: EditorMessageCatalog` contract, per-key built-in catalog fallback, and live update behavior. Do not forward locale through `NotionEditorContent` or `EditorProvider` merely to create another provider; descendants already consume the root injected context.
  - [x] Confirm the package root continues exporting the locale types, built-in catalogs, and default locale needed by embedding hosts and the playground without exposing internal resolver details.
  - [x] **Dependencies:** none.
  - [x] **Logging requirements:** retain only the existing redacted, development-gated `EditorI18n` diagnostics. Do not add logs containing resolved messages, host dictionaries, document content, or playground persistence state.

### Phase 2: Add the playground language switcher and persistence
- [x] **Task 2: Bind a persisted `en`/`ru` selector to the playground editor host.**
  - [x] **Files:** modify `apps/playground/src/App.vue`, `apps/playground/src/components/NotionEditorHeader.vue`, and `apps/playground/src/styles/notion-editor-header.css`.
  - [x] In `App.vue`, initialize a typed locale ref from a namespaced `localStorage` key with an explicit supported-locale guard and `defaultEditorLocale` fallback; update storage synchronously when a valid selection changes, then bind the ref to `<NotionEditor :locale="...">`.
  - [x] Extend `NotionEditorHeader.vue` with an accessible native language control (English and Russian labels), a typed locale prop, and an update event consumed by `App.vue`. Keep the existing undo/redo, theme, separator, and collaboration controls intact.
  - [x] Add only the header styles necessary to make the selector align with the existing action row in light and dark themes. Reuse existing CSS variables and avoid editor-package style changes.
  - [x] Ensure selection changes leave `editorSessionKey`, editor content, collaboration configuration, image upload behavior, URL synchronization, and theme state untouched so i18n updates in place.
  - [x] **Dependencies:** Task 1.
  - [x] **Logging requirements:** add no event, console, analytics, or storage logging for locale reads/writes/selections. Preserve existing editor development diagnostics without adding translated strings or storage values to them.

### Phase 3: Validate the live host-to-editor boundary without tests
- [x] **Task 3: Run scoped static checks and manually verify locale reactivity and persistence.**
  - [x] **Files:** inspect only the files changed in Tasks 1-2; do not create or modify test or documentation files.
  - [x] Run the applicable editor and playground TypeScript/lint/format checks (for example, workspace `typecheck` and `lint` commands plus focused Prettier verification), correcting only failures introduced by this work. Do not run automated tests because `Testing: no` is explicit.
  - [x] Manually verify a host passes `locale="en"` and `locale="ru"` to the public editor facade; confirm visible localized UI and the placeholder update in the mounted editor without changing its instance, document, or collaboration session.
  - [x] In the playground, select each language, reload the page, and confirm the selection persists. Also confirm an absent, malformed, or unsupported storage value safely falls back to `defaultEditorLocale` and is replaced only after a valid user selection.
  - [x] **Dependencies:** Task 2.
  - [x] **Logging requirements:** confirm no new locale/persistence logs exist and centralized i18n diagnostics remain development-only and redacted. Do not run automated tests.

## Completion Criteria
- [x] Embedding hosts can set a typed reactive `locale` on `NotionEditor`; omission still selects `defaultEditorLocale`, and host message overrides continue to work without a host i18n dependency.
- [x] The playground exposes an accessible English/Russian selector, passes its value to the editor, persists valid selections in `localStorage`, and safely defaults invalid stored data.
- [x] Switching locale updates the mounted editor in place without recreating it or disturbing document, collaboration, upload, URL, or theme behavior.
- [x] No test or documentation files change, no ordinary runtime locale logging is introduced, and scoped static validation passes.
