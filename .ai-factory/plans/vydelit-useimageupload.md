<!-- handoff:task:536a987b-f56d-4567-9366-7d49727fe3d5 -->
# Implementation Plan: Extract `useImageUpload`

Branch: `main`
Created: `2026-07-21`

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 6. Vue 3: лучшие практики"
Rationale: Implements the roadmap item to extract upload/progress state from `ImageUploadNodeView.vue` into `useImageUpload`.

## Goal
Move all image-upload state and workflow from the Vue NodeView into a reusable `useImageUpload` composable. Keep `ImageUploadNodeView.vue` focused on its template, icons, and binding DOM events/state returned by the composable, without changing the host-facing image-upload adapter contract or the image-upload node schema.

## Tasks

### Phase 1: Encapsulate Upload Workflow
- [x] **Task 1: Create the `useImageUpload` composable.**
  - [x] Create `packages/editor/src/composables/useImageUpload.ts` with a typed input contract for the Tiptap editor, NodeView `getPos`, current upload node, and `ImageUploadNodeOptions`.
  - [x] Move the `FileItem` state model, `fileItems`, `hasFiles`, drag flags, file-input ref, file-size formatting, file selection/drop handlers, validation, upload invocation, progress updates, cancellation, remove/clear actions, and URL validation out of `ImageUploadNodeView.vue`.
  - [x] Keep the established host adapter contract unchanged: call `upload(file, { onProgress, abortSignal })`, pass successful URLs to `onSuccess`, and pass failures/invalid user input to `onError`.
  - [x] Keep node replacement in the composable: after successful uploads, validate the NodeView position, replace the upload node with configured image nodes, set `src`/`alt`/`title`, and call `focusNextNode`.
  - [x] Preserve each successful URL's source `File` when constructing image nodes, so a failed earlier file cannot cause a later uploaded image to receive the wrong filename.
  - [x] Abort in-flight requests and release any tracked object URLs when files are removed, all files are cleared, or the NodeView scope is disposed.
  - [x] **Logging requirements:** add development-only `console.debug` checkpoints under `[useImageUpload]` for selection/drop counts, upload start/progress/success, cancellation, and node replacement; log only safe metadata (file name, size, item ID, progress, count), never file contents or adapter credentials. Use `console.error` with safe context for unexpected upload/position/transaction failures while still invoking `onError`.
  - [x] Files: `packages/editor/src/composables/useImageUpload.ts`.

### Phase 2: Reduce the NodeView to UI Binding
- [x] **Task 2: Rewire `ImageUploadNodeView.vue` to consume the composable.** (depends on Task 1)
  - [x] Replace local upload refs, computed state, interfaces, workflow functions, and ProseMirror mutations with a single `useImageUpload(...)` call.
  - [x] Retain the existing template structure, SVG icon components, CSS classes, accessibility attributes, button labels, input attributes, and event bindings; bind them to the returned composable state and handlers.
  - [x] Keep `nodeViewProps` as the NodeView boundary and pass only the required editor/node/position/options data into the composable.
  - [x] Verify behavior parity for click-to-upload, drag/drop enter-leave state, input reset before reopening, size/limit rejection, individual cancellation, Clear All, upload progress/error rendering, and successful replacement with image nodes.
  - [x] **Logging requirements:** do not add upload workflow logging to the component; all diagnostics must originate from `useImageUpload`, leaving the NodeView display-only and preventing duplicate messages.
  - [x] Files: `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue`.

### Phase 3: Expose and Check the Integration
- [x] **Task 3: Export the composable and perform static integration checks.** (depends on Tasks 1 and 2)
  - [x] Add `useImageUpload` and any intentionally public supporting types to the composables barrel following existing export conventions.
  - [x] Confirm no changes are required to `packages/schema/src/types/image-upload.ts`, `packages/schema/src/nodes/image-upload/image-upload.ts`, or the host `ImageUploadAdapter` API; this refactor must remain backward-compatible for editor consumers.
  - [x] Run the repository's focused formatting/type/lint commands for changed editor sources only; do not add or run test tasks because testing is explicitly out of scope for this plan.
  - [x] **Logging requirements:** verify that diagnostics use the `[useImageUpload]` prefix, remain development-only for debug events, and do not expose file content, URLs with credentials, or adapter secrets.
  - [x] Files: `packages/editor/src/composables/index.ts`, `packages/editor/src/composables/useImageUpload.ts`, `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue`.

## Acceptance Criteria
- [x] `ImageUploadNodeView.vue` has no local upload queue/progress/abort/validation/ProseMirror-replacement business logic.
- [x] `useImageUpload` owns upload lifecycle state, progress callbacks, cancellation, cleanup, validation, and conversion of uploaded files into image nodes.
- [x] Existing `ImageUploadAdapter` callback shape and image-upload node options remain unchanged.
- [x] The rendered upload UI and all user-visible upload/error/progress interactions remain intact.
- [x] Failed multi-file uploads do not corrupt the filename metadata of successful later uploads.
- [x] No documentation or test files are added or modified.

## Validation
- [x] Run the focused editor typecheck, formatter, and lint commands configured by the repository after implementation.
- [ ] Manually exercise click selection, drag-and-drop, cancellation, Clear All, rejected size/limit cases, single upload, and a mixed-success multi-file upload through the playground/editor host.

## Rework Resolution
- [x] **2026-07-21:** Addressed blocking finding `ea1b8d30399c` by replacing the production log of the host adapter error message with the fixed `unexpected-image-upload-error` failure category and existing safe metadata. `onError` continues to receive the original `Error` instance.
- [x] Verified with `npm run typecheck --workspace=@i-prikot/editor` and a targeted Prettier/static logging scan. `npm run lint --workspace=@i-prikot/editor` remains blocked by the environment's missing optional `unrs-resolver` native binding before source linting can run.
