<!-- handoff:task:e644e8c7-9eb0-48da-9dce-b989ce163762 -->
# Define Public Editor API

## Plan Metadata

- [ ] **Mode:** fast
- [ ] **Created:** 2026-07-14
- [ ] **Branch:** `main` (current Handoff workspace)
- [ ] **Project:** Vue 3 + TypeScript + Vite + Tiptap v3 editor
- [ ] **Plan file:** `.ai-factory/plans/define-public-editor-api.md`

## Settings

- [ ] **Testing:** no new or modified tests, per task instruction. This explicitly overrides the project TDD rule for this handoff.
- [ ] **Docs:** no README, package, or standalone documentation changes; document the API through exported TypeScript types and concise JSDoc only.
- [ ] **Logging:** verbose lifecycle diagnostics during implementation; do not log document JSON, generated HTML, file contents, or image URLs.
- [ ] **Package manager:** npm, because `package-lock.json` is present.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** skipped by autonomous Handoff default.

## Scope

- [x] Turn `src/editor/components/notion/NotionEditor.vue` into the stable public Vue component facade while preserving its current default Notion-like UI and cloud-context wiring.
- [x] Define typed props for JSON content, placeholder text, UI feature flags, and a consumer-supplied image-upload adapter.
- [x] Emit one ready event and debounced document-update events, and expose the live editor plus safe content/focus methods through a component ref.
- [x] Add a source-level editor entrypoint for the component and its public TypeScript contracts; do not introduce Vite library mode, package `exports`, or CSS distribution changes in this task.

## Current State

- [ ] `src/editor/components/notion/NotionEditor.vue` accepts only `room` and `placeholder`, creates the user/collaboration/AI/TOC contexts, and renders `NotionEditorContent`.
- [ ] `src/editor/components/notion/NotionEditorContent.vue` waits for optional cloud setup, then creates `EditorProvider` with the resolved collaboration provider, Y.Doc, placeholder, and AI token.
- [ ] `src/editor/components/notion/EditorProvider.vue` owns `useEditor`, configures the full extension schema, seeds `defaultContent` for a pristine local document, provides the editor to descendants, and currently hard-codes `handleImageUpload`.
- [ ] `src/editor/components/notion/EditorContentArea.vue` renders floating menus and the mobile toolbar; `EditorProvider.vue` always renders the header, TOC sidebar, table controls, and CTA popup.
- [ ] The repository is a Vite application rather than a packaged library, so public source exports must be introduced without changing the build/distribution contract.

## Public API Contract

- [x] Export `NotionEditor` as the component default plus named public types from a new `src/editor/index.ts` entrypoint. Keep internal composables, extensions, and node views private.
- [x] Define the contracts in a dedicated `src/editor/components/notion/public-api.ts` module, importing `Editor`/`JSONContent` from Tiptap rather than duplicating their shapes.
- [x] Support these component props:
  - [x] `content?: JSONContent` — initial/synchronized document input. Omission preserves the current default-content seeding behavior; an explicitly supplied empty document must remain empty.
  - [x] `placeholder?: string` — defaults to `Start writing...` and remains reactive through the configured Placeholder extension.
  - [x] `features?: Partial<EditorFeatureFlags>` — opt out of existing presentation surfaces (`header`, `tocSidebar`, `floatingMenus`, `mobileToolbar`, `tableControls`, and `ctaPopup`); all flags default to `true` and must not remove Tiptap extensions or alter the persisted document schema.
  - [x] `imageUpload?: ImageUploadAdapter` — a replacement for the demo uploader with the existing `(file, onProgress, abortSignal) => Promise<string>` semantics. The adapter result is the image source URL.
- [x] Support these events:
  - [x] `ready(editor: Editor)` — emitted once only after the editor instance has been created and its initial-content decision has completed.
  - [x] `update(payload: { json: JSONContent; html: string })` — emitted after a fixed, documented 300 ms debounce for editor document updates. It must not fire for silent prop synchronization or initialization.
- [x] Expose this ref API: `editor`, `getJSON()`, `getHTML()`, `focus()`, and `setContent()`. Before the editor is ready, getters return `null` and commands return `false`; `setContent` accepts an `emitUpdate` option that defaults to `true` for imperative consumer changes.

## Tasks

### Phase 1 — Public Contract and Export Surface

- [x] **Task 1: Define and export the editor API contracts.**
  - [x] **Files:** create `src/editor/components/notion/public-api.ts`; create `src/editor/index.ts`; update `src/editor/components/notion/NotionEditor.vue` only as needed to consume the new contracts.
  - [x] **Deliverable:** create `EditorFeatureFlags`, `ImageUploadAdapter`, ready/update payload types, `NotionEditorExpose`, default feature values, and the public source export for `NotionEditor` and its types.
  - [x] **Expected behavior:** consumers have one canonical typed API; the image adapter matches `ImageUploadNodeOptions.upload`; public method return values are deterministic when no editor instance exists.
  - [x] **Logging:** add development-only `console.debug` capability behind a local `import.meta.env.DEV` guard for public lifecycle messages; log API state/flag names and debounce timing only, never document or upload payloads. Reserve `console.error` for unexpected adapter or editor failures.
  - [x] **Dependencies:** none.

### Phase 2 — Propagation and Editor Configuration

- [x] **Task 2: Thread public props through the editor creation path.**
  - [x] **Files:** update `src/editor/components/notion/NotionEditor.vue`, `src/editor/components/notion/NotionEditorContent.vue`, and `src/editor/components/notion/EditorProvider.vue`.
  - [x] **Deliverable:** pass `content`, resolved features, and `imageUpload` from the public facade through the loading gate to the provider; configure the Placeholder extension with a reactive callback; configure `ImageUploadNode` with the supplied adapter or retain `handleImageUpload` as the backward-compatible fallback.
  - [x] **Expected behavior:** a supplied JSON document is used instead of `defaultContent`; missing content retains the existing local/collaboration seeding rules; parent content replacements synchronize only when materially different and are applied with update emission suppressed to prevent echo loops.
  - [x] **Logging:** log DEBUG-level initialization source (`consumer-content`, `default-content`, or `collaboration`) and a redacted content-sync result (`applied`, `skipped-equal`, or `skipped-unready`); log upload-adapter failures through the existing error path without file metadata.
  - [x] **Dependencies:** Task 1 defines the prop and adapter types.

### Phase 3 — Feature-Flagged Presentation

- [x] **Task 3: Gate optional editor UI with the public feature flags.**
  - [x] **Files:** update `src/editor/components/notion/EditorProvider.vue` and `src/editor/components/notion/EditorContentArea.vue`; update `src/editor/components/notion/NotionEditorHeader.vue` only if it needs a narrow prop for conditional composition.
  - [x] **Deliverable:** conditionally render the existing header, TOC sidebar, floating menus, mobile toolbar, table handles/overlay/extend controls, and CTA popup according to the resolved feature flags.
  - [x] **Expected behavior:** default flags produce the exact current UI; disabling a surface hides only that surface and leaves the shared editor, commands, extensions, and document JSON valid for later re-enablement.
  - [x] **Logging:** emit one development DEBUG summary of resolved flags after editor readiness; do not log each render or editor transaction.
  - [x] **Dependencies:** Task 2 provides the resolved feature flags to provider/content-area components.

### Phase 4 — Lifecycle Events and Exposed Methods

- [x] **Task 4: Add debounced provider lifecycle events.**
  - [x] **Files:** update `src/editor/components/notion/EditorProvider.vue`; create a focused helper under `src/editor/composables/` only if timer/cleanup logic cannot remain clear and local to the provider.
  - [x] **Deliverable:** emit the created editor through a typed ready event, subscribe to Tiptap document `update` events, coalesce updates with a 300 ms timer, create JSON/HTML payloads at flush time, suppress initialization and silent incoming-content sync events, and clear listeners/timers on teardown.
  - [x] **Expected behavior:** ready is single-fire for each mounted provider; rapid typing produces one latest-state update event per debounce window; unmounting prevents late emissions.
  - [x] **Logging:** log DEBUG events for ready, update scheduling, update flush, cancellation, and teardown with counters/timing only; log ERROR if payload serialization unexpectedly fails without including document content.
  - [x] **Dependencies:** Task 1 supplies event payload types; Task 2 supplies the content-sync suppression mechanism.

- [x] **Task 5: Forward lifecycle events and expose the stable facade.**
  - [x] **Files:** update `src/editor/components/notion/NotionEditor.vue` and `src/editor/components/notion/NotionEditorContent.vue`.
  - [x] **Deliverable:** forward typed ready/update events from `EditorProvider` to component consumers, retain the ready `Editor` in the root facade, and implement `defineExpose` for `editor`, `getJSON`, `getHTML`, `focus`, and `setContent` with the contract from Task 1.
  - [x] **Expected behavior:** a parent using `ref` on `NotionEditor` can safely call the exposed methods after `@ready`; imperative `setContent` emits the debounced update by default, while internal prop synchronization stays silent; teardown clears the facade editor reference.
  - [x] **Logging:** log DEBUG messages for facade ready, imperative calls, unavailable-editor no-ops, and teardown; omit arguments, JSON, HTML, and image values from all messages.
  - [x] **Dependencies:** Tasks 2 and 4 must provide provider props and typed lifecycle events.

## Acceptance Criteria

- [x] `src/editor/index.ts` exports `NotionEditor` and all consumer-required API types without exposing internal implementation modules.
- [x] `NotionEditor` supports typed JSON content, placeholder, feature flags, and an image-upload adapter while preserving all existing defaults when the new props are omitted.
- [x] An explicitly supplied empty Tiptap document is not replaced by demo `defaultContent`; a supplied image adapter receives progress and cancellation parameters and replaces the demo uploader.
- [x] Feature flags hide only their named UI surfaces; they do not change the Tiptap extension list or make existing document content invalid.
- [x] `ready` fires once per mounted, initialized editor and `update` emits current JSON/HTML no more often than the documented 300 ms debounce interval.
- [x] The public ref exposes the current `Editor | null`, content getters, focus, and content setting methods with safe pre-ready behavior.
- [x] The implementation keeps document, HTML, file, image, and adapter values out of diagnostic logs.
- [x] Run `npm run typecheck` and `npm run lint` after implementation; do not add or run test tasks under this handoff's `tests:false` setting.

## Out of Scope

- [ ] Adding Vite library mode, package `exports`, published-package metadata, peer-dependency changes, or a CSS distribution entrypoint.
- [ ] Changing the collaboration/AI environment-variable contracts or making collaboration a public prop in this task.
- [ ] Removing existing editor extensions or changing the persisted Tiptap schema when a feature flag is disabled.
- [ ] Adding unit, component, integration, e2e, or regression tests.
- [ ] Updating README files, user guides, changelogs, or other standalone documentation.

## Commit Plan

- [ ] **Commit 1** (after Tasks 1–3): `feat(editor): define configurable public API`
  - [ ] Include public contracts/source export, prop threading, content synchronization, uploader injection, and presentation feature flags.
- [ ] **Commit 2** (after Tasks 4–5): `feat(editor): expose debounced editor lifecycle API`
  - [ ] Include provider lifecycle events, debounce cleanup, root event forwarding, and the exposed editor facade.

## Rework Resolution

- [x] **2026-07-14 — `54f9ce804da5`:** Cancel a pending debounced update immediately before applying externally synchronized `content` with `emitUpdate: false`, preventing the silent content from being emitted later.
- [x] **2026-07-14 — `39631ca55ba2`:** Added an image-source restriction that was superseded because it incorrectly rejected valid relative same-origin URLs.
- [x] **2026-07-14 — `825a1d448209`:** Cancel a pending debounced update before a facade `setContent(..., { emitUpdate: false })` applies silent imperative content.
- [x] **2026-07-14 — `58791d4face9`:** Refresh placeholder decorations whenever the public `placeholder` prop changes, including for an already-empty editor.
- [x] **2026-07-14 — `06bd6681572f`:** Narrowed the image-source restriction to consumer upload adapters; this was superseded by the general-content fix below.
- [x] **2026-07-14 — `f12faf6280e5`:** Removed the undocumented image URL restriction from public `content`, `setContent`, and `imageUpload` adapter handling. The component now accepts normal Tiptap JSON and passes adapter result URLs through without imposing an additional URL policy.
- [x] **2026-07-14 — `e7c0612e6208`:** Documented that HTML returned by `getHTML()` and emitted in `update` is document-derived, untrusted HTML that consumers must sanitize before using with `v-html` or otherwise treating as trusted HTML.
