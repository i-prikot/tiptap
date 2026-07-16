<!-- handoff:task:088476da-79dd-42e4-b00c-b10668d9667d -->
# Implementation Plan: Move Host Header UI to Playground

Branch: `main`
Created: 2026-07-14
Plan file: `.ai-factory/plans/move-host-header-ui-to-playground.md`

## Settings

- [ ] Testing: no new or modified tests, per task instruction. This explicitly overrides the project TDD rule for this handoff.
- [ ] Logging: verbose lifecycle diagnostics only. Preserve existing development-only editor diagnostics; do not log document JSON, generated HTML, clipboard contents, URLs, or collaboration-user data.
- [ ] Docs: no README, package metadata, or standalone documentation changes.
- [ ] Package manager: npm, because `package-lock.json` is present.

## Roadmap Linkage

Milestone: "none"
Rationale: skipped by autonomous Handoff defaults.

## Scope and Decisions

- [ ] Remove `NotionEditorHeader` and `CtaPopup` from the `src/editor` library tree and from `EditorProvider` composition. The library continues to own editor content, floating menus, the mobile toolbar, and table controls.
- [ ] Keep `TocSidebar` in the library behind the existing public `features.tocSidebar` opt-in. Change its default to `false` so an embedding host receives editor content without a host layout sidebar unless it explicitly requests one.
- [ ] Remove the now-invalid `features.header` and `features.ctaPopup` public flags rather than retaining flags with no library effect. Update the playground to opt in to `tocSidebar` where it must preserve the current demo layout.
- [ ] Treat `src/App.vue` and new `src/playground/**` modules as the application playground boundary. The playground owns its header and CTA presentation, while `src/editor/**` remains reusable editor UI.
- [ ] Drive host undo/redo from the `Editor` emitted by `NotionEditor`’s existing `ready` event. Reuse `UndoRedoButton` with its explicit `editor` prop so enabled state tracks Tiptap `transaction` events, including undo/redo availability changes that do not wait for the debounced document `update` event.
- [ ] Keep the existing public `ready`, `update`, and exposed-editor contracts unchanged. Do not introduce library build/distribution changes.

## Current State

- [ ] `src/editor/components/notion/EditorProvider.vue` renders `NotionEditorHeader`, `EditorContentArea`, optional `TocSidebar`, optional table controls, and `CtaPopup` inside the editor wrapper.
- [ ] `src/editor/components/notion/public-api.ts` exposes six feature flags, with header, CTA, and TOC sidebar all enabled by default.
- [ ] `src/App.vue` only renders `NotionEditor`, so it does not yet retain the emitted Tiptap instance or compose host UI.
- [ ] `UndoRedoButton.vue` already accepts an explicit `Editor` and subscribes to that editor’s `transaction` events; `CollabUsers.vue` can use the same explicit-editor pattern instead of depending solely on descendant injection.
- [ ] Header styles live in `src/editor/styles/notion-editor.css`; CTA styles share `src/editor/styles/setup-error.css` with the still-library-owned setup-error view.

## Tasks

### Phase 1: Narrow the Library Shell

- [x] **Task 1: Remove host-only surfaces from editor composition and public flags.**
  - [ ] **Files:** modify `src/editor/components/notion/EditorProvider.vue`; modify `src/editor/components/notion/public-api.ts`.
  - [ ] **Deliverable:** `EditorProvider` renders only the editor layout/content, optional TOC sidebar, and optional table controls; it no longer imports or mounts the header or CTA. Delete `header` and `ctaPopup` from `EditorFeatureFlags` and defaults. Retain `tocSidebar` as the only sidebar control and default it to `false`, while leaving floating-menu, mobile-toolbar, and table-control behavior unchanged.
  - [ ] **Compatibility:** preserve `NotionEditor` ready/update/ref APIs, the editor extension schema, TOC content updates, collaboration behavior, and wrapper/layout class names used by editor and TOC styles. Incompatible removed feature keys must be caught by TypeScript instead of silently ignored.
  - [ ] **Logging:** retain existing `EditorProvider` development-only `features-resolved` logging with the reduced feature object; do not add runtime logging for normal presentation branches.
  - [ ] **Dependency notes:** complete before wiring the playground, because the new host must consume the final public TOC flag and no longer rely on library-owned header/CTA rendering.

### Phase 2: Add Playground-Owned Host UI

- [x] **Task 2: Move header and CTA presentation into a dedicated playground module.**
  - [ ] **Files:** create `src/playground/components/NotionEditorHeader.vue`; create `src/playground/components/CtaPopup.vue`; create `src/playground/styles/notion-editor-header.css`; create `src/playground/styles/cta-popup.css`; modify `src/editor/styles/notion-editor.css`; modify `src/editor/styles/setup-error.css`; modify `src/main.ts`; delete `src/editor/components/notion/NotionEditorHeader.vue`; delete `src/editor/components/notion/CtaPopup.vue` after their playground replacements are in place.
  - [ ] **Deliverable:** relocate the existing header and CTA behavior to `src/playground/**`, preserving current visual markup, CTA query-string behavior, close/copy/open actions, accessibility attributes, and Teleport target. Move only the header-specific CSS variables/rules and CTA-specific CSS rules out of editor styles; retain editor layout/content styles and setup-error CSS in their existing library files. Import the new playground styles from the application entrypoint.
  - [ ] **Host-editor contract:** make the moved header accept `editor: Editor | null` and pass it explicitly to undo/redo controls. Render safe disabled/unavailable states before `ready`, subscribe through the controls’ existing transaction-aware behavior, and detach any direct listener introduced by moved host UI when its editor changes or it unmounts.
  - [ ] **Collaboration UI:** update `src/editor/components/notion/CollabUsers.vue` only as needed to accept the same optional explicit editor input, preserving its context fallback for existing in-library callers and its transaction listener cleanup.
  - [ ] **Logging:** add no logs for CTA clicks, clipboard writes, query-string removal, theme selection, undo/redo clicks, or collaboration-user changes. Preserve existing error reporting for failed clipboard operations and existing editor diagnostics.
  - [ ] **Dependency notes:** depends on Task 1’s library boundary. Do not re-export playground components from `src/editor/index.ts`.

### Phase 3: Compose and Lifecycle-Manage the Playground

- [x] **Task 3: Wire the app playground to the emitted editor instance.**
  - [ ] **Files:** modify `src/App.vue`; modify `src/editor/components/notion/CollabUsers.vue` only if Task 2 requires explicit-editor support.
  - [ ] **Deliverable:** retain the editor received from `NotionEditor`’s `ready` event in reactive state; render the playground header and CTA around the editor; pass the live instance into header controls; clear or replace the reference safely when the component lifecycle changes. Pass `:features="{ tocSidebar: true }"` to the playground’s editor instance so the current demo continues to show its TOC while library consumers opt in independently.
  - [ ] **Undo/redo behavior:** clicking host controls calls the supplied editor instance, focuses it before executing the command, respects `editor.isEditable` and `editor.can().undo()/redo()`, and updates availability from editor `transaction` events rather than relying on the 300 ms document-update event. Keep image-node selection safeguards aligned with `UndoRedoButton.vue`.
  - [ ] **Lifecycle:** prevent stale editor references and duplicate transaction listeners when a replacement editor is emitted or the app unmounts; do not destroy the editor from the host because `EditorProvider` remains its owner.
  - [ ] **Logging:** use no new application logs for ready, transaction, or command state. Continue to rely on existing development-only `NotionEditor`/`EditorProvider` lifecycle diagnostics and existing command error handling.
  - [ ] **Dependency notes:** depends on Tasks 1 and 2. This is the integration point that verifies the moved UI is a host concern rather than a descendant of `EditorProvider`.

### Phase 4: Validate the Boundary Without Adding Tests

- [x] **Task 4: Run focused static and manual validation without changing test files.**
  - [x] **Files:** inspect the Task 1–3 production files only; do not create or modify files under `test/`, `e2e/`, or documentation paths.
  - [x] **Deliverable:** `npm run typecheck`, `npm run lint`, `npm run build`, static boundary checks, and a Vite server smoke check passed. Interactive browser checks were attempted but Playwright Chromium could not launch because the environment lacks `libglib-2.0.so.0`.
  - [x] **Regression checks:** verify no remaining production import references `src/editor/components/notion/NotionEditorHeader.vue` or `CtaPopup.vue`; confirm `src/editor/index.ts` exports only the public editor facade/contracts; confirm setup-error rendering keeps its CSS after CTA rules move.
  - [x] **Logging:** browser-console inspection could not run because the browser process could not start; no validation-only logs or test instrumentation were added.
  - [x] **Dependency notes:** runs after Tasks 1–3. Testing is intentionally excluded by the task instruction; record command outcomes in the implementation handoff rather than adding test coverage.

## Acceptance Criteria

- [x] `src/editor/components/notion/EditorProvider.vue` has no header or CTA imports/rendering, and the corresponding library component files are gone.
- [x] The editor’s public feature type no longer advertises `header` or `ctaPopup`; `features.tocSidebar` is an explicit opt-in with a default of `false`.
- [x] The playground owns and imports its header/CTA modules and their styles, while editor and setup-error styles retain only their library concerns.
- [x] The playground obtains the live `Editor` from `ready`; its undo/redo controls use that instance and reflect state changes from Tiptap transactions.
- [x] The playground explicitly enables its TOC sidebar; a generic `NotionEditor` consumer does not receive a TOC sidebar unless it opts in.
- [x] No tests or documentation files are added or modified.

## Rework Record

- [x] **2026-07-14: Address review finding `a792d2ef0d99`.** Removed the library-owned `:top-offset="48"` from `EditorProvider`'s optional `TocSidebar`, so embedding hosts use `TocSidebar`'s default `topOffset` of `0` instead of inheriting a playground header assumption.
- [x] **2026-07-14: Address review finding `f6e49e7d47fb`.** Added the neutral `stickyTopOffset` prop to `TocSidebar`, exposed it through `NotionEditor` as `tocSidebarStickyTopOffset`, and set the playground’s `130px` sticky position explicitly in `src/App.vue`.
- [x] **2026-07-14: Revalidated `f6e49e7d47fb`.** Scoped ESLint passed for the affected Vue/TypeScript files (the CSS file is intentionally ignored by ESLint), and `npm run typecheck` plus `npm run build` succeeded.
