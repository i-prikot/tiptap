<!-- handoff:task:cd6e2db4-4cf2-4bed-8916-b841d1cf0f90 -->
# Inject Image Upload Adapter

**Created:** 2026-07-14  
**Branch:** `main`  
**Mode:** Fast autonomous Handoff

## Settings

- [x] **Testing:** rework exceptions — remove stale `handleImageUpload` test references and run the focused image-upload node-view integration suite for adapter-contract coverage.
- [x] **Logging:** retain verbose development diagnostics around adapter configuration and rejected uploads, but never log file contents, image URLs with credentials, or host storage configuration.
- [x] **Docs:** no documentation changes.

## Scope and Constraints

- [x] Image persistence must be performed only by the host-supplied `ImageUploadAdapter`; reusable editor code must not simulate uploads or return a built-in placeholder URL.
- [x] Keep the existing public `imageUpload` injection point, but align its callback contract with `uploadImage(file, callbacks) => Promise<url>` so progress and cancellation are supplied as one typed callbacks object.
- [x] Preserve image-node validation, progress rendering, cancellation, node replacement after a successful URL, and existing `onSuccess`/`onError` node callbacks.
- [x] When no adapter is configured, surface the existing node-level upload error path with a clear configuration error; do not silently fall back to a demo upload implementation.
- [x] Move the playground's current demo-only upload behavior to the playground boundary so the application remains usable without putting storage policy back into `src/editor/`.
- [x] Work with the current uncommitted editor/playground extraction changes; do not revert or overwrite unrelated work.

## Tasks

### Phase 1: Define the host upload contract ✅

- [x] **Task 1: Create one shared typed upload-adapter contract.** Add `src/editor/types/image-upload.ts` with the callback payload used by the uploader (progress reporting and cancellation signal) and an `ImageUploadAdapter` whose signature is `uploadImage(file, callbacks) => Promise<string>`. Re-export the types through `src/editor/types/index.ts`, then re-export them from `src/editor/components/notion/public-api.ts` and `src/editor/index.ts` so hosts can implement the adapter without importing internal nodes. Update `src/editor/nodes/image-upload/image-upload-node.ts` to consume the same type instead of maintaining a divergent `UploadFunction` signature.
  - [x] **Expected behavior:** consumers receive a single stable, typed host-to-editor contract; the node view can provide progress/cancellation callbacks without coupling the low-level upload node to a component-local type.
  - [x] **Files:** `src/editor/types/image-upload.ts`, `src/editor/types/index.ts`, `src/editor/components/notion/public-api.ts`, `src/editor/index.ts`, `src/editor/nodes/image-upload/image-upload-node.ts`.
  - [x] **Logging:** add no upload success logging or telemetry; type definitions must not expose or record host credentials, URLs, or file data.

### Phase 2: Remove the reusable-library fallback ✅

- [x] **Task 2: Wire the injected adapter directly through the editor and delete hard-coded upload behavior.** Update `src/editor/components/notion/EditorProvider.vue` to configure `ImageUploadNode` directly from `props.imageUpload`, adapting its node-view progress callback and abort signal to the new callbacks object. Remove the `handleImageUpload` fallback import and resolver. Remove the simulated progress loop, delay, placeholder return value, and now-obsolete upload callback type from `src/editor/utils/tiptap-utils.ts`, while retaining `MAX_FILE_SIZE` for the editor's size limit. In `src/editor/nodes/image-upload/ImageUploadNodeView.vue`, invoke the configured adapter only through the new callbacks object and report a specific “image upload adapter is not configured” error through `onError` when the prop is absent.
  - [x] **Expected behavior:** any selected image either receives a real URL from the injected host adapter and is inserted as an image node, or remains in the upload node with a clear error; the reusable editor never manufactures a URL or pretends that storage succeeded.
  - [x] **Files:** `src/editor/components/notion/EditorProvider.vue`, `src/editor/nodes/image-upload/ImageUploadNodeView.vue`, `src/editor/utils/tiptap-utils.ts`.
  - [x] **Logging:** retain the provider's concise error-level failure signal only; do not log adapter arguments, file names, file data, generated URLs, or storage-service responses.

### Phase 3: Keep demo behavior at the host boundary ✅

- [x] **Task 3: Inject the playground-owned demo upload adapter.** In `src/App.vue`, define the playground's explicit upload adapter and pass it to `NotionEditor` through `:image-upload`. Keep any placeholder/demo URL and progress simulation strictly in this host application so it can later be replaced by real storage without changing the reusable editor. Honor cancellation before resolving and leave the editor's node-view callbacks responsible for visual progress and error state.
  - [x] **Expected behavior:** the playground continues to demonstrate image insertion, while external hosts must deliberately supply their own storage implementation; importing `src/editor/` alone provides no upload policy.
  - [x] **Files:** `src/App.vue`.
  - [x] **Logging:** do not log selected files, storage URLs, or adapter callback payloads; rely on the editor's existing redacted failure message when an upload rejects.

## Validation

- [x] Do not run automated test commands; remove only stale automated-test coverage for the deleted helper.
- [x] Search `src/editor/` and confirm there are no remaining `handleImageUpload` references and no hard-coded placeholder upload URL or simulated upload delay in reusable source.
- [x] Inspect `ImageUploadNode` configuration to confirm the only upload function is the injected `imageUpload` prop, and inspect the public barrel to confirm `ImageUploadAdapter` and its callbacks type are exported.
- [ ] Manually exercise the playground adapter path: select an allowed image, observe progress, insert the resolved URL, and cancel before resolution; then omit the adapter in a minimal host and confirm the node reports the configuration error without replacing itself.
- [x] Run `npm run typecheck`; do not run any `test*` command. This rework removes the deferred legacy `handleImageUpload` test import that previously blocked typechecking.

## Acceptance Criteria

- [x] `handleImageUpload` no longer simulates an upload, waits artificially, or returns `/images/tiptap-ui-placeholder-image.jpg` from reusable editor code.
- [x] The exported adapter uses a typed `(file, callbacks) => Promise<string>` contract shared by public API and image-upload node configuration.
- [x] `EditorProvider` has no fallback uploader; `imageUpload` is the sole source of the configured upload function.
- [x] Missing configuration produces a user-visible node error and does not insert a fake image URL.
- [x] `src/App.vue` explicitly owns the playground/demo upload adapter and passes it to `NotionEditor`.
- [x] No documentation or unrelated automated-test behavior changes; the rework removes only stale tests for the deleted fallback helper.

## Out of Scope

- [ ] Implementing a production object-storage backend, authentication, signed URLs, image transformations, retry policy, or persistent upload queue.
- [ ] Changing image size/count validation, editor image-node markup, captions, resizing, or download behavior.
- [ ] Adding replacement adapter behavior coverage; schedule it separately when tests are in scope.

## Rework (2026-07-14)

- [x] **Task 4: Remove stale fallback-helper tests.** Remove the obsolete `handleImageUpload` import, its helper fixtures, and the tests that assert the deleted simulated upload behavior in `test/editor/utils/tiptap-utils.test.ts`.
- [x] **Validation:** `npm run typecheck` passes after the stale import is removed.

## Rework (2026-07-14, Integration Coverage)

- [x] **Task 5: Restore adapter-contract integration coverage.** Update the successful upload mock in `test/editor/components/image-upload-node-view.integration.test.ts` to destructure the `onProgress` callback from the injected callbacks object. Add focused coverage that cancellation aborts the supplied signal without replacing the node, and that a missing adapter reports the configuration error without replacing the node.
- [x] **Validation:** `npm test -- test/editor/components/image-upload-node-view.integration.test.ts` passes (5 tests).

## Rework (2026-07-14, Dynamic Adapter Lifecycle)

- [x] **Task 6: Preserve dynamic image upload adapter resolution.** Configure `ImageUploadNode` with a stable provider-owned delegating adapter that resolves the current `imageUpload` prop for every upload request. Reject with `image upload adapter is not configured` when no current adapter exists, and cover an adapter supplied after mount in `test/editor/components/notion/editor-provider.test.ts`.
- [x] **RED evidence:** Before changing `src/editor/components/notion/EditorProvider.vue`, `npm test -- test/editor/components/notion/editor-provider.test.ts -t "delegates image uploads to an adapter provided after mount"` failed with 1 failing test: `TypeError: upload is not a function`. This demonstrated that the image-upload extension captured no usable adapter at mount time.
- [x] **GREEN evidence:** After the delegating adapter change, `npm test -- test/editor/components/notion/editor-provider.test.ts -t "delegates image uploads to an adapter provided after mount"` passes (1 test).
- [x] **Metadata:** Restored mode `100644` for `test/editor/components/image-upload-node-view.integration.test.ts`.

## Rework (2026-07-14, Adapter URL Validation)

- [x] **Task 7: Validate returned adapter URLs before success or persistence.** In `src/editor/nodes/image-upload/ImageUploadNodeView.vue`, parse each non-empty adapter result against the current document URL and allow only `http:` and `https:` protocols. Reject malformed, `javascript:`, `data:`, `blob:`, and all other schemes before updating upload state, calling `onSuccess`, or inserting an image node.
- [x] **Coverage:** Add parameterized integration coverage in `test/editor/components/image-upload-node-view.integration.test.ts` for `javascript:`, `data:`, and `blob:` results. Each rejected result reports the generic upload failure, skips `onSuccess`, and does not replace the upload node.
- [x] **RED evidence:** `npm test -- test/editor/components/image-upload-node-view.integration.test.ts` failed with 3 unsafe-URL cases because the adapter return value bypassed validation and never reached `onError`.
- [x] **GREEN evidence:** `npm test -- test/editor/components/image-upload-node-view.integration.test.ts` passes (8 tests); `npx eslint src/editor/nodes/image-upload/ImageUploadNodeView.vue test/editor/components/image-upload-node-view.integration.test.ts` and `npm run typecheck` pass.
