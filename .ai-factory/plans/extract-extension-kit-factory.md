<!-- handoff:task:a396e63a-7700-491b-96ea-cff4f417fcf3 -->
# Implementation Plan: Extract Extension Kit Factory

**Created:** 2026-07-14  
**Branch:** `main`  
**Mode:** Fast autonomous Handoff

## Settings

- [x] **Testing:** no automated tests — do not add, modify, or run test files or test commands for this task.
- [x] **Logging:** verbose development diagnostics remain opt-in through `EditorProvider`; preserve the existing image-upload error boundary without logging document content, collaboration identifiers, user data, or upload payloads.
- [x] **Docs:** no documentation changes.

## Roadmap Linkage

Milestone: `none`  
Rationale: Autonomous fast-mode planning skipped milestone linkage; the task corresponds to the internal-architecture extension-kit extraction item in the current roadmap.

## Scope and Constraints

- [x] Move only Tiptap extension construction from `EditorProvider.vue` into a factory at `src/editor/extensions/extension-kit.ts`; keep editor lifecycle, content synchronization, Vue provide/inject wiring, and template/UI rendering in the provider.
- [x] Preserve the current extension order, option values, collaboration behavior, and callbacks exactly: local history stays enabled without a provider, Yjs collaboration/caret extensions are added only with a provider, and `UniqueID` continues to ignore Yjs-originated transactions.
- [x] Make the factory contract independent of Vue components and provider-local closures. Its typed inputs must explicitly cover the collaboration provider and Y.Doc, placeholder, collaboration user, feature flags, image-upload adapter/error callback, and TOC update callback required by the present configuration.
- [x] Treat feature flags as a forward-compatible factory input only in this extraction. Do not introduce new public props or change which schema extensions are enabled until the public feature contract is separately defined; the existing `EditorFeatureFlags` remain presentation flags.
- [x] Work with the existing uncommitted editor/package-boundary changes. Do not revert, reformat, or absorb unrelated changes.

## Tasks

### Phase 1: Define the schema-oriented factory contract

- [x] **Task 1: Add a typed extension-kit factory.** Create `src/editor/extensions/extension-kit.ts` exporting `createExtensionKit(...)` and its options/feature-flag types. Model required runtime dependencies explicitly: nullable `TiptapCollabProvider`, `Y.Doc`, placeholder resolver/value, `CollabUser`, feature flags, image-upload function plus failure handler, and TOC-content callback. Keep types based on Tiptap/core and internal domain types rather than Vue component types so the module can later move into a schema package.
  - [x] **Expected behavior:** callers receive one complete, ordered Tiptap extension array equivalent to the current local or collaborative array; absent collaboration provider yields no collaboration extensions and preserves StarterKit undo/redo.
  - [x] **Files:** `src/editor/extensions/extension-kit.ts`.
  - [x] **Logging:** do not add factory telemetry or log option values. Route the existing upload failure callback through the factory unchanged so the caller retains the current redacted `[EditorProvider] image upload failed` error boundary.

### Phase 2: Preserve extension assembly behavior in the provider

- [x] **Task 2: Replace the inline extension list with the factory call.** In `src/editor/components/notion/EditorProvider.vue`, remove Tiptap/custom-extension imports and the local `collabExtensions`/inline `extensions` configuration that belong to the factory. Pass the provider’s existing `provider`, `ydoc`, reactive placeholder resolver, current user, presentation features, upload adapter/error handler, and `setTocContent` callback into `createExtensionKit` when initializing `useEditor`.
  - [x] **Expected behavior:** `EditorProvider` retains its current responsibilities and all extension-dependent UI still receives the same editor instance; placeholder updates continue to refresh through the current transaction watcher, TOC updates still reach `useToc`, and image uploads still use the injected adapter with the existing fallback.
  - [x] **Files:** `src/editor/components/notion/EditorProvider.vue`.
  - [x] **Dependencies:** depends on Task 1.
  - [x] **Logging:** keep `debugEditor` lifecycle diagnostics and existing error messages at their current call sites. Do not move lifecycle logs into the pure factory or add logs containing editor content, user identity, room/document IDs, or uploaded files.

### Phase 3: Reconcile factory ownership and exports

- [x] **Task 3: Keep the factory internal and verify import boundaries manually.** Confirm `extension-kit.ts` imports only Tiptap, Yjs/provider types, internal extensions/nodes, and plain internal types; it must not import Vue SFCs, composables, or provider lifecycle utilities. Keep it out of `src/editor/index.ts` and `src/editor/components/notion/public-api.ts` until the schema package/public API is intentionally introduced. Remove now-unused imports from `EditorProvider.vue` and ensure TypeScript can infer the array accepted by `useEditor`.
  - [x] **Expected behavior:** the reusable extension configuration has a single internal owner, while the library’s existing public surface is unchanged.
  - [x] **Files:** `src/editor/extensions/extension-kit.ts`, `src/editor/components/notion/EditorProvider.vue`.
  - [x] **Dependencies:** depends on Tasks 1–2.
  - [x] **Logging:** no new logs; preserve the caller-owned upload error callback and opt-in provider diagnostics.

## Completion Criteria

- [x] `EditorProvider.vue` no longer owns the extension list or direct imports of extensions that are solely used to build that list.
- [x] `createExtensionKit` produces the same ordered extensions and option values for local and collaborative editors, including placeholder, TOC, upload, table, node-attribute, and unique-ID configuration.
- [x] The factory’s typed inputs make collaboration, placeholder, user identity, and future feature-flag ownership explicit without coupling the factory to Vue or expanding the public API.
- [x] No tests, test commands, documentation, public exports, or unrelated workspace changes are added for this handoff.
