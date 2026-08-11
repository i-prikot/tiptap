<!-- handoff:task:b8a66ba7-3d7f-4972-ad2a-ccaeafb186ec -->
# Implementation Plan: Upgrade project dependencies

Branch: `feature/task-b8a66b`
Created: 2026-08-10
Mode: full (Autonomous Handoff)

## Goal

Upgrade the workspace to Vite 8, TypeScript 6, and `@hocuspocus/provider` 4
without bypassing peer-dependency resolution, preserve the public collaboration
configuration, and finish with a reproducible lockfile plus green typecheck,
lint, test, and build gates.

## Settings

- [ ] Testing: yes - add focused provider-migration coverage and run the full requested suite.
- [ ] Logging: verbose - retain detailed command evidence and add only redacted development lifecycle diagnostics where the provider migration needs them.
- [ ] Docs: yes - run the mandatory `$aif-docs` checkpoint and update stale contributor prerequisites.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped by the Autonomous Handoff defaults; this dependency upgrade
must not modify `.ai-factory/ROADMAP.md`.

## Current And Target Compatibility

| Package | Declared / locked now | Planned target | Compatibility decision |
| --- | --- | --- | --- |
| `vite` | `^6.0.3` / `6.4.3` | `^8.2.1` | Requires Node `^20.19.0 || >=22.12.0`; local Node `22.23.2` and CI Node 22 satisfy it. |
| `typescript` | `^5.7.2` / `5.9.3` | `^6.0.3` | Remove the deprecated root `baseUrl`; retain `moduleResolution: "Bundler"` and project references. |
| `@hocuspocus/provider` | `^2.15.3` / `2.15.3` | `^4.6.0` | Replace removed `TiptapCollabProvider` with `HocuspocusProvider` and provide an explicit Cloud WebSocket URL. |
| `@vitejs/plugin-vue` | `^6.0.0` / `6.0.8` | keep unless install evidence requires otherwise | Its peer range already includes Vite 8. |
| `vitest`, `@vitest/coverage-v8` | `^4.1.10` / `4.1.10` | keep aligned at `4.1.10` unless install evidence requires otherwise | Vitest 4.1 accepts Vite 8; coverage must remain exactly aligned with Vitest. |
| `vue-tsc` | `^3.3.8` / `3.3.9` | keep unless typecheck evidence requires otherwise | Its peer range accepts TypeScript 6. |
| `typescript-eslint` | `^8.18.2` / `8.66.0` | keep the resolved 8.66 line unless install evidence requires otherwise | `8.66.0` accepts TypeScript `>=4.8.4 <6.1.0`; do not drift TypeScript beyond 6.0.x. |

Registry compatibility above was checked on 2026-08-10. The implementation
must use normal npm resolution and must not use `--force` or
`--legacy-peer-deps`.

## Constraints And Decisions

- [ ] Modify dependency declarations only in root `package.json` and `packages/editor/package.json`, then regenerate the root npm v3 `package-lock.json`; do not perform unrelated package updates.
- [ ] Keep `CollaborationOptions.appId`, token handling, and `documentNamePrefix` as the public host contract. Derive the existing Tiptap Cloud URL as `wss://${appId}.collab.tiptap.cloud` for `HocuspocusProvider`; do not introduce a consumer-facing configuration migration in this task.
- [ ] Preserve the collaboration lifecycle used by the editor: `isSynced`, `on/off('synced')`, `awareness`, and `destroy()` all remain required.
- [ ] Preserve editor library externals, published JS/CSS entry names, playground vendor chunk intent, and bundle-analysis report generation across Vite's Rolldown migration.
- [ ] Treat related dev-dependency or Vite-config changes as evidence-driven: make them only for a concrete peer-resolution, typecheck, test, or build failure and document why they are required.
- [ ] Do not add `ignoreDeprecations` to hide TypeScript 6 diagnostics; remove or migrate deprecated project configuration instead.
- [ ] Keep tokens, full WebSocket URLs, document names/content, and host identifiers out of logs and test output.

## Commit Plan

- [ ] **Commit 1** (after Tasks 1-5): `chore(deps): upgrade vite typescript and hocuspocus`

## Tasks

### Phase 1: Lock The Provider Migration Contract

- [x] **Task 1: Add RED tests for the Hocuspocus v4 construction and teardown contract.**
  - [ ] Files: create `test/editor/composables/use-collab.test.ts`; update `test/editor/components/notion/notion-editor.graceful-degradation.integration.test.ts` only if its existing harness is needed for the success/failure readiness boundary.
  - [ ] Mock `@hocuspocus/provider` with distinguishable legacy and v4 constructors, mount a minimal Vue harness around `provideCollab`, and assert that a static token or fetched token constructs `HocuspocusProvider` with the exact `name`, derived `wss://<appId>.collab.tiptap.cloud` URL, token, and the context's `Y.Doc`.
  - [ ] Cover provider destruction on unmount, no provider creation when token retrieval fails, no late provider creation after unmount while a token request is pending, and graceful local fallback when construction rejects or throws.
  - [ ] Keep the existing `editor-provider.test.ts` assertions for `isSynced`, the `synced` listener, collaboration caret wiring, and local-history disabling; extend them only if the v4 type migration exposes a real missing contract.
  - [ ] Run the focused test before production changes and record an assertion-level RED caused by the legacy constructor/configuration, not a test setup or compilation failure. Re-run the same command after Task 3 for GREEN evidence, as required by `.ai-factory/RULES.md`.
  - [ ] Logging: mock `createLogger` and assert only redacted lifecycle/result fields on failure; no test snapshot or diagnostic may contain a token, app id, WebSocket URL, or document name. Preserve the focused test command and observed RED/GREEN result as implementation evidence.
  - [ ] Dependencies: none.

### Phase 2: Upgrade The Toolchain And Runtime Dependency

- [x] **Task 2: Update scoped manifests, TypeScript configuration, and the npm lockfile.**
  - [ ] Files: `package.json`, `packages/editor/package.json`, `package-lock.json`, `tsconfig.base.json`.
  - [ ] Set root `vite` to `^8.2.1` and `typescript` to `^6.0.3`; set editor runtime dependency `@hocuspocus/provider` to `^4.6.0`.
  - [ ] Remove `compilerOptions.baseUrl` from `tsconfig.base.json`, because TypeScript 6 deprecates it as an error-level option. Keep the existing root-relative `paths`, `module: "ESNext"`, `moduleResolution: "Bundler"`, target, strictness, and project-reference layout unless a concrete TypeScript 6 diagnostic requires a scoped adjustment.
  - [ ] Regenerate `package-lock.json` with ordinary npm installation under Node 22. Do not hand-edit resolved/integrity entries, and do not use peer-conflict bypass flags. Expect Vite-owned Rollup/esbuild lock entries to change to the Vite 8 Rolldown/Oxc/Lightning CSS graph.
  - [ ] Inspect npm's peer report for Vite, Vitest/coverage, Vue tooling, TypeScript ESLint, Yjs, and `y-protocols`. Keep the already-compatible related packages unchanged; update the smallest related set only if npm produces a real incompatibility, keeping `vitest` and `@vitest/coverage-v8` on identical versions.
  - [ ] Expected behavior: a clean `npm ci` resolves one valid dependency tree with Vite 8.2.x, TypeScript 6.0.x, and Hocuspocus Provider 4.6.x, without invalid peers or unrelated manifest churn.
  - [ ] Logging: add no runtime logging for package metadata. Retain npm's package/peer summaries at `INFO`, exact changed direct versions at `DEBUG`, and the dependency chain for any resolution failure at `ERROR`; never print registry credentials or environment values.
  - [ ] Dependencies: Task 1 provides the migration test baseline.

- [x] **Task 3: Migrate collaboration internals from `TiptapCollabProvider` to `HocuspocusProvider` and resolve Vite 8 compatibility defects.**
  - [ ] Files: `packages/editor/src/composables/useCollab.ts`, `packages/editor/src/components/notion/notion-editor/EditorProvider.vue`, `packages/editor/src/components/notion/notion-editor/useEditorLifecycle.ts`; inspect and modify `packages/editor/vite.config.ts`, `apps/playground/vite.config.ts`, and `vitest.config.ts` only when Vite 8 produces a concrete type/build/test defect or a removed-option diagnostic.
  - [ ] Replace all runtime and type imports of removed `TiptapCollabProvider` with the v4 `HocuspocusProvider` type. Construct it with `{ name, url, token, document }`, deriving the Cloud URL from the existing `appId` contract, and continue passing the same provider/Y.Doc to Collaboration and CollaborationCaret.
  - [ ] Preserve readiness behavior for already-synced and initially-unsynced providers, detach the exact `synced` callback during teardown, and call `destroy()` exactly once for a created provider.
  - [ ] Guard the asynchronous token path so unmounting before resolution cannot create a leaked provider. Catch provider-construction failure, set `hasCollab` to false, and release the editor to local mode instead of leaving `provider=null` behind a permanent collaboration loading gate.
  - [ ] Re-run the focused Task 1 test for GREEN, then run the existing editor-provider and graceful-degradation tests to protect sync ordering, caret wiring, and failed-token fallback.
  - [ ] Validate both Vite build configurations under Rolldown. Preserve the library external predicate and public entry filenames, and preserve playground collaboration/Tiptap/emoji/KaTeX chunk intent. If `rollupOptions`/`manualChunks` must be migrated, use Vite 8's `rolldownOptions`/code-splitting APIs rather than suppressing diagnostics or installing fallback tooling without evidence.
  - [ ] Logging: use the existing `useCollab` logger for redacted `DEBUG` lifecycle outcomes (`started`, `completed`, `skipped-after-dispose`, `destroyed`) and `ERROR` failure stage/type only. Never log token, app id, derived URL, document name, Y.Doc content, or collaboration awareness state.
  - [ ] Dependencies: Task 2 installs the v4 API and TypeScript/Vite toolchain; Task 1 defines expected behavior.

### Phase 3: Documentation, Release Metadata, And Gates

- [x] **Task 4: Complete the mandatory documentation and Changeset checkpoint.**
  - [ ] Files: `README.md`, create `.changeset/<unique-name>.md`; inspect `docs/dependency-updates.md` through `$aif-docs` and modify it only if the implemented dependency workflow changes its existing policy.
  - [ ] Update the stale prerequisite that names Vite 6 and TypeScript 5. State the Vite 8 Node floor `^20.19.0 || >=22.12.0`, note that CI runs Node 22, and identify the upgraded Vite 8 / TypeScript 6 development stack without expanding the README into a migration report.
  - [ ] Keep the documented public collaboration inputs unchanged. Mention an API migration only if implementation changed something a host consumes; the planned internal switch from `TiptapCollabProvider` to `HocuspocusProvider` must not be presented as a host-side breaking change.
  - [ ] Add a patch Changeset for `@i-prikot/editor` describing the dependency/provider migration and absence of a public configuration change. Let the configured fixed package group handle coordinated release versions; do not manually edit package versions.
  - [ ] Expected behavior: contributor prerequisites match the installed toolchain, release automation records the publishable editor change, and architecture/roadmap artifacts remain untouched.
  - [ ] Logging: add no application logs. `$aif-docs` should report touched documentation paths at `INFO` and validation failures at `ERROR`, without embedding environment configuration or credentials.
  - [ ] Dependencies: Task 3 finalizes the actual API and runtime behavior that documentation and release notes describe.

- [x] **Task 5: Prove the upgraded tree and all required repository gates are green.**
  - [x] Files: no planned new files; fix only scoped files from Tasks 1-4 when a gate exposes an upgrade-caused defect.
  - [x] Start from the regenerated lockfile with `npm ci`, then run `npm ls vite typescript @hocuspocus/provider @vitejs/plugin-vue vitest @vitest/coverage-v8 vue-tsc typescript-eslint` and reject invalid, duplicate direct-toolchain, or peer-conflict results.
  - [x] Run, in order: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. If a command fails, identify and fix the dependency-upgrade cause, re-run the focused failing command, then repeat all four commands from the beginning so the final evidence comes from one coherent tree.
  - [x] Verify the editor build still emits its declared JS/type/CSS entries, the playground production build retains the intended vendor split, and no generated `dist`, coverage, analysis, or TypeScript build-info artifact is staged.
  - [x] Review `git diff -- package.json packages/editor/package.json package-lock.json tsconfig.base.json` to confirm the final versions and lockfile graph are scoped, and search the repository to confirm no production import of `TiptapCollabProvider` remains.
  - [x] Expected behavior: clean install, dependency-tree inspection, targeted migration tests, and all four user-required commands succeed on Node 22 without force flags; the implementation handoff can list final versions, necessary API migration, and observed command results.
  - [x] Logging: preserve concise `INFO` start/result lines and exit codes for every gate, use `DEBUG` for selected package versions and expected build entry names, and use `ERROR` for the first actionable failure. Do not dump environment variables, tokens, full document data, or complete lockfile contents.
  - [ ] Dependencies: Tasks 1-4.

<!-- Commit checkpoint: tasks 1-5 -->

## Validation Criteria

- [x] `package.json` and `package-lock.json` resolve Vite `8.2.x` and TypeScript `6.0.x`; `packages/editor/package.json` and the lockfile resolve `@hocuspocus/provider` `4.6.x`.
- [x] npm reports no peer conflict, and no install command uses `--force` or `--legacy-peer-deps`.
- [x] TypeScript 6 runs without hiding the deprecated `baseUrl` option and preserves workspace project-reference/declaration builds.
- [x] No runtime/type import of `TiptapCollabProvider` remains; `HocuspocusProvider` receives the preserved document name, token, Y.Doc, and explicitly derived Cloud WebSocket URL.
- [x] Successful collaboration still waits for provider sync, failed setup falls back to local editing, late async resolution cannot leak a provider, and teardown removes listeners/destroys the provider.
- [x] Vite 8 builds all library and playground outputs without breaking externalization, public entry filenames, CSS delivery, or intended vendor chunks.
- [x] `README.md` states the Vite 8/TypeScript 6 and Node prerequisites, and a patch Changeset records the published editor dependency migration.
- [x] Final `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` runs all pass on the same clean Node 22 dependency tree.

## Risks And Mitigations

- [ ] **Removed Cloud-specific class:** v4 does not export `TiptapCollabProvider`; derive the same Tiptap Cloud URL locally and use only the generic provider features the repository actually consumes.
- [ ] **Permanent loading or async leak:** a constructor failure or token resolution after unmount can leave the current readiness gate stuck or create an undisposed provider; cover both paths before changing production code and explicitly cancel/fallback during migration.
- [ ] **Vite 8 bundler change:** Rolldown/Oxc/Lightning CSS can alter chunks, CJS interop, and CSS output; exercise both library and playground builds and preserve their named output contracts.
- [ ] **TypeScript 6 transition diagnostics:** deprecated compiler options and changed defaults may surface new errors; migrate the root option and make only evidence-backed source/config fixes instead of suppressing diagnostics.
- [ ] **Lockfile over-churn:** Vite 8 legitimately replaces part of the transitive bundler graph, but unrelated direct dependency changes are out of scope; review manifest and lockfile diffs before accepting the result.
- [ ] **Backend compatibility not exercised locally:** unit tests and builds prove the client contract but not a live Tiptap Cloud session; preserve the v2 Cloud URL/token/name protocol exactly and call out live-service verification as residual integration risk rather than faking network coverage.

## Implementation Handoff

- [ ] Execute tasks in order so provider behavior has assertion-level RED evidence before production changes and GREEN evidence afterward.
- [ ] Use `$aif-docs` for the mandatory documentation checkpoint because `Docs: yes`.
- [ ] Do not modify `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, or `.ai-factory/ROADMAP.md`; the dependency/API migration does not change product ownership or package boundaries.
- [x] Finish with a concise implementation summary containing the resolved versions, the `TiptapCollabProvider` to `HocuspocusProvider` migration, any evidence-backed related dependency/config changes, and the result of each required command.

## Rework: Review Findings (2026-08-10)

- [x] Delete untracked root verification `.*.log` and `.*.exit` artifacts rather than leaving them commit-ready.
- [x] Resolve `@hocuspocus/provider` in `vitest.config.ts` through `createRequire` anchored at the editor workspace manifest, preserving `vi.doMock()` across npm hoisting layouts without a deep `node_modules` path.
- [x] Validate collaboration `appId` as a hostname label before deriving the WebSocket URL; invalid values disable collaboration before a token can be fetched or sent.
- [x] Add a focused invalid-`appId` regression test (RED before the change, GREEN after it) and complete the required typecheck, lint, full test, and build gates.

## Rework: Coverage And Lockfile Findings (2026-08-10)

- [x] Remove the unnecessary root `esbuild` devDependency and regenerate `package-lock.json` through normal npm resolution.
- [x] Add focused coverage for playground header locale handling and theme-mode rendering so the uncovered-function count clears the existing global function threshold without lowering it.
- [x] Add the direct root `rollup` devDependency required by `test/editor/icons/tree-shaking.test.ts`, and migrate that test's Vite helper from `transformWithEsbuild` to `transformWithOxc` for Vite 8.
- [ ] Re-run `npm run test:coverage` on a runner that can complete Vitest coverage workers; this environment still hangs after startup without spawning a worker, including with `--maxWorkers=1`. The targeted tree-shaking test passes without coverage.

## Rework: Review Findings (2026-08-11)

- [x] Handle rejected `fetchCollabToken()` promises in `provideCollab()` by
  disabling collaboration and logging only the failure stage/type; add a
  focused regression assertion for the unexpected rejection path.
- [x] Complete `npm test` with isolated worker threads: 91 files and 429 tests
  pass on Node 22 with visible Vitest output.
- [ ] Re-run `npm run test:coverage` with the same worker configuration.
