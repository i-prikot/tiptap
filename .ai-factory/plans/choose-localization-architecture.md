<!-- handoff:task:88680ccf-acf2-44a5-af9b-c60a41b0a953 -->
# Implementation Plan: Choose Localization Architecture

Branch: `main`
Created: 2026-07-23

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 8. Локализация (i18n)"
Rationale: This decision unblocks the message-catalog, language-support, and string-migration work in the localization milestone.

## Decision

Adopt **library-owned localization with host-supplied locale and message
dictionaries**. The published `@i-prikot/editor` package must **not** add
`vue-i18n` as a dependency or peer dependency and must not call `useI18n()` or
read a host application's Vue I18n instance.

This fits the package's existing integration model: hosts configure behavior
through `NotionEditorProps` (`features`, collaboration, AI, uploads, identity,
and diagnostics), while package internals share that configuration through
`provide`/`inject`. It also preserves the editor's ability to be embedded in a
Vue application that uses no localization plugin or uses a different i18n
solution.

### Chosen Integration Contract

- [x] The stable `NotionEditor` facade receives `locale?: string`, defaulting to
  `en`, and `messages?: EditorMessageCatalog` through `NotionEditorProps`.
- [x] `EditorMessageCatalog` maps a locale identifier to a recursively partial
  dictionary shaped like the package's canonical English messages. The library
  owns the canonical key tree and the default English values; the host owns
  locale selection and any override dictionaries.
- [x] The provider creates one reactive, editor-scoped message resolver and exposes
  it only through an internal `provideEditorI18n` / `useEditorI18n` composable.
  Components, menu factories, and composables resolve text through that
  resolver rather than importing host i18n APIs.
- [x] Resolution merges the selected locale's supplied values over the library's
  English defaults on a per-key basis. Missing selected-locale keys therefore
  fall back to English; missing canonical keys are implementation defects and
  must never render a raw key in the UI.
- [x] Runtime changes to `locale` or `messages` update the resolver without
  recreating the editor. Locale-specific command labels, search metadata,
  placeholders, tooltips, and accessibility names must read the current
  resolver at display/factory time rather than capturing translated strings at
  module initialization.
- [x] The public package exports the locale/catalog types and default messages for
  host typing, composition, and completeness checks. It does not export a Vue
  I18n adapter, install hook, global plugin, or implicit global locale state.
- [x] The playground will later own a locale selector and persistence. That UI is
  explicitly outside this architecture decision; it consumes the same public
  props as any other host.

### Rejected Alternative

Do not declare `vue-i18n` as a peer dependency. That would force every editor
consumer to install and configure one particular host-level plugin, couple the
published library to plugin version/lifecycle semantics, complicate isolated
component use, and conflict with the existing dependency-light host-configured
package boundary. A consuming application may still build its `messages` prop
from Vue I18n data if it chooses.

### Scope Boundary

This task establishes the contract and the minimal package-facing surface only.
Creating the complete `en`/`ru` catalogs and replacing audited literals belongs
to the subsequent localization roadmap tasks. Do not change product copy or
introduce a playground locale switch here.

## Tasks

### Phase 1: Lock the public localization boundary

- [x] **Task 1: Add the typed, plugin-independent localization options to the published editor API.** Define and export the locale identifier, canonical message-tree shape, recursively partial locale overrides, and locale-to-dictionary catalog in `packages/editor/src/components/notion/notion-editor/public-api.ts`; expose those types and the eventual default-catalog entry from `packages/editor/src/index.ts`. Add optional `locale` and `messages` fields to `NotionEditorProps`, with JSDoc that states the `en` default, per-key English fallback, reactive-update expectation, and absence of a Vue I18n requirement. Do not add `vue-i18n` to `packages/editor/package.json`, package lockfiles, or peer dependencies. **Files:** `packages/editor/src/components/notion/notion-editor/public-api.ts`, `packages/editor/src/index.ts`, `packages/editor/package.json` (verification only; no dependency change expected). **Dependencies:** none. **Logging:** no runtime logging for exported types; document diagnostics requirements in the API comments without logging message values or host content.

### Phase 2: Define the internal resolver seam

- [x] **Task 2: Specify the editor-scoped resolver and provider wiring without coupling to host i18n.** Add the internal localization module under `packages/editor/src/composables/` (or a dedicated `packages/editor/src/i18n/` module if it is introduced with the catalogs) using the existing `provide`/`inject` convention. Its resolver accepts reactive `locale` and `messages` inputs from `NotionEditor.vue`, returns canonical English defaults merged with the selected locale overrides, and offers typed key lookup for components and menu/composable factories. Keep all Vue I18n APIs out of this module. Ensure `NotionEditor.vue` provides the resolver before rendering `NotionEditorContent` and that later changes to either public prop update resolved text without remounting the Tiptap editor. **Files:** `packages/editor/src/components/notion/notion-editor/NotionEditor.vue`, `packages/editor/src/composables/index.ts`, plus the new resolver module under `packages/editor/src/composables/` or `packages/editor/src/i18n/`. **Dependencies:** Task 1. **Logging:** use the existing `developmentDiagnostics` path only for redacted DEBUG events such as selected locale and fallback-to-default occurrence; never log translated strings, document contents, user-entered values, or whole host dictionaries.

### Phase 3: Preserve the contract for migration work

- [x] **Task 3: Verify boundary compliance and hand off exact migration rules to the catalog/string-replacement tasks.** Confirm that `packages/editor/package.json` still lists only Vue and Tiptap-related peers, with no `vue-i18n`; verify the package's root entry exports the new public types; and record that every item in `.ai-factory/audits/user-facing-strings.md` must use the resolver once the catalogs are added. Prioritize strings created in menu metadata and composables so labels are resolved at execution/render time, then migrate component templates, placeholders, tooltips, and `aria-label`s. Leave `apps/playground/src/App.vue` unchanged until the separate host-locale task introduces its selector and persistence. **Files:** `.ai-factory/audits/user-facing-strings.md` (read-only migration source), `packages/editor/package.json` (verification only), `packages/editor/src/index.ts`, `packages/editor/src/components/**`, `packages/editor/src/composables/**`, `apps/playground/src/App.vue` (explicitly out of scope). **Dependencies:** Tasks 1-2. **Logging:** preserve existing diagnostics; the later migration may emit development-only DEBUG fallback diagnostics, but must not add production info logs for ordinary translation resolution.

## Validation

- [x] Run `npm run typecheck` after the public types and resolver seam are implemented.
- [ ] Run `npm run build --workspace=@i-prikot/editor` to verify the public declarations and package bundle remain valid. **Blocked in this checkout:** Vite cannot load the missing optional package `@rollup/rollup-linux-x64-gnu`; the preceding declaration-emission stage completed successfully.
- [x] Inspect `packages/editor/package.json` and `package-lock.json` to confirm this work does not add `vue-i18n` or any equivalent host-i18n peer dependency.
- [x] Confirm `locale` and `messages` can change reactively without recreating the editor instance, using the playground or a focused temporary integration check; do not add automated tests in this task.
