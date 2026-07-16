<!-- handoff:task:dddbff51-1561-414d-a88f-5e50d7634d84 -->
# Inject Collaboration and AI Configuration

**Created:** 2026-07-14  
**Branch:** `main`  
**Mode:** Fast autonomous Handoff

## Settings

- [x] **Testing:** no automated tests — do not add, modify, or run test files or test commands for this task.
- [x] **Logging:** retain concise, redacted token-fetch errors; make existing development diagnostics opt-in through the public component contract instead of library environment reads. Never log JWTs, app IDs, document content, or room names.
- [x] **Docs:** no documentation changes.

## Scope and Constraints

- [x] Remove every `import.meta.env` access from reusable editor source under `src/editor/`; the only Vite environment reads must be in the playground application boundary.
- [x] Expose typed optional collaboration and AI configuration on `NotionEditor`, then pass that configuration through the existing provider chain rather than reading global build-time variables in `useCollab` or `useAi`.
- [x] Preserve current behavior: no supplied app ID leaves the editor in local mode without token requests; supplied app IDs enable their respective readiness gates; static tokens take precedence over token endpoints; collaboration document prefixes and `?noCollab=1` continue to work.
- [x] Keep default token endpoints (`/api/collaboration` and `/api/ai`) when a configured service does not supply a custom endpoint.
- [x] Update library-visible setup guidance to describe the injected configuration fields rather than Vite variable names. The playground remains responsible for mapping its `VITE_TIPTAP_*` variables into that contract.
- [x] Work with the existing uncommitted editor/playground extraction changes; do not revert or overwrite unrelated work.
- [x] The existing graceful-degradation integration test currently stubs Vite variables directly. Its migration to prop-driven scenarios is intentionally deferred because this handoff sets `tests:false`.

## Tasks

### Phase 1: Define the host-to-library configuration contract

- [x] **Task 1: Add typed collaboration, AI, and diagnostic options to the public editor API.** In `src/editor/components/notion/public-api.ts`, define exported configuration interfaces for collaboration (`appId`, optional token endpoint/static token, optional document-name prefix) and AI (`appId`, optional token endpoint/static token). Add optional `collaboration`, `ai`, and an explicit development-diagnostics flag to `NotionEditorProps`, with absent cloud configuration meaning disabled/local mode. Re-export the new public types from `src/editor/index.ts`.
  - [x] **Expected behavior:** host applications can configure cloud behavior entirely through the public `NotionEditor` prop surface without importing internal composables or relying on Vite-specific types; all existing non-cloud consumers remain local by default.
  - [x] **Files:** `src/editor/components/notion/public-api.ts`, `src/editor/index.ts`.
  - [x] **Logging:** document the diagnostics option as redacted lifecycle logging only; do not add new telemetry or log configuration values/secrets.

### Phase 2: Inject configuration into cloud composables

- [x] **Task 2: Refactor `useCollab` to consume injected options.** Replace module-level `VITE_TIPTAP_COLLAB_*` constants in `src/editor/composables/useCollab.ts` with an optional typed configuration argument to `provideCollab` and a configuration-aware token-fetch helper. Resolve enabled state, static-token precedence, fallback token URL, and document-name prefix from that argument while preserving the current Y.Doc/provider cleanup and `?noCollab=1` behavior. Remove exports that expose the former environment-derived constants.
  - [x] **Expected behavior:** `provideCollab(room)` still creates a local-only context, while `provideCollab(room, config)` initializes the same collaboration provider contract using only the supplied values and marks setup failure when token acquisition fails.
  - [x] **Files:** `src/editor/composables/useCollab.ts`.
  - [x] **Logging:** retain the existing error-level token-fetch failure with only the failure object/status; do not log app IDs, JWTs, URLs containing secrets, room names, or document names.

- [x] **Task 3: Refactor `useAi` to consume injected options.** Replace module-level `VITE_TIPTAP_AI_*` constants in `src/editor/composables/useAi.ts` with an optional typed configuration argument to `provideAi` and a configuration-aware token-fetch helper. Preserve the current disabled state without an app ID, static-token precedence, default `/api/ai` endpoint, reactive token/setup-error state, and no-Pro-extension UI gating.
  - [x] **Expected behavior:** `provideAi()` remains a disabled local context, while `provideAi(config)` drives the existing loading/error gate entirely from explicit host-supplied values.
  - [x] **Files:** `src/editor/composables/useAi.ts`.
  - [x] **Logging:** retain the existing error-level AI token-fetch failure without exposing credentials or configuration values; do not add success logs.

### Phase 3: Wire props through the editor and remove remaining library env reads

- [x] **Task 4: Propagate cloud configuration and diagnostics through the component tree.** Update `src/editor/components/notion/NotionEditor.vue` to pass the public collaboration/AI options into `provideCollab` and `provideAi`, and replace its `import.meta.env.DEV` logging guard with the explicit diagnostics prop. Pass that flag through `src/editor/components/notion/NotionEditorContent.vue` to `src/editor/components/notion/EditorProvider.vue`, where its debug helper must use the same injected flag instead of `import.meta.env.DEV`. Update `src/editor/components/notion/SetupError.vue` so messages identify missing collaboration/AI configuration fields rather than `VITE_TIPTAP_*` variables.
  - [x] **Expected behavior:** the ready/loading/error flow is unchanged for configured and local editors, `SetupError` is meaningful for reusable-library consumers, and `grep` finds no `import.meta.env` access anywhere under `src/editor/`.
  - [x] **Files:** `src/editor/components/notion/NotionEditor.vue`, `src/editor/components/notion/NotionEditorContent.vue`, `src/editor/components/notion/EditorProvider.vue`, `src/editor/components/notion/SetupError.vue`.
  - [x] **Logging:** preserve existing debug event names and error paths, but emit DEBUG logs only when the host opts in; keep all logs metadata-only and redacted.

### Phase 4: Adapt playground environment variables at the host boundary

- [x] **Task 5: Build and pass playground configuration from Vite variables.** In `src/App.vue`, read `VITE_TIPTAP_COLLAB_*`, `VITE_TIPTAP_AI_*`, and the Vite development flag, convert non-configured services to `undefined`, construct the public collaboration/AI options, and pass them plus the diagnostics flag to `NotionEditor`. Keep `src/env.d.ts` as the playground-facing declaration for these variables and confirm no other source file reads them.
  - [x] **Expected behavior:** the demo/playground retains its current `.env` behavior, including custom token URLs, development-only static tokens, document prefixing, and local fallback when app IDs are unset; reusable editor imports no longer depend on Vite environment variables.
  - [x] **Files:** `src/App.vue`, `src/env.d.ts` only if the declaration needs a narrow adjustment to support the new playground read.
  - [x] **Logging:** do not log resolved environment values; pass only the boolean diagnostics setting and leave token/error logging inside the existing composables.

## Validation

- [x] Do not add, modify, or run automated tests.
- [x] Search `src/editor/` for `import.meta.env` and confirm no matches remain; confirm every `VITE_TIPTAP_*` runtime read is limited to `src/App.vue`.
- [x] Inspect the public barrel to confirm the configuration interfaces are exported and no environment-derived constants are part of the reusable API.
- [x] Manually check the host mapping for four states: no cloud config (local editor/no fetch), configured collaboration with static token, configured collaboration/AI with endpoint token fetch, and failed token fetch reaching the existing setup-error path.
- [x] Run `npm run typecheck` and `npm run build`; do not run any `test*` command.

## Acceptance Criteria

- [x] `useCollab.ts` and `useAi.ts` contain no `import.meta.env` reads or environment-derived module constants.
- [x] `NotionEditor` exposes typed optional collaboration and AI configuration that fully drives the existing provider behavior.
- [x] `src/editor/` contains no `import.meta.env` reads, including development logging guards.
- [x] `src/App.vue` is the single playground adapter from `VITE_TIPTAP_*` variables to the public editor configuration contract.
- [x] Local editor fallback, token precedence/default URLs, collaboration prefixing, `?noCollab=1`, provider teardown, and setup-error gating remain intact.
- [x] No documentation or automated-test files are changed.

## Out of Scope

- [ ] Adding or changing Tiptap Pro AI extensions, backend token endpoints, authentication policies, or cloud-service credentials.
- [ ] Changing `.env.example`, user documentation, or package publishing configuration.
- [ ] Updating the existing Vite-environment-based graceful-degradation test suite; schedule that separately when tests are in scope.

## Commit Plan

- [ ] **Commit 1 (Tasks 1–3):** `refactor(editor): inject collaboration and ai configuration`
- [ ] **Commit 2 (Tasks 4–5):** `refactor(playground): adapt cloud env configuration at host boundary`
