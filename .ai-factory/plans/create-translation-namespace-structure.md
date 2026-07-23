<!-- handoff:task:b6a28d09-f0f3-4fb6-9593-efa8087134e7 -->
# Implementation Plan: Create Translation Namespace Structure

Branch: `main`
Created: 2026-07-23

## Settings
- [ ] Testing: no
- [ ] Logging: verbose development diagnostics only; never log resolved copy, host message dictionaries, document content, or user data
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 8. Локализация (i18n)"
Rationale: A stable, typed catalog layout is the prerequisite for incrementally moving audited editor copy into the package-owned localization contract.

## Commit Plan
- [ ] **Commit 1** (after Tasks 1-3): `feat(editor): add typed translation catalog namespaces`
- [ ] **Commit 2** (after Tasks 4-5): `refactor(editor): source default messages from catalog`

## Scope and Decisions
- [x] Keep the existing plugin-independent model: the package owns the English fallback catalog and typed contract, while hosts select `locale` and provide partial `messages` overrides. Do not add `vue-i18n`, a global locale store, or a package install hook.
- [x] Introduce a package-internal `packages/editor/src/i18n/` module with one composed English catalog and domain modules for `common`, `editor`, `toolbar`, `menus`, `formatting`, `colors`, `links`, `table`, `image`, `toc`, and `errors`.
- [x] Make these namespace names explicit in the canonical message type rather than relying on the current unrestricted root index signature. Keep each namespace extensible for later key-by-key migrations, and derive the accepted dot-path key type from the canonical tree where practical.
- [x] Preserve the currently shipped `editor.placeholder` English fallback and resolver semantics: selected-locale values overlay English per key, missing localized values fall back to English, and a missing canonical key remains a development diagnostic rather than rendering a raw key.
- [x] This task creates catalog structure and public typing only. Do not replace component/composable literals, alter product wording, add non-English catalogs, create a playground locale selector, or change published documentation.

## Tasks

### Phase 1: Define the typed namespace contract
- [x] **Task 1: Create canonical editor-message namespace types independent of the public component facade.** Add `packages/editor/src/i18n/types.ts` with the root `EditorTranslationMessages` contract and explicit domain interfaces for `common`, `editor`, `toolbar`, `menus`, `formatting`, `colors`, `links`, `table`, `image`, `toc`, and `errors`; include reusable nested/partial override utilities so hosts can override only translated leaves without losing the canonical namespace shape. Define the `editor` namespace with the existing `placeholder` key, and make other domain types intentionally extensible until the audited literals are migrated in later tasks. Export a derived dot-path key type suitable for the resolver, excluding object-only paths. **Files:** create `packages/editor/src/i18n/types.ts`. **Dependencies:** none. **Logging:** no runtime logger is added; type-only code must not capture or expose translation values in diagnostics.

- [x] **Task 2: Move public catalog types onto the namespace contract without breaking the host API.** Update `packages/editor/src/components/notion/notion-editor/public-api.ts` to import and re-export the canonical message-tree/value/override types from `packages/editor/src/i18n/types.ts`, retaining the established exported names where compatibility requires them. Change `EditorMessageCatalog`, `defaultEditorMessages`, and `defaultEditorMessageCatalog` to use the typed root tree, while preserving `defaultEditorLocale`, optional `NotionEditorProps.locale`, optional `NotionEditorProps.messages`, their documented English fallback behavior, and no-plugin guarantee. **Files:** modify `packages/editor/src/components/notion/notion-editor/public-api.ts`. **Dependencies:** Task 1. **Logging:** preserve the public contract’s existing diagnostics/privacy guidance; do not add runtime output or include catalog strings in logs.

### Phase 2: Create the English catalog file layout
- [x] **Task 3: Add typed English namespace modules and one composed catalog entry point.** Create `packages/editor/src/i18n/en/common.ts`, `packages/editor/src/i18n/en/editor.ts`, `packages/editor/src/i18n/en/toolbar.ts`, `packages/editor/src/i18n/en/menus.ts`, `packages/editor/src/i18n/en/formatting.ts`, `packages/editor/src/i18n/en/colors.ts`, `packages/editor/src/i18n/en/links.ts`, `packages/editor/src/i18n/en/table.ts`, `packages/editor/src/i18n/en/image.ts`, `packages/editor/src/i18n/en/toc.ts`, and `packages/editor/src/i18n/en/errors.ts`; each exports its matching typed namespace object. Keep `editor.placeholder: 'Start writing...'` as the only existing fallback value moved from the facade, and use intentionally empty typed namespace objects for domains whose audited copy has not yet been migrated. Add `packages/editor/src/i18n/en/index.ts` to compose and validate the canonical English tree, plus `packages/editor/src/i18n/index.ts` as the sole internal catalog/types barrel. **Files:** create `packages/editor/src/i18n/index.ts`, `packages/editor/src/i18n/types.ts` (if not completed in Task 1), and `packages/editor/src/i18n/en/{common,editor,toolbar,menus,formatting,colors,links,table,image,toc,errors,index}.ts`. **Dependencies:** Tasks 1-2. **Logging:** catalog modules stay pure constants with no logging; maintain the rule that later runtime resolver diagnostics report only locale/key-state metadata, never translated values.

### Phase 3: Wire the catalog into resolution and package exports
- [x] **Task 4: Source default messages from the catalog and tighten resolver key typing.** Replace the inline default English object in `packages/editor/src/components/notion/notion-editor/public-api.ts` with the composed `en` catalog from `packages/editor/src/i18n/`. Update `packages/editor/src/composables/useEditorI18n.ts` so `EditorMessageKey` uses the canonical dot-path type while retaining reactive locale/message changes, recursive per-key merge behavior, empty-string behavior for canonical-key defects, and deduplicated development-only fallback diagnostics. Confirm `packages/editor/src/index.ts` continues exporting the locale/catalog constants and compatible public types without exposing an unwanted global/plugin API. **Files:** modify `packages/editor/src/components/notion/notion-editor/public-api.ts`, `packages/editor/src/composables/useEditorI18n.ts`, and `packages/editor/src/index.ts` only if explicit re-exports need adjustment. **Dependencies:** Task 3. **Logging:** preserve `EditorI18n` DEBUG events (`locale-selected`, `fallback-to-default`, and `missing-default-message`) and their existing value-redaction behavior; do not emit namespace contents, override dictionaries, or user-provided strings.

### Phase 4: Validate catalog boundaries without tests
- [x] **Task 5: Perform focused static validation of the namespace catalog migration.** Run the editor package’s configured TypeScript validation and targeted lint/format checks for the new `packages/editor/src/i18n/` files plus `packages/editor/src/components/notion/notion-editor/public-api.ts`, `packages/editor/src/composables/useEditorI18n.ts`, and `packages/editor/src/index.ts`. Verify imports have no public-API-to-catalog type cycle, the default catalog still resolves `editor.placeholder`, host partial overrides remain assignable, and no UI literal files changed. Do not add or run automated tests because `Testing: no` was explicitly selected. **Files:** inspect all files from Tasks 1-4; do not create test or documentation files. **Dependencies:** Tasks 1-4. **Logging:** validation must confirm diagnostics are still development-gated and metadata-only; do not introduce any new production runtime logging.

## Rework Resolution (2026-07-23)
- [x] **[3b4d87dabae1] Wire editor-scoped i18n to reactive public props.** `NotionEditor.vue` provides `provideEditorI18n` with direct reactive refs for `locale` and `messages`, preserving reactive selected-locale overlays and development-diagnostics gating.
- [x] **[91a395c83da7] Restrict resolver keys to catalog string leaves.** English namespace modules preserve their concrete shapes with `satisfies`; `EditorMessageKey` now derives only real string-leaf paths from the composed `en` catalog, while `EditorMessageTree` widens leaf values for host overrides.
- [x] **Rework validation.** Editor typecheck passes; temporary compile-only checks confirm `toolbar.anything` is rejected and `{ ru: { editor: { placeholder: '…' } } }` remains assignable. Focused Prettier check passes. Focused ESLint did not return diagnostics within 90 seconds and was stopped without source changes.

## Completion Criteria
- [x] `packages/editor/src/i18n/` contains one composed English catalog and dedicated typed modules for all agreed editor UI domains.
- [x] The public locale/catalog API uses an explicit canonical root namespace shape while remaining compatible with partial host locale overrides.
- [x] `editor.placeholder` continues to resolve through the default English catalog, and resolver fallback/diagnostic behavior remains intact.
- [x] No component or composable user-facing literals are migrated in this structural task; the audited-string migration remains a separate follow-on change.
- [x] No automated tests or published documentation are added or changed.
