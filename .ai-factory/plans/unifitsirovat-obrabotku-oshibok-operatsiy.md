<!-- handoff:task:22007898-dd72-48e9-86a1-7a6026605fc9 -->
# Implementation Plan: Унифицировать обработку ошибок операций

Branch: main
Created: 2026-07-24

## Settings
- [ ] Testing: no (explicit task constraint)
- [ ] Logging: verbose
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 9. Качество кода и документация"
Rationale: Закрывает пункт roadmap о едином механизме передачи ошибок upload и скачивания изображений в хост Tinyfy.

## Scope and Contract
- [x] Expose one typed public Vue event, `operation-error`, on `NotionEditor`; preserve the existing `ready`, `update`, and `anchor-change` contracts.
- [x] Define `NotionEditorOperationErrorPayload` with a discriminated operation (`image-upload` or `image-download`), a safe error class, and a stable code. The host uses a localized generic notification and may send only this safe payload to telemetry.
- [x] Emit exactly once for each terminal user-operation failure. A failed `fetch` download that succeeds through direct-link fallback is not a terminal failure; user-cancelled uploads remain non-errors.
- [x] Keep user-visible upload-node validation messages intact. Do not expose file contents, image URLs, document content, tokens, or other sensitive data through diagnostics.
- [x] This plan intentionally excludes test and documentation changes.


## Rework (2026-07-24)
- [x] **Replace regex-based error redaction with a deny-by-default operation payload.**
  - The operation-error event and terminal upload/download logs now contain only operation, errorClass, and a stable code.
  - The public event no longer exposes an original Error, message, stack, URL, credential, or adapter/server response.
  - Verification: npm run typecheck --workspace=@i-prikot/editor passes. The targeted lint command remains blocked by the environment's missing unrs-resolver native binding.
## Tasks

### Phase 1: Define the reusable error-reporting boundary
- [x] **Task 1: Add a typed operation-error contract and editor-scoped reporter.**
  - [x] **Files:** `packages/editor/src/components/notion/notion-editor/public-api.ts`, `packages/editor/src/composables/useEditorOperationError.ts` (new), `packages/editor/src/composables/index.ts`, `packages/editor/src/index.ts`.
  - [x] Define and export the public payload and operation discriminator from the stable editor facade, then re-export them from the package entry point.
  - [x] Implement a small `provide`/`inject` reporter owned by the editor tree: `NotionEditor` supplies the event-emitting reporter, while descendant composables and providers report normalized terminal failures through the same function.
  - [x] Make injection safe for independently mounted editor UI by using an explicit no-op or structured-logger fallback; do not add a second user-facing notification path.
  - [x] **Logging:** use the existing `createLogger` only for reporter misuse/unavailable provider and terminal failures; error logs carry only the safe `operation`, `errorClass`, and stable `code` payload. Add `DEBUG` lifecycle logs only when the development logger is enabled.
  - [x] **Dependency notes:** this contract is required before upload and download paths can notify the host.

### Phase 2: Route upload failures to the host event
- [x] **Task 2: Connect the existing image-upload error callback to `operation-error`.**
  - [x] **Files:** `packages/editor/src/components/notion/notion-editor/NotionEditor.vue`, `packages/editor/src/components/notion/notion-editor/EditorProvider.vue`.
  - [x] Declare and emit `operation-error` from the public `NotionEditor` facade, and provide its reporter before rendering `NotionEditorContent` so the full editor subtree can use it without prop drilling.
  - [x] Replace `EditorProvider`'s current `onImageUploadError: () => logger.error('image upload failed')` handler with the injected reporter carrying `operation: 'image-upload'`; emit only its safe payload, not the original error.
  - [x] Preserve the existing `useImageUpload` behavior: adapter absence, invalid URL, validation failures, upload exceptions, and node-replacement failures continue to show their inline localized state and are reported outward once; aborted uploads are not reported as failures.
  - [x] **Logging:** retain the existing redacted upload diagnostics (`upload-start`, progress, success, failure) and add an `ERROR` log only at the terminal boundary with the safe operation payload. Do not duplicate logs/events for the same failure.
  - [x] **Dependency notes:** depends on Task 1; the schema package’s existing `ImageUploadNodeOptions.onError` contract remains unchanged.

### Phase 3: Route terminal image-download failures to the host event
- [x] **Task 3: Refactor image-download fallback handling to report one terminal error.**
  - [x] **Files:** `packages/editor/src/composables/useImageDownload.ts`.
  - [x] Consume the editor-scoped reporter in `useImageDownload` while preserving the current return contract (`Promise<boolean>`) used by `ImageDownloadButton` and the drag-context menu.
  - [x] Track the failure reason across `fetch` → object URL download → direct anchor download → `window.open` fallback. Report `operation: 'image-download'` only when every strategy fails; treat an unavailable popup (`window.open()` returns `null`) as a failure rather than success.
  - [x] Do not report intermediate fetch/CORS/HTTP failures if a later fallback succeeds. Preserve cleanup of object URLs and DOM anchors for all attempted strategies.
  - [x] **Logging:** emit `DEBUG` records for the attempted and selected fallback strategy, `INFO` for a completed download, and one `ERROR` record containing only the safe terminal operation payload before reporting the failure. Do not log the image URL, host document content, error message, or stack.
  - [x] **Dependency notes:** depends on Task 1; no changes are required in `ImageDownloadButton.vue` or `useDragContextMenuItems.ts` because they keep consuming the boolean result.

## Acceptance Criteria
- [x] A Tinyfy host can subscribe with `@operation-error` and receive a typed payload for failed image uploads and terminal image-download failures.
- [x] Existing editor consumers that do not subscribe retain current upload UI, download fallback behavior, and boolean download action results.
- [x] A successful fallback download produces no host error event; a cancelled upload produces no host error event.
- [x] Direct `console.error` calls are not introduced in operation paths; diagnostics use the shared logger and remain redacted.
- [x] **Rework Task 4: Add targeted behavioral coverage for operation-error delivery.**
  - [x] Verify the public `operation-error` facade event emits one deny-by-default upload payload.
  - [x] Verify terminal image-download failure reports exactly once with a safe payload.
  - [x] Verify a successful fallback download reports no host error event.
  - [x] Verify cancelling an image upload does not notify the reporter.
