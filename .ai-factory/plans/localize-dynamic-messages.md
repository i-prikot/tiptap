<!-- handoff:task:2dfa3ff2-bf03-4eae-84f5-5c0b52e1e9fc -->
# Localize Dynamic Messages

- [ ] **Branch:** `main`
- [ ] **Created:** 2026-07-23
- [ ] **Mode:** Fast autonomous Handoff
- [ ] **Scope:** Localize runtime-generated avatar labels, collaboration counters, and image-upload failures while retaining reactive host locale/message overrides.

## Settings

- [ ] **Testing:** no — do not add, modify, plan, or run automated tests.
- [ ] **Logging:** verbose — retain existing development-only, redacted diagnostics; add no logs containing translated text, interpolation values, host messages, user names, filenames, or upload error content.
- [ ] **Docs:** no — do not create or update documentation.

## Roadmap Linkage

- [ ] **Milestone:** `Этап 8. Локализация (i18n)`
- [ ] **Rationale:** Implements the roadmap item for dynamic avatar labels, collaborator counters, and image-upload error messages.

## Scope Decisions

- [ ] Reuse the editor-scoped `useEditorI18n()` provider so `locale` and host `messages` updates apply without remounting the editor.
- [ ] Use `Intl.PluralRules` against the active editor locale and typed catalog plural branches; include all plural categories required by the English-derived canonical tree so Russian counts resolve correctly and unknown locales fall back safely.
- [ ] Keep avatar primitives generic: collaboration supplies localized labels, while non-collaboration avatar call sites retain decorative image behavior unless they explicitly provide text alternatives.
- [ ] Preserve the original `Error` values delivered to image-upload callbacks for programmatic diagnostics; represent package-owned visual failures by catalog key/value metadata and resolve them in the node view at render time.
- [ ] Reconcile with the existing uncommitted i18n changes. Do not discard, revert, or overwrite concurrent localization work.

## Tasks

### Phase 1: Add a typed plural-message resolver and catalog entries

- [x] **Task 1: Extend editor-scoped i18n with plural-category resolution and canonical dynamic-message keys.**
  - [x] **Files:** modify `packages/editor/src/composables/useEditorI18n.ts`, `packages/editor/src/i18n/types.ts`, `packages/editor/src/i18n/en/common.ts`, `packages/editor/src/i18n/ru/common.ts`, `packages/editor/src/i18n/en/errors.ts`, and `packages/editor/src/i18n/ru/errors.ts`.
  - [x] Add a typed plural namespace/key contract and expose a resolver such as `tPlural(...)` alongside `t(...)`. It must select the active locale's `Intl.PluralRules` category, interpolate `{count}` plus named values, and fall back to an available canonical category without exposing raw message keys.
  - [x] Add typed English/Russian catalog leaves for an avatar label with `{name}`, total collaborator count, additional/hidden collaborator count, and every package-owned image-upload failure category needed by the current upload flow (adapter unavailable, generic failure, invalid/missing upload URL, empty selection, file limit, and file size limit).
  - [x] Preserve shallow/deep host override merging and the resolver's existing per-locale, development-only fallback diagnostics. Do not introduce Vue I18n, global state, or a host API-breaking dependency.
  - [x] **Dependencies:** none.
  - [x] **Logging requirements:** keep `EditorI18n` diagnostics event-only and development-gated. Never log plural keys, selected categories, resolved strings, counts, interpolation values, dictionaries, or user/upload data.
  - [x] **Rework 2026-07-23:** invalid host-supplied locale tags now select plural categories with `defaultEditorLocale` instead of allowing `Intl.PluralRules` to throw.

### Phase 2: Make collaboration avatar and counter labels reactive

- [x] **Task 2: Supply localized avatar alternatives and pluralized collaborator labels from the collaboration UI.**
  - [x] **Files:** modify `packages/editor/src/components/notion/collaboration/CollabUsers.vue`, `packages/editor/src/components/primitives/avatar/AvatarImage.vue`, and `packages/editor/src/components/primitives/avatar/AvatarGroup.vue`.
  - [x] Add an optional `alt` input to `AvatarImage` that defaults to the existing empty alternative text. In `CollabUsers`, provide a localized avatar label for images that convey a collaborator identity, while retaining empty alternatives for avatars that are duplicated by adjacent visible collaborator names.
  - [x] Compute the trigger's accessible collaborator count through the new plural resolver; pass a separate pluralized accessible label for the `+N` overflow avatar while retaining the visual `+N`, `maxVisible`, user ordering, colors, dropdown behavior, and anonymous-name fallback.
  - [x] Ensure labels recalculate when the editor locale, host message overrides, participant list, or hidden-user count changes; do not bake translated names/counts into module-level constants or stored collaboration state.
  - [x] **Dependencies:** Task 1.
  - [x] **Logging requirements:** add no collaboration or avatar logging. Preserve only the existing redacted transaction-subscription diagnostics; never log collaborator names, IDs, colors, avatar URLs, counter values, or resolved labels.

### Phase 3: Resolve upload failures through catalog keys at render time

- [x] **Task 3: Replace stored English upload failure text with localized error metadata and reactive rendering.**
  - [x] **Files:** modify `packages/editor/src/composables/useImageUpload.ts`, `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue`, and the image-upload error catalog files from Task 1 only as needed.
  - [x] Refactor `ImageUploadFileItem` to retain a typed package-owned message key and interpolation values rather than a preformatted English `errorMessage`. Classify known failures from size/limit validation, missing adapters, missing or invalid returned URLs, and unexpected uploads without conflating them with custom adapter errors.
  - [x] Resolve item error text in `ImageUploadNodeView.vue` through `useEditorI18n()` so active locale/message changes update an already-rendered failed upload without retrying or recreating the node view. Continue showing a safe generic localized message for unknown adapter failures.
  - [x] Keep `onError` behavior and abort semantics intact: callbacks receive the original `Error`, successful upload replacement remains unchanged, and adapter-provided error text is not rendered into the editor UI unless explicitly supported by the existing contract.
  - [x] **Dependencies:** Task 1.
  - [x] **Logging requirements:** retain existing `useImageUpload` development diagnostics and stable event names. Do not add logs of filenames, URLs, adapter errors, translated failure messages, message keys, values, or locale state.
  - [x] **Rework 2026-07-23:** Set reactive node-level catalog metadata before notifying oversized, file-limit, and empty file-input selections; resolve the state through the node view while preserving callback errors.
  - [x] **Rework 2026-07-23:** Render node-level selection failures in the preview branch so a rejected file remains visible alongside valid uploads.

### Phase 4: Validate the dynamic localization boundary without tests

- [x] **Task 4: Run scoped static validation and manually inspect reactive locale behavior.**
  - [x] **Files:** inspect only files changed by Tasks 1-3; do not create or modify test or documentation files.
  - [x] Run the editor package's applicable TypeScript and lint/format validation, correcting only failures introduced by this work. Do not run automated tests because `Testing: no` is explicit.
  - [x] Perform a targeted literal scan of the collaboration/avatar and image-upload paths. Confirm no package-owned English runtime label or failure string remains in their rendered paths, while intended technical `Error` messages remain internal to callback/reporting behavior.
  - [x] Manually verify or trace that switching `locale` or host `messages` updates avatar alternatives, total/overflow collaborator labels (including Russian one/few/many forms), and existing failed-upload text without remounting the editor or re-uploading files.
  - [x] **Dependencies:** Tasks 2-3.
  - [x] **Logging requirements:** verify all localization diagnostics remain development-only and redacted, with no runtime logging of translated copy, plural inputs, collaboration identity data, upload filenames, URLs, or error messages.

## Completion Criteria

- [x] `useEditorI18n()` exposes a typed, override-aware plural resolver backed by `Intl.PluralRules`, and English/Russian catalogs define all required dynamic-message categories.
- [x] Collaboration avatars have meaningful non-duplicative accessible labels, and total plus overflow collaborator counters use locale-appropriate plural forms while the displayed `+N` and existing interaction behavior remain unchanged.
- [x] Image-upload failures store catalog metadata and render localized text reactively; original callback errors, cancellation, progress, and successful node replacement behavior are preserved.
- [x] No test or documentation files change, no new ordinary runtime logging is introduced, and static type/lint checks for the changed editor code pass.
