<!-- handoff:task:b2b86255-7063-4f61-9e6d-48b6873114e7 -->
# Remove URL Access From Library

**Created:** 2026-07-14  
**Branch:** `main`  
**Mode:** Fast autonomous Handoff

## Settings

- [x] **Testing:** the original implementation added no test coverage. This rework updates existing typecheck fixtures for the required public API and runs the mandated typecheck validation; it adds no new tests.
- [x] **Logging:** retain existing redacted error handling and development diagnostics only; do not log document IDs, base URLs, URL fragments, room names, tokens, or generated anchor links.
- [x] **Docs:** no documentation changes.

## Rework Record (2026-07-14)

- [x] Apply host `currentAnchor` in `TocSidebar` only for the initial or a changed anchor, so TOC content refreshes do not overwrite scroll-derived active headings.
- [x] Update stale typecheck targets for required `documentId`/`baseUrl` props and remove the deleted `document-id` utility test.
- [x] Verify the rework with `npm run typecheck`, scoped ESLint, and a scoped diff check. The two affected runtime suites were run but retain unrelated existing failures outside this rework's scope.

## Roadmap Linkage

- [ ] **Milestone:** `Этап 3. Границы библиотеки и архитектура` — `Граница «библиотека ↔ хост»`.
- [ ] **Rationale:** this completes the roadmap boundary that prohibits reusable editor code from reading browser URLs and requires host-supplied external context.

## Scope and Constraints

- [x] Remove every browser-URL read from `src/editor/`, not only the named `getDocumentId`, `?noCollab=1`, and copied-anchor cases. This includes direct `window.location` access, `URLSearchParams(window.location.search)`, and URL bases derived from `window.location.href`.
- [x] Make the host provide a required stable `documentId` and `baseUrl` through the public `NotionEditor` contract. Do not derive fallback values from pathname, `location`, or another browser global inside the library.
- [x] Replace the legacy `room` prop with the supplied `documentId` wherever collaboration names and document-scoped interaction state need an identifier. Preserve collaboration document-name prefixing through the injected collaboration configuration.
- [x] Keep the library capable of copying and navigating to unique-node anchors, but make the host own current-fragment input, URL-change handling, and browser-history policy. The library may construct an anchor from `baseUrl`; it must not inspect or subscribe to the browser URL.
- [x] Keep `useLinkPopover` safe for relative URLs by resolving against the explicit host `baseUrl`, not `window.location.href`.
- [x] Adapt only the playground host (`src/App.vue`) to read `window.location`, query parameters, and browser events. It must explicitly map `?noCollab=1` into the public collaboration configuration rather than leaving that policy in `src/editor/`.
- [x] Coordinate with the existing uncommitted host-boundary and cloud-configuration work. Do not revert it, reintroduce `import.meta.env` reads under `src/editor/`, or create test/documentation changes.

## Tasks

### Phase 1: Establish the URL-independent public contract

- [x] **Task 1: Define document and anchor-navigation inputs in the public editor API.** Add required `documentId` and `baseUrl` fields to `NotionEditorProps` in `src/editor/components/notion/public-api.ts`; remove the public `room` field. Add a typed optional current-anchor input and an anchor-navigation/change callback or emitted event so hosts can supply the active fragment and decide whether to update history. Re-export any new public types from `src/editor/index.ts`.
  - [x] **Expected behavior:** a TypeScript consumer cannot mount `NotionEditor` without naming its document and base URL; the public anchor contract transports decoded node IDs rather than exposing `Location`, `History`, or `Window` types. A host can keep deep-link behavior by feeding its current fragment into the editor and handling anchor changes itself.
  - [x] **Files:** `src/editor/components/notion/public-api.ts`, `src/editor/index.ts`.
  - [x] **Logging:** add no new logs or telemetry. Keep public types free of secret-bearing configuration and avoid diagnostic messages that include `documentId`, `baseUrl`, or anchor IDs.
  - [x] **Dependency notes:** this contract is the prerequisite for every subsequent task and must compose with the collaboration configuration types planned in `.ai-factory/plans/inject-collaboration-and-ai-configuration.md`.

### Phase 2: Remove document and collaboration URL derivation

- [x] **Task 2: Thread `documentId` through editor setup and delete the pathname helper.** Update `src/editor/components/notion/NotionEditor.vue`, `src/editor/components/notion/NotionEditorContent.vue`, and `src/editor/components/notion/EditorProvider.vue` to forward the required identifier to collaboration setup and document-scoped initialization. Replace `getDocumentId()` in `EditorProvider` with the prop when constructing the existing `hasInteracted-<documentId>` key, then delete `src/editor/utils/document-id.ts`.
  - [x] **Expected behavior:** default-content interaction state and collaboration naming use the exact host-supplied identifier; the reusable editor contains no path-segment parsing and does not silently substitute `default` for an absent identifier.
  - [x] **Files:** `src/editor/components/notion/NotionEditor.vue`, `src/editor/components/notion/NotionEditorContent.vue`, `src/editor/components/notion/EditorProvider.vue`, `src/editor/utils/document-id.ts` (delete).
  - [x] **Logging:** retain the existing metadata-only lifecycle debug events, but do not add `documentId` or local-storage-key values to their details. Preserve existing error handling unchanged.
  - [x] **Dependency notes:** depends on Task 1. Integrate with the concurrent collaboration-config refactor by passing `documentId` into its revised `provideCollab` call rather than retaining a parallel `room` path.

- [x] **Task 3: Remove query-string collaboration policy from the library.** Refactor `src/editor/composables/useCollab.ts` so it no longer exports or uses `getUrlParam`, `URLSearchParams`, or `window.location`. Resolve collaboration exclusively from its supplied host configuration and document identifier; remove the `?noCollab=1` branch while preserving local fallback, token precedence, prefixing, provider lifecycle cleanup, and redacted token-fetch failures.
  - [x] **Expected behavior:** library collaboration is enabled only by explicit configuration. A host can disable it by omitting or disabling the collaboration configuration, with no library dependency on query-string state.
  - [x] **Files:** `src/editor/composables/useCollab.ts`; adjust `src/editor/components/notion/NotionEditor.vue` only as needed to match the configuration signature introduced by the concurrent cloud-configuration work.
  - [x] **Logging:** preserve existing token-fetch error logging without secrets or document identifiers; add no logs for configuration enablement, query parameters, or room names.
  - [x] **Dependency notes:** depends on Tasks 1–2 and must be implemented alongside the active injected-collaboration configuration plan so configuration ownership remains singular.

### Phase 3: Make all URL-derived editor behaviors host-driven

- [x] **Task 4: Refactor anchor, TOC, startup-fragment, and link-resolution flows to use explicit context.** Introduce a narrowly scoped internal URL/anchor context or pass typed inputs through the existing provider chain from `NotionEditor`. Use `baseUrl` to generate copied node links in `src/editor/composables/useNodeActions.ts` and to resolve links in `src/editor/composables/useLinkPopover.ts`. Replace `window.location` reads in `src/editor/composables/useScrollToHash.ts` and `src/editor/components/notion/TocSidebar.vue` with the host-provided current-anchor value; replace the `window.history.replaceState` branch in `src/editor/utils/toc-utils.ts` with the public anchor-change callback/event. Preserve scrolling, node selection, keyboard/menu availability, TOC active-state behavior, and clipboard error handling.
  - [x] **Expected behavior:** copied node links equal the supplied base URL plus the selected node fragment (and retain the existing `source=copy_link` marker if it remains part of the public behavior); TOC clicks select and scroll to headings, then notify the host with the target ID; initial/deep-link scrolling responds only to explicit host anchor updates. Relative links continue to be sanitized against the host base URL.
  - [x] **Files:** `src/editor/composables/useNodeActions.ts`, `src/editor/composables/useLinkPopover.ts`, `src/editor/composables/useScrollToHash.ts`, `src/editor/composables/useToc.ts`, `src/editor/utils/toc-utils.ts`, `src/editor/components/notion/TocSidebar.vue`, `src/editor/components/notion/EditorContentArea.vue`, and the provider/root components needed to supply the internal context.
  - [x] **Logging:** preserve only existing clipboard and extension-availability errors; do not log copied URLs, anchor IDs, URL parsing failures, host callbacks, or navigation events.
  - [x] **Dependency notes:** depends on Task 1. Keep browser-independent scroll/selection utilities intact; only URL acquisition and history mutation move to the host boundary.

### Phase 4: Adapt the playground and verify the boundary

- [x] **Task 5: Move browser URL adaptation into the playground and perform non-test validation.** In `src/App.vue`, derive the document ID, base URL, current hash/anchor, and `?noCollab=1` policy from browser APIs; pass them through `NotionEditor`’s explicit contract; listen for host-owned hash/navigation events and update the supplied anchor state/history consistently. Remove the app import of `getDocumentId`. Then run static boundary searches and non-test quality commands.
  - [x] **Expected behavior:** the playground preserves its current route-derived collaboration room, deep-link scrolling, copied-anchor URL shape, and `?noCollab=1` opt-out while all `window.location`, `URLSearchParams`, `hashchange`, `pageshow`, `popstate`, and history use are confined to the host application. The library remains usable in non-browser or embedded hosts that supply the same values without a global URL.
  - [x] **Files:** `src/App.vue`; modify any new playground-only helper only if extracting the host URL adapter improves clarity. Do not modify files under `test/`, `e2e/`, `docs/`, or existing plan artifacts.
  - [x] **Validation:** do not run test commands. Search `src/editor/` for `window.location`, `location.href`, `location.hash`, `URLSearchParams`, `getDocumentId`, and `getUrlParam` and require zero matches. Confirm `src/editor/index.ts` exports the typed host contract but no browser-global API. Run `npm run typecheck`, `npm run lint`, and `npm run build`.
  - [x] **Logging:** add no playground logs for route parsing, hash synchronization, collaboration opt-out, or anchor changes. Preserve existing redacted errors only.
  - [x] **Dependency notes:** depends on Tasks 1–4 and is the sole permitted browser URL adapter.

## Commit Plan

- [ ] **Commit 1 (Tasks 1–3):** `refactor(editor): inject document and collaboration context`
- [ ] **Commit 2 (Tasks 4–5):** `refactor(playground): move editor url handling to host`

## Acceptance Criteria

- [x] `src/editor/` has no direct browser URL reads: no `window.location`, `location.href`, `location.hash`, `URLSearchParams`, pathname parsing, or URL-derived query policy.
- [x] `getDocumentId` and `src/editor/utils/document-id.ts` are removed; all editor document-scoped behavior uses the required host `documentId`.
- [x] The `?noCollab=1` decision occurs only in `src/App.vue` (or a host-only adapter), and `useCollab` has no URL utility or browser URL access.
- [x] Copied node-anchor links and relative-link sanitization use the explicit host `baseUrl`; TOC/deep-link synchronization communicates through the public host contract rather than reading or mutating browser URLs inside the library.
- [x] The playground preserves URL-driven demo behavior, while reusable editor imports work without requiring a global `window.location`.
- [x] **Rework exception:** the graceful-degradation integration test is updated only to restore the requested regression coverage; no unrelated tests or documentation files are changed.

## Rework Validation (2026-07-14)

- [x] **Address review finding `7389ac7fabb1`:** expire a TOC-originated requested-anchor marker after the synchronous host response turn, while preserving matching immediate host-echo suppression. A host that declines or supersedes the request can therefore later provide the same anchor as a genuine external update and trigger centered scrolling.
  - **RED:** `npm test -- --run test/editor/composables/scroll-and-viewport-branches.test.ts` failed: `onTargetFound` had zero calls after the host declined a TOC request and later supplied the same anchor.
  - **GREEN:** the same command passes all three tests; `npm run typecheck` passes; focused ESLint has only existing `vue/one-component-per-file` warnings in test helpers.

- [x] **Address review finding `6d4c05d6785c`:** pass the newly created anchor-navigation context directly from `NotionEditor` to `provideToc`, avoiding a same-root re-injection failure; keep the graceful-degradation suite in a single module graph and exercise explicit `collaboration` props rather than environment configuration.
  - **RED:** `npm test -- --run test/editor/components/notion/notion-editor.graceful-degradation.integration.test.ts` failed because `provideToc()` could not inject anchor navigation.
  - **GREEN:** the same command passes both graceful-degradation cases; `npm run typecheck` passes.

- [x] **Address review findings `12d390dfe7ec` and `8d82b4c73020`:** record a TOC-originated anchor request in `AnchorNavigationContext` and consume only its matching host echo in `useScrollToHash`, so the TOC’s offset scroll is not replaced by a delayed centered scroll. Update the affected composable test to provide the host anchor context and drive external anchors explicitly; remove the obsolete browser-history assertions from `toc-utils`.
  - **GREEN:** `npm test -- --run test/editor/utils/toc-utils.test.ts test/editor/composables/scroll-and-viewport-branches.test.ts` and `npm run typecheck` pass; `npm run lint` exits successfully with non-blocking `vue/one-component-per-file` warnings in test helpers.
