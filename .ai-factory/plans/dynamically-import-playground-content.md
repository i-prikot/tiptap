<!-- handoff:task:2ce04933-1a12-4ab2-9b0b-47e262195655 -->
# Implementation Plan: Dynamically import playground content

**Created:** 2026-07-22  
**Branch:** `main`

## Settings
- [x] **Testing:** no — do not add or run automated tests.
- [x] **Logging:** verbose implementation/build diagnostics only; do not add browser logging or telemetry for document content.
- [x] **Docs:** no — no documentation changes; emit the normal warn-only documentation checkpoint during implementation.

## Roadmap Linkage
**Milestone:** "Этап 7. Производительность"  
**Rationale:** This completes the roadmap item to lazy-load the approximately 46 KB playground default document so it is not part of the initial application bundle.

## Scope and Constraints
- [x] Move the load boundary only within `apps/playground`; retain `apps/playground/src/content/default-content.ts` as the playground-owned source of the demo JSON.
- [x] Do not import the payload from `packages/editor` or `packages/schema`, and do not change either package's public exports, package files, or published API.
- [x] Preserve the current seed rules: seed only an empty editor whose document ID has not recorded interaction; focus the seeded document at its start; keep the update listener and local-storage behavior intact.
- [x] Avoid stale asynchronous writes when a ready editor is replaced, unmounted, or otherwise cleaned up before the `import()` promise resolves.
- [x] Leave the current Vite configuration unchanged unless build inspection proves the dynamic boundary is being collapsed.

## Tasks

### Phase 1: Create a cancellation-safe lazy seed loader

- [x] **Task 1: Replace the static default-content import with a cached dynamic loader.**
  - [x] **Files:** modify `apps/playground/src/composables/useDemoDocumentSeed.ts`; inspect-only `apps/playground/src/content/default-content.ts`.
  - [x] Remove the top-level `defaultContent` import and add a module-level, cached `import('../content/default-content')` loader that returns the named `defaultContent` export without duplicating the 44,403-byte JSON payload or moving it into a library package.
  - [x] Make initialization asynchronous only after the existing empty-editor and `hasInteracted-*` local-storage checks establish that a seed is required; sessions that do not need seed content must not request the chunk.
  - [x] Track the active initialization/editor lifecycle so a resolved import cannot call `setContent`, focus, register an update listener, or overwrite cleanup state for an editor that was superseded or cleaned up while loading.
  - [x] Preserve idempotent cleanup, listener removal, `addToHistory: false`, and the existing update-based interaction marker; handle loader rejection through the caller/framework error path rather than silently seeding partial content.
  - [x] **Logging requirements:** add no runtime `console` logs, telemetry, document-content logs, or storage-key logs. Keep loader failures visible to normal async error handling (`ERROR`); retain detailed command/build observations only in the implementation handoff.

### Phase 2: Integrate asynchronous seeding with editor readiness

- [x] **Task 2: Update the playground readiness handler for the asynchronous seed contract.** (depends on Task 1)
  - [x] **Files:** modify `apps/playground/src/App.vue`; coordinate with `apps/playground/src/composables/useDemoDocumentSeed.ts`.
  - [x] Adapt `handleReady` to invoke the asynchronous initializer without introducing an unhandled promise rejection, while preserving the existing immediate editor assignment and cleanup-before-reinitialize sequence.
  - [x] Ensure URL-driven editor recreation (`editorSessionKey`), component unmount, and repeated `ready` events continue to invalidate prior seed work through the composable's cleanup path; do not delay the editor UI or alter collaboration, image-upload, theme, anchor, or overlay behavior.
  - [x] Keep the event handler compatible with the `NotionEditor` `ready` event type and preserve the public playground runtime behavior after a fresh load and after navigation that creates a different document session.
  - [x] **Logging requirements:** do not add readiness, editor-ID, URL, or user-content logging. Surface unexpected rejected initialization through the existing application/framework error mechanism (`ERROR`) only; retain verbose implementation diagnostics outside production code.

### Phase 3: Inspect the production split and publication boundary

- [x] **Task 3: Build and manually verify deferred loading without expanding test or documentation scope.** (depends on Tasks 1–2)
  - [x] **Files:** inspect `apps/playground/vite.config.ts`, `apps/playground/dist/**` (generated), `apps/playground/src/composables/useDemoDocumentSeed.ts`, `apps/playground/src/App.vue`, and `packages/editor/package.json`; modify Vite configuration only if necessary to preserve the dynamic split point.
  - [x] Run `npm run typecheck --workspace=@i-prikot/playground` and `npm run build --workspace=@i-prikot/playground`; do not run Vitest, Playwright, or add automated test files because testing is explicitly disabled.
  - [x] Inspect generated playground assets/manifest to confirm `default-content.ts` is emitted as a separately requested chunk and is absent from the initial application entry chunk. Confirm the initial editor remains usable until its seed content arrives.
  - [x] Manually exercise a fresh, empty playground document and a document already marked as interacted: verify the fresh document receives the same content and focus behavior after the lazy request, while the interacted case does not request or replace content. Also verify rapid document/session replacement or page teardown during loading causes no stale content write and no uncaught rejection.
  - [x] Confirm `@i-prikot/editor` publication remains limited to its existing `dist` files and that the playground-only `src/content/default-content.ts` is neither exported nor included in a library artifact.
  - [x] **Logging requirements:** preserve verbose typecheck/build output and chunk-inspection evidence in the implementation handoff. Do not add application instrumentation; inspect loader failures and build diagnostics as `ERROR` evidence only, without recording document JSON.

## Completion Criteria
- [x] `apps/playground/src/content/default-content.ts` has no static import path from the playground's initial module graph.
- [x] The default payload loads at most once per page through a dynamic import and only when a seed is actually needed.
- [x] Existing seed, focus, local-storage interaction, listener cleanup, and editor-session replacement behavior remain correct despite asynchronous completion.
- [x] Production playground output contains a distinct lazy default-content asset rather than embedding the payload in the entry chunk.
- [x] No library package exports or published files expose the playground content, and no test or documentation files change.
