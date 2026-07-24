<!-- handoff:task:7bcd323c-430d-4d7f-9d91-04e87d049cea -->
# Implementation Plan: Внедрить модуль логгера

Branch: `main`
Created: 2026-07-24

## Settings
- [ ] Testing: no (explicit task constraint)
- [ ] Logging: development default `debug`; production default `warn`, with `debug` and `info` suppressed
- [ ] Docs: no (explicit task constraint)

## Roadmap Linkage
Milestone: "none"
Rationale: This is a focused cross-cutting runtime maintenance task; no roadmap linkage was requested in autonomous Handoff mode.

## Scope and Decisions
- [x] Replace all 47 direct browser-runtime calls to `console.debug`, `console.log`, `console.warn`, and `console.error` across 23 source files under `packages/editor/src` and `packages/schema/src` with one structured logger API.
- [x] Keep Node CLI, release-verification, fixture, and Vite-config output out of scope: those commands intentionally report directly to terminal streams and are not included in the published browser bundles.
- [x] Add the reusable logger to the foundational `@i-prikot/editor-schema` package at `packages/schema/src/utils/logger.ts`, export it from `packages/schema/src/index.ts`, and consume it in `@i-prikot/editor`, which already depends on that package. Do not create a new workspace package.
- [x] Provide `createLogger(namespace, options?)` with `debug`, `info`, `warn`, and `error` methods; preserve namespaces and pass `Error` objects/context as separate arguments instead of serializing or discarding them.
- [x] Resolve the default minimum level with the Vite-safe `import.meta.env.DEV` check: `debug` during development and `warn` in production. Allow an explicit per-instance level/enabled predicate for controlled diagnostics.
- [x] Make the logger implementation the sole runtime console sink. All other production source modules must use the logger abstraction; retain the existing development-only behavior of `createDevelopmentDiagnostics` by delegating through a disabled-in-production logger instance.
- [x] Preserve user-visible fallback behavior and error handling. Logging must not throw, mutate editor state, expose document content, or log credentials/tokens.

## Tasks

### Phase 1: Establish the shared logging contract
- [x] **Task 1: Add the browser-safe logger and expose its public API.** Implement level ordering, a `Logger` interface, logger options for a minimum level and optional enablement guard, namespaced message formatting, and safe delegation to the corresponding console method in `packages/schema/src/utils/logger.ts`. Use a Vite-compatible environment check and default to `debug` in development / `warn` in production, so low-value development diagnostics disappear from production bundles at runtime. Export only the needed logger types and `createLogger` from `packages/schema/src/index.ts`; do not add a workspace, runtime dependency, or Node-only environment access. **Files:** `packages/schema/src/utils/logger.ts` (new), `packages/schema/src/index.ts`. **Logging:** `debug`/`info` are diagnostic-only and suppressed by the production threshold; `warn` is for recoverable degradation; `error` is for failed operations. The logger itself is the only permitted browser-runtime console sink. **Dependencies:** none.

- [x] **Task 2: Reimplement development diagnostics as a compatibility adapter.** Refactor the existing development-only helper to call `createLogger` rather than `globalThis.console`, preserving all current imports, namespace prefixes, `debug` and `error` methods, and the caller-provided `isEnabled` behavior. Ensure this adapter remains entirely silent in production even for its diagnostic `error` calls. **Files:** `packages/editor/src/utils/development-diagnostics.ts`. **Logging:** map diagnostic `debug` and `error` events to the shared logger while combining the development-environment guard with the existing feature-specific enablement guard; preserve metadata as an argument and never add document JSON, tokens, or other sensitive payloads. **Dependencies:** Task 1.

### Phase 2: Migrate editor runtime call sites
- [x] **Task 3: Replace component and composable console calls with namespaced loggers.** Add module-scoped `createLogger` instances and replace every direct console call without changing surrounding control flow, returned values, or user feedback. Use stable namespaces matching the current component/composable names. **Files:** `packages/editor/src/components/notion/notion-editor/EditorProvider.vue`, `packages/editor/src/components/notion/notion-editor/NotionEditor.vue`, `packages/editor/src/components/table/table-handle/TableHandle.vue`, `packages/editor/src/components/table/table-selection/TableSelectionOverlay.vue`, `packages/editor/src/composables/useAi.ts`, `packages/editor/src/composables/useCollab.ts`, `packages/editor/src/composables/useCopyAnchorLink.ts`, `packages/editor/src/composables/useImageDownload.ts`, `packages/editor/src/composables/useMoveNode.ts`, `packages/editor/src/composables/useRecentColors.ts`, `packages/editor/src/composables/useScrollToHash.ts`, `packages/editor/src/composables/useTableAlignCell.ts`, and `packages/editor/src/composables/useTableFitToWidth.ts`. **Logging:** retain `error` for failed serialization, token acquisition, clipboard/image/table operations, and `warn` for recoverable selection/download/hash fallbacks; preserve error objects and existing non-sensitive context, but do not log auth tokens, editor content, or complete state objects. **Dependencies:** Task 1.

- [x] **Task 4: Migrate editor table-action utilities and keep their failure semantics intact.** Introduce one logger per table-action module and replace all direct warnings/errors in mutation, clearing, merge/split, movement, and sorting paths. Leave command return values, exception handling, and selection recovery unchanged. **Files:** `packages/editor/src/utils/table-actions/add-delete.ts`, `packages/editor/src/utils/table-actions/clearing.ts`, `packages/editor/src/utils/table-actions/merge-split.ts`, `packages/editor/src/utils/table-actions/movement.ts`, and `packages/editor/src/utils/table-actions/sorting.ts`. **Logging:** report operation failures as `error`; use `warn` only for the expected non-sortable merged-cell condition; include orientation/action/index context when already available, without emitting selected table content. **Dependencies:** Task 1.

### Phase 3: Migrate schema utilities and prevent regression
- [x] **Task 5: Route schema diagnostics through the shared logger and enforce the abstraction.** Replace direct console access in UI-state, Tiptap helpers, and table utilities with local namespaced loggers. Tighten ESLint for `packages/{schema,editor}/src` so direct console usage is rejected, while allowing the single logger sink file as the narrowly scoped exception; retain the existing less restrictive CLI/Vite rules. **Files:** `packages/schema/src/extensions/ui-state.ts`, `packages/schema/src/utils/tiptap-utils.ts`, `packages/schema/src/utils/table-utils/cell-selection.ts`, `packages/schema/src/utils/table-utils/table-calculations.ts`, and `eslint.config.js`. **Logging:** keep UI-state events at `debug`, selection/calculation fallbacks at `warn`, and unexpected exceptions at `error`; replace current `map`/DOM diagnostics with minimal structural context rather than dumping editor state or document data. **Dependencies:** Task 1.

- [x] **Task 6: Perform non-test verification of the migration and production filtering policy.** Audit browser-runtime source files to confirm there are no direct `console.debug`, `console.info`, `console.log`, `console.warn`, or `console.error` calls outside the dedicated logger sink; run the configured lint and TypeScript checks; inspect the generated/public API imports used by editor and schema to ensure level types resolve. Confirm the production default blocks `debug`/`info`, keeps normal `warn`/`error`, and that the development-diagnostics adapter remains silent in production. **Files:** verification only; review `packages/schema/src/utils/logger.ts`, `packages/schema/src/index.ts`, `packages/editor/src/utils/development-diagnostics.ts`, all files from Tasks 3–5, and `eslint.config.js`. **Logging:** do not add temporary diagnostics; verify namespace, level, metadata, and production-threshold behavior through the final implementation only. **Dependencies:** Tasks 2–5.

## Commit Plan
- [ ] After Tasks 1–3: `feat(logging): add shared runtime logger and migrate editor entry points`
- [ ] After Tasks 4–6: `refactor(logging): route table and schema diagnostics through logger`

## Completion Criteria
- [x] A single public, browser-safe logger API provides ordered `debug`, `info`, `warn`, and `error` levels with namespaced messages.
- [x] Production builds suppress `debug` and `info` by default; standard runtime warnings/errors retain their current observability, while development diagnostics remain dev-only.
- [x] All 47 currently identified direct console calls in `packages/editor/src` and `packages/schema/src` use the logger abstraction instead; the logger implementation is the only intentional console sink in those runtime folders.
- [x] Direct-console lint protection covers editor/schema runtime source without constraining CLI scripts or Vite configuration output.
- [x] No tests or documentation changes are added for this task.
