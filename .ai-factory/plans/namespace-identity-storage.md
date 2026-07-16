<!-- handoff:task:5cdca977-5b61-4b8c-bf12-1ea620b4c4ee -->
# Namespace Identity Storage

**Created:** 2026-07-14
**Mode:** Fast
**Branch:** `main`
**Scope:** Namespace every browser-storage key owned by the reusable editor and let hosts opt out of, or replace, collaboration-identity persistence.

## Settings

- [x] **Testing:** No — do not add, modify, or run automated tests for this task.
- [x] **Logging:** Verbose diagnostics, but redact all identity and storage contents.
- [x] **Docs:** No — do not modify documentation files.

## Implementation Decisions

- [x] Define one internal library namespace, `notion-like-editor-vue:`, and derive every editor-owned localStorage key through a shared helper.
- [x] Namespace these current keys without reading or migrating legacy unprefixed entries: `_tiptap_username`, `_tiptap_color`, `_tiptap_user_id`, `tiptapRecentlyUsedColors`, and `hasInteracted-<documentId>`.
- [x] Add a public `identityStorage` option whose value is either a minimal key/value storage adapter or `false`. Omission retains the default namespaced browser `localStorage` behavior; `false` creates an in-memory random collaboration identity for that editor mount and performs no identity reads or writes.
- [x] Custom identity adapters receive the same namespaced identity keys as the default implementation. Recent-color and document-interaction persistence remain library-owned localStorage behavior, now namespaced.

## Tasks

### Phase 1: Establish the shared storage and public contract

- [x] **Task 1: Add a single namespaced-key helper and expose the identity persistence contract.** Create a small internal storage-key utility that prepends `notion-like-editor-vue:` exactly once, then define and export a minimal `IdentityStorage` adapter type plus the `identityStorage?: IdentityStorage | false` property in the stable `NotionEditorProps` API.
  - [x] **Expected behavior:** all callers can request a stable, package-specific key without duplicating string literals; hosts can type-check an adapter implementing only `getItem(key)` and `setItem(key, value)`, or explicitly disable identity persistence.
  - [ ] **Files:** create `src/editor/utils/storage.ts`; modify `src/editor/components/notion/public-api.ts` and `src/editor/index.ts`.
  - [ ] **Logging:** add no storage-value logging. The public type and key helper must not log keys, values, names, colors, IDs, or adapter errors.
  - [ ] **Dependency notes:** foundational task; Tasks 2 and 3 must use this utility and public type rather than introducing independent prefixes or adapters.

### Phase 2: Make collaboration identity host-controlled

- [x] **Task 2: Route user identity creation through the optional host storage adapter.** Refactor `provideUser` and the storage helper it uses so the three `_tiptap_user_*` values are derived from the shared namespace and read/written only through the resolved identity storage. Wire `NotionEditor` to pass `props.identityStorage` into `provideUser` while preserving the current generated name, color, ID, and avatar behavior.
  - [x] **Expected behavior:** omitted `identityStorage` reads and writes `notion-like-editor-vue:_tiptap_username`, `notion-like-editor-vue:_tiptap_color`, and `notion-like-editor-vue:_tiptap_user_id` in browser localStorage; a custom adapter receives those same keys; `identityStorage: false` generates a usable user without touching browser storage or the adapter.
  - [ ] **Files:** modify `src/editor/utils/user-utils.ts`, `src/editor/composables/useUser.ts`, and `src/editor/components/notion/NotionEditor.vue`.
  - [ ] **Logging:** when `developmentDiagnostics` is enabled, emit one redacted DEBUG lifecycle event from `NotionEditor` identifying only the persistence mode (`default`, `custom`, or `disabled`). Never log identity fields, adapter keys, adapter values, or storage exceptions.
  - [ ] **Dependency notes:** depends on Task 1. Keep `useUser()` consumers and collaboration-caret user shape unchanged so editor and collaboration initialization remain compatible.

### Phase 3: Namespace remaining library localStorage usage

- [x] **Task 3: Migrate recent-color and document-interaction keys to the common namespace.** Replace the standalone recent-color key in `useRecentColors` and the inline `hasInteracted-<documentId>` construction in `EditorProvider` with shared namespaced keys, preserving existing JSON parsing, maximum-color handling, default-content insertion, and interaction tracking semantics.
  - [x] **Expected behavior:** recent colors use `notion-like-editor-vue:tiptapRecentlyUsedColors`; interaction state uses `notion-like-editor-vue:hasInteracted-<documentId>` for both lookup and write; no unprefixed library key is read, written, or migrated.
  - [ ] **Files:** modify `src/editor/composables/useRecentColors.ts` and `src/editor/components/notion/EditorProvider.vue`.
  - [ ] **Logging:** preserve the existing redacted `console.error` messages for malformed/unwritable recent-color storage; add no logs for document IDs, interaction keys, color payloads, or localStorage success paths.
  - [ ] **Dependency notes:** depends on Task 1. Do not broaden `identityStorage` to recent colors or document-interaction state; this task only namespaces those library-owned values.

### Phase 4: Perform non-test boundary validation

- [x] **Task 4: Verify the public API and eliminate unnamespaced library storage literals.** Inspect the compiled type surface and source call sites after Tasks 1–3, then run non-test quality commands and targeted static searches to confirm the namespace and host boundary are complete.
  - [x] **Expected behavior:** all localStorage reads and writes in `src/editor/` use keys produced by the shared helper; legacy key identifiers may appear only as helper inputs. All three identity modes retain a valid collaboration user, and public consumers can import the identity adapter type from the editor barrel.
  - [ ] **Files:** no production file changes expected; inspect `src/editor/index.ts`, `src/editor/components/notion/public-api.ts`, `src/editor/composables/useUser.ts`, `src/editor/composables/useRecentColors.ts`, and `src/editor/components/notion/EditorProvider.vue`.
  - [ ] **Validation:** do not run any `test*` command. Search `src/editor/` for `_tiptap_user_`, `tiptapRecentlyUsedColors`, `hasInteracted-`, and direct `localStorage` calls; permit only central namespace/key-resolution implementations and the intended default browser-storage access. Run `npm run typecheck`, `npm run lint`, and `npm run build`.
  - [ ] **Logging:** validation output must not print identity data, storage values, or document IDs.
  - [ ] **Dependency notes:** depends on Tasks 1–3 and is the final implementation gate.

## Acceptance Criteria

- [x] Every library-owned localStorage key is generated with the `notion-like-editor-vue:` namespace, including all three `_tiptap_user_*` keys, recent colors, and document interaction state.
- [x] `NotionEditor` exposes an exported typed `identityStorage` contract supporting default persistence, a host replacement adapter, and `false` to disable identity persistence.
- [x] Disabled persistence never reads from or writes to browser localStorage for identity, while still providing a valid generated collaboration user.
- [x] A custom adapter receives only namespaced identity keys and does not change recent-color or document-interaction persistence ownership.
- [x] Existing recent-color error handling, default-content behavior, user/avatar generation, and collaboration-caret integration remain intact.
- [x] No documentation or automated-test files are added or modified, and no test commands are run.

## Out of Scope

- [x] Migrating old unprefixed localStorage data into the new namespace.
- [x] Making recent-color or document-interaction persistence host-configurable.
- [x] Changing application/playground storage policies, theme state, collaboration credentials, or document-ID behavior.
