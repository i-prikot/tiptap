<!-- handoff:task:65c4c15f-31bc-44e6-8ba3-2cd76f544f45 -->
# Implementation Plan: Centralize Development Diagnostics

Branch: `main`
Created: 2026-07-22

## Settings
- [ ] Testing: no
- [ ] Logging: verbose development diagnostics only
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: This autonomous fast plan is a focused internal refactor and has no selected roadmap milestone.

## Goal
Replace duplicated component- and composable-local `debug`/`debugEditor` functions with one typed, development-only diagnostics utility. Preserve each current diagnostic event and metadata shape while standardizing the output format and avoiding production debug output.

## Scope Decisions
- [x] Introduce a `development-diagnostics` utility rather than an `ErrorTracking` integration: the current code emits local console diagnostics only and has no external error-tracking transport.
- [x] Use a namespace-based factory with structured metadata, e.g. `[useImageAlign] command completed`, so all callers retain their existing source identity.
- [x] Gate all debug calls behind `import.meta.env.DEV`; Notion editor lifecycle diagnostics additionally require the existing `developmentDiagnostics` prop through a live predicate, so prop changes are observed without recreating the logger.
- [x] Keep existing production `console.error` behavior, public prop names, event names, and metadata fields unchanged unless a type-safe standardization is required.
- [x] Do not add tests or documentation as requested.

## Tasks

### Phase 1: Shared Diagnostics API
- [x] **Task 1: Add the central typed diagnostics factory.**
  - [x] **Files:** create `packages/editor/src/utils/development-diagnostics.ts`.
  - [x] Define the shared metadata type and a namespace-bound factory exposing `debug(event, metadata?)`; accept an optional enabled predicate for callers requiring an additional opt-in.
  - [x] Centralize the Vite development-mode check with the existing defensive `ImportMeta` typing, emit through `globalThis.console.debug`, and keep the standardized `[namespace] event` prefix with a structured metadata argument.
  - [x] Ensure the enabled predicate is evaluated at call time, metadata remains optional, and the helper introduces no network/error-tracking dependency or production debug output.
  - [x] **Logging requirements:** this module is the sole DEBUG control point; it logs only namespaced event names and caller-supplied redacted metadata at DEBUG level, never logs when the development gate is false, and does not emit INFO/WARN/ERROR itself.

### Phase 2: Migrate Composable Diagnostics
- [x] **Task 2: Replace all composable-local debug implementations with the shared factory.**
  - [x] **Files:** modify `packages/editor/src/composables/useColorMenu.ts`, `packages/editor/src/composables/useImageAlign.ts`, `packages/editor/src/composables/useImageCaption.ts`, `packages/editor/src/composables/useImageUpload.ts`, `packages/editor/src/composables/useImageUploadButton.ts`, `packages/editor/src/composables/useIndent.ts`, and `packages/editor/src/composables/useUndoRedo.ts`.
  - [x] Remove each duplicated `isDevelopment` declaration and local `debug` function; create a module-scoped logger using that composable's current namespace.
  - [x] Preserve every event string, branch, return value, and metadata field. For `useIndent` and `useUndoRedo`, continue merging the action into the metadata before calling the shared API.
  - [x] Retain existing specialized metadata typings such as image-upload diagnostic metadata; do not widen operational data to `any`.
  - [x] **Logging requirements:** preserve the existing DEBUG event lifecycle (rejected/attempted/completed/failed and equivalent events) and structured fields; all outputs route through the factory and remain development-only.

### Phase 3: Migrate Editor Lifecycle Diagnostics
- [x] **Task 3: Route Notion editor and provider diagnostics through the same utility.**
  - [x] **Files:** modify `packages/editor/src/components/notion/notion-editor/NotionEditor.vue` and `packages/editor/src/components/notion/notion-editor/EditorProvider.vue`.
  - [x] Replace both `debugEditor` helpers and their inline ESLint console suppressions with namespace-bound shared diagnostics instances for `NotionEditor` and `EditorProvider`.
  - [x] Use an enabled predicate based on `props.developmentDiagnostics` so lifecycle diagnostics retain the public opt-in while also honoring the shared development gate.
  - [x] Preserve prop forwarding through `NotionEditorContent.vue`, the public `developmentDiagnostics` API in `public-api.ts`, all event names/details, and existing non-debug error handling.
  - [x] **Logging requirements:** emit the existing redacted lifecycle checkpoints only at DEBUG level when both development mode and the prop opt-in are active; retain `console.error` for actual serialization failures and do not route document content, tokens, or uploaded file data into diagnostics.

### Phase 4: Verify Refactor Boundaries
- [x] **Task 4: Perform static and build validation for the diagnostics migration.**
  - [x] **Files:** inspect all changed files from Tasks 1–3; do not create or modify test or documentation files.
  - [x] Search `packages/editor/src` to confirm that duplicate local `isDevelopment`, `debug`, `debugEditor`, and direct `console.debug` implementations have been removed outside the shared utility.
  - [x] Run the repository TypeScript validation and targeted linting for the changed editor source files; correct only refactor-caused type, import-order, formatting, or lint failures.
  - [x] Do not run or add automated tests because `Testing: no` was explicitly selected.
  - [x] **Logging requirements:** validation confirms every DEBUG call uses the centralized production-safe gate and that production ERROR behavior remains unchanged; validation tooling must not introduce new runtime logging.

## Completion Criteria
- [x] One reusable, typed development-diagnostics module owns DEV gating and `console.debug` formatting.
- [x] The seven identified composables and the two Notion editor lifecycle call sites use the shared API.
- [x] Existing debug namespaces, event names, and structured metadata remain observable in development.
- [x] `developmentDiagnostics` stays part of the public editor API and continues to be forwarded unchanged.
- [x] No tests or documentation files are added or changed.
