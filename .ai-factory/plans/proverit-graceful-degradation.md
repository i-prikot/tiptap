<!-- handoff:task:5cf7a5f5-1ea6-437a-8881-8cbd36224abe -->
# Implementation Plan: Verify Collaboration Graceful Degradation

Branch: main
Created: 2026-07-13
Mode: Fast / autonomous Handoff

## Settings

- [ ] Testing: no additional test scope; the requested deliverable is the integration-test suite itself.
- [ ] Logging: verbose test diagnostics through descriptive scenario names and assertion messages; do not add runtime logging or unsolicited console output.
- [ ] Docs: no.

## Roadmap Linkage

- [ ] Milestone: "none"
- [ ] Rationale: Explicitly skipped for this focused test-only task in autonomous fast mode.

## Goal

Add integration coverage for the editor's collaboration readiness gate. It must prove that an editor with no collaboration configuration renders in local mode without a token request, while a collaboration setup with an app ID but no usable token transitions from loading to the existing `SetupError` view.

## Scope and Constraints

- [ ] Add one focused suite at `test/editor/components/notion/notion-editor.graceful-degradation.integration.test.ts`; preserve the existing lower-level coverage in `test/editor/components/notion/editor-provider.test.ts`.
- [ ] Exercise the real provider chain `NotionEditor.vue` → `provideCollab()` → `NotionEditorContent.vue` and render the real `SetupError.vue`; stub only the expensive `EditorProvider` leaf with a visible, prop-capturing test double.
- [ ] Isolate every scenario's Vite environment values. Since `useCollab.ts` reads `import.meta.env` into module-level constants, clear/stub all collaboration and AI variables, call `vi.resetModules()`, and dynamically import `NotionEditor.vue` only after the scenario environment is prepared.
- [ ] Keep all production source, Vitest configuration, npm scripts, documentation, roadmap, and unrelated working-tree changes untouched unless a new assertion exposes a genuine narrowly scoped defect.

## Tasks

### Phase 1: Build an Isolated Editor-Gate Harness

- [x] Task 1: Create `test/editor/components/notion/notion-editor.graceful-degradation.integration.test.ts` with a reusable async render helper that mounts the dynamically imported `NotionEditor.vue` after scenario-specific environment setup.
  - [x] Deliverable: Add a lightweight `EditorProvider` test double that exposes whether it received a `null` collaboration provider, while retaining the real `NotionEditor`, `NotionEditorContent`, `useCollab`, `useAi`, and `SetupError` behavior.
  - [x] Deliverable: In `afterEach`, unmount wrappers, call `vi.unstubAllEnvs()`, restore global mocks, and clean up any asynchronous work so module-level environment state, `fetch`, and console spies cannot leak into later tests.
  - [x] Expected behavior: Each scenario starts with independently evaluated `VITE_TIPTAP_COLLAB_*` and `VITE_TIPTAP_AI_*` values despite Vitest's configured shared module environment.
  - [x] Dependency notes: Required before the local-mode and incomplete-configuration scenarios.
  - [x] Logging: Add no application logs. Use explicit test names and assertion messages that identify the expected gate state; suppress the intentionally triggered token-fetch error with a scoped `console.error` spy rather than allowing noisy test output.

### Phase 2: Verify Local Fallback Without Collaboration Configuration

- [x] Task 2: Add a scenario that clears all collaboration configuration (including `VITE_TIPTAP_COLLAB_APP_ID`, token URL/token, and document prefix) and all AI configuration, then mounts the editor with a room value.
  - [x] Deliverable: Assert that the `EditorProvider` double renders immediately with a `null` collaboration provider, `SetupError` and `LoadingSpinner` are absent, and `fetch` is never called.
  - [x] Expected behavior: With no configured cloud services, the editor proceeds through the local editor path instead of waiting for a provider or displaying a setup error.
  - [x] Dependency notes: Depends on Task 1's environment-isolated render helper.
  - [x] Logging: Keep the test silent at runtime; assertion descriptions must distinguish an unexpected loading/error gate from an unexpected network request.

### Phase 3: Verify SetupError for an Incomplete Collaboration Setup

- [x] Task 3: Add a scenario that sets `VITE_TIPTAP_COLLAB_APP_ID` but leaves the static collaboration token empty and makes the token request fail with a non-success response.
  - [x] Deliverable: Flush the token promise and Vue updates, then assert that the real `SetupError` alert is rendered, contains the `Environment Variables Required` heading and collaboration variable guidance (including `VITE_TIPTAP_COLLAB_APP_ID`), while the editor-provider double is no longer rendered.
  - [x] Expected behavior: A configured collaboration path that cannot obtain a token sets `collabSetupError` and replaces the loading/editor path with `SetupError` rather than silently falling back to local mode.
  - [x] Dependency notes: Depends on Task 1; complements Task 2 by covering the configured-but-unusable branch of `provideCollab()`.
  - [x] Logging: Mock the expected `console.error` only within this scenario, use a deterministic failed `fetch` response, and surface all diagnostics through focused assertions rather than production logs.

## Validation

- [x] Run `npm test -- test/editor/components/notion/notion-editor.graceful-degradation.integration.test.ts` and confirm both graceful-degradation scenarios pass in `happy-dom`.
- [x] Run `npm run typecheck` and address only type errors introduced by the new test harness.
- [x] If either behavioral assertion initially fails, preserve it as the regression contract; record the failure, make only the smallest responsible production fix under the repository TDD rule, then rerun the same targeted test command.

## Acceptance Criteria

- [x] The new suite mounts the real collaboration context and content readiness gate rather than mocking `useCollab` or `NotionEditorContent`.
- [x] With no cloud configuration, the local editor path renders immediately, no setup error/spinner appears, and no token request is made.
- [x] With `VITE_TIPTAP_COLLAB_APP_ID` configured but token acquisition failing, the editor renders the real collaboration `SetupError` instead of the editor-provider path.
- [x] Scenario environment and mocked globals are fully restored, so the suite remains deterministic alongside the existing shared Vitest test environment.

## Out of Scope

- [ ] New collaboration-provider connection, Yjs synchronization, remote presence, AI setup-error, or `?noCollab=1` coverage.
- [ ] Production changes to `src/editor/composables/useCollab.ts`, `src/editor/components/notion/NotionEditor.vue`, `src/editor/components/notion/NotionEditorContent.vue`, or `src/editor/components/notion/SetupError.vue` unless the requested regression test exposes a real defect.
- [ ] Documentation, roadmap, CI, package, test-configuration, or unrelated test-suite changes.
