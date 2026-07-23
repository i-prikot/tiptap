<!-- handoff:task:137111a1-5631-4101-a084-ca4c61a55712 -->
# Implementation Plan: Split Icon Modules for Tree-Shaking

Branch: `main`
Created: 2026-07-22

## Settings
- [ ] Testing: no (explicit handoff constraint; do not add or run test tasks)
- [ ] Logging: verbose for build-analysis diagnostics only; this refactor adds no runtime logging
- [ ] Docs: no (do not update documentation or bundle-baseline artifacts)

## Scope and Acceptance Criteria
- [x] Replace the 1,502-line, 123,488-byte `packages/editor/src/icons/index.ts` implementation with one source module per current icon (97 total) plus a barrel export.
- [x] Preserve every existing named icon export, component `displayName`, SVG `viewBox`, path data, path attributes, props/attribute merging order, and root package export through `packages/editor/src/index.ts`.
- [x] Keep current component and composable imports from `../icons` or `../../../icons` working without consumer changes.
- [x] Ensure the published ESM build retains icon module boundaries so downstream bundlers can include only icons reachable from their chosen root exports; do not treat a source-only split that Rollup flattens back into `dist/index.js` as complete.
- [x] Confirm `npm run analyze --workspace=@i-prikot/editor` reports separate icon source modules rather than one monolithic `src/icons/index.ts` module. Use `packages/editor/BUNDLE_BASELINE.md` only as a comparison reference; do not modify it.

## Tasks

### Phase 1: Extract the Shared Icon Factory
- [x] **Task 1: Move shared icon construction into an internal helper.** Create `packages/editor/src/icons/create-icon.ts` with the current `IconProps`, `IconPath`, and `createIcon` implementation from `packages/editor/src/icons/index.ts`; export only the types and factory needed by icon leaf modules. Preserve the existing `h('svg', ...)` behavior exactly, including default `width`/`height`, `fill`, namespace, `props` then `attrs` precedence, per-path fill settings, and `displayName` assignment. **Logging:** add no application logs because icon creation remains pure render setup; retain existing Vite `console.info`/`console.error` diagnostics untouched. **Dependency:** none.

### Phase 2: Split Definitions and Restore the Barrel
- [x] **Task 2: Create one leaf module for each existing icon definition.** Add 97 kebab-case icon files under `packages/editor/src/icons/` (for example, `add-col-left-icon.ts`, `ai-sparkles-icon.ts`, and `x-icon.ts`), each importing `createIcon` from `./create-icon` and exporting exactly one correspondingly named component. Copy each existing `createIcon` invocation verbatim so all SVG data and attributes remain byte-for-byte equivalent in meaning. Cover the complete current export set from `AddColLeftIcon` through `XIcon`; do not rename, omit, combine, or default-export any icon. Delete the old embedded definitions from `packages/editor/src/icons/index.ts`. **Logging:** no runtime logging; leaf modules must remain side-effect-free apart from creation of their single exported Vue functional component. **Dependency:** Task 1.
- [x] **Task 3: Rebuild `packages/editor/src/icons/index.ts` as the compatibility barrel.** Replace the monolithic implementation with explicit named re-exports for all 97 leaf modules, maintaining the existing alphabetic public export list and named-only API. Leave `packages/editor/src/index.ts` exporting `*` from `./icons`, and leave all existing internal icon imports on the barrel; verify the generated declaration surface continues to expose the same 97 `FunctionalComponent<SVGAttributes>` symbols. **Logging:** no runtime logging; preserve package build diagnostics without adding icon import instrumentation. **Dependency:** Task 2.

### Phase 3: Preserve Module Boundaries in the Published ESM Build
- [x] **Task 4: Configure and validate the library output for downstream tree-shaking.** Update `packages/editor/vite.config.ts` Rollup output so the ESM library emits preserved source modules rooted at `packages/editor/src` (including `dist/icons/index.js` and one `dist/icons/*.js` file per icon) while retaining the existing root `dist/index.js` and CSS artifact contract. Adjust `packages/editor/package.json` export metadata only if required for emitted root or icon module resolution; do not remove or change the current `.` / `./style.css` / `./styles.css` public entries. Run `npm run typecheck --workspace=@i-prikot/editor`, `npm run lint --workspace=@i-prikot/editor`, `npm run build --workspace=@i-prikot/editor`, and `npm run analyze --workspace=@i-prikot/editor`. Inspect the emitted `dist/icons/` inventory and visualizer raw-data report to verify the single `src/icons/index.ts` source group no longer contains all icon code and that unused leaf modules are not forced into the root module graph. **Logging:** retain and review `[bundle-analysis] INFO` and `[bundle-analysis] ERROR` messages from `vite.config.ts`; do not add production logs. **Dependency:** Tasks 1-3.

## Validation Notes
- [x] This plan intentionally has no test task and does not amend `packages/editor/BUNDLE_BASELINE.md`, per the supplied `tests:false` and `docs:false` constraints.
- [x] Treat the typecheck, lint, build, artifact inventory, and bundle-analysis inspection in Task 4 as release verification, not as automated test coverage.
- [x] Preserve unrelated working-tree changes, including the existing untracked `packages/editor/BUNDLE_BASELINE.md`.

## Rework: 2026-07-22
- [x] **Rework Task 5: Mark each icon factory call as pure.** Added `/* @__PURE__ */` immediately before all 97 icon-leaf `createIcon(...)` calls so consumers can remove unreferenced icon modules from the barrel graph.
- [x] **Rework Task 6: Add source-barrel consumer bundle coverage.** Added `test/editor/icons/tree-shaking.test.ts`, which Rollup-bundles a consumer importing only `BoldIcon` from `packages/editor/src/icons/index.ts` and asserts the unrelated `ItalicIcon` leaf is absent.
- [x] **Rework Task 7: Remove the ignored build-artifact prerequisite.** The consumer-bundle test transforms the TypeScript source barrel with Vite esbuild in its local Rollup plugin, so it requires neither a pre-existing `dist/icons/index.js` nor a package build before coverage runs.

## Rework Validation
- [x] RED: Before the purity annotations, a Rollup consumer import from the emitted barrel produced a 118,719-byte bundle containing `ItalicIcon`.
- [x] GREEN: With Vite esbuild-transforming the icon source modules, the consumer bundle contains `BoldIcon` and excludes `ItalicIcon`.
- [x] `npm test -- --run test/editor/icons/tree-shaking.test.ts --pool=forks` passes without `packages/editor/dist` present.
