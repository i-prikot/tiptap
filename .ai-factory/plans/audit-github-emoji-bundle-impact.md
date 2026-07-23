<!-- handoff:task:a98d5220-0495-4f51-8a50-c69c73953505 -->
# Implementation Plan: Audit GitHub emoji bundle impact

Branch: `main`
Created: 2026-07-22
Mode: fast (Autonomous Handoff)

## Goal

Measure the actual client-bundle cost of the GitHub emoji catalog and remove it
from the playground's initial editor payload when that cost is material. Keep
the current `:` suggestion, shortcode conversion, fallback-image behavior, and
renderer output intact. Do not mistake the current in-memory filter for a
bundle optimization.

## Settings

- [x] Testing: rework override — targeted TDD coverage is mandatory for the async emoji extension-kit/editor-provider lifecycle.
- [x] Logging: verbose — use opt-in build-analysis `INFO`/`ERROR` terminal diagnostics and existing editor diagnostics only; do not add browser `console` calls or telemetry containing editor content.
- [x] Docs: no — do not change user-facing documentation or add a documentation checkpoint.

## Roadmap Linkage

Milestone: "none"

Rationale: This is a targeted editor-delivery optimization audit and is not
linked to a roadmap milestone in Autonomous Handoff mode.

## Known Inputs and Decision Rule

- [x] Before implementation, `packages/schema/src/extensions/extension-kit.ts`
  synchronously imported `gitHubEmojis` and configured `Emoji` with
  `gitHubEmojis.filter((emoji) => !emoji.name.includes('regional'))` for both
  interactive and renderer extension kits.
- [x] With the installed `@tiptap/extension-emoji` version, `gitHubEmojis` has
  1,968 records / 526,690 JSON bytes. The current filter retains 1,942 records
  / 523,232 JSON bytes: it removes only 26 records / 3,458 JSON bytes, after
  the full upstream data module has already been imported.
- [x] The editor library analyzer intentionally externalizes all `@tiptap/*`
  imports, so `packages/editor/BUNDLE_BASELINE.md` cannot measure this cost.
  The playground aliases editor and schema source and emits `@tiptap/*` into
  its initial `vendor-tiptap` chunk; it is the required measurement target.
- [x] Treat the catalog as excessive when the visualizer attributes at least
  10 KiB gzip **or** 1% of initial JavaScript gzip to
  `@tiptap/extension-emoji` / `src/data.ts`. If neither condition is met,
  retain the current runtime behavior and record the measured no-change
  decision only in the implementation handoff.
- [x] If excessive (the expected outcome), preserve the full GitHub catalog by
  deferring its client import rather than silently shipping a curated subset.
  A local `filter()` around an eager `gitHubEmojis` import is not an accepted
  solution because it cannot remove upstream dataset bytes.

## Tasks

### Phase 1: Measure the consumer bundle

- [x] **Task 1: Add an opt-in playground bundle-analysis path that exposes emoji-module bytes without changing normal builds.**
  - [x] **Files:** modify `apps/playground/package.json`, `apps/playground/vite.config.ts`, and `.gitignore`; add `apps/playground/.bundle-analysis/` only as ignored generated output.
  - [x] Add `npm run analyze --workspace=@i-prikot/playground`, backed by a dedicated Vite analysis mode that writes ignored treemap and raw-data reports under `apps/playground/.bundle-analysis/`. Preserve the existing normal `build` script, aliases, CSS selector scoping, `vendor-tiptap` / collaboration / KaTeX chunk grouping, and output directory.
  - [x] Ensure the raw report exposes module-level raw, gzip, and Brotli contributions so `@tiptap/extension-emoji/src/data.ts`, the package runtime, and the initial chunk containing them can be distinguished from the editor library's intentionally externalized dependencies.
  - [x] Make the visualizer dependency explicit for the workspace if the configuration directly imports it; update `package-lock.json` only through the npm dependency command.
  - [x] **Logging requirements:** emit `INFO` with analysis mode and absolute report paths; emit `ERROR` and fail the build when report-directory creation or report generation fails. Keep all messages build-only and do not add runtime logging.

- [x] **Task 2: Capture reproducible catalog and downstream-bundle measurements, then apply the decision rule.** (depends on Task 1)
  - [x] **Files:** inspect `node_modules/@tiptap/extension-emoji/src/data.ts`, `packages/schema/src/extensions/extension-kit.ts`, and the ignored `apps/playground/.bundle-analysis/{treemap.html,raw-data.json}` output; do not commit a new report or baseline document.
  - [x] Run the playground analyzer and record in the implementation handoff: upstream record counts; raw JSON bytes before and after the `regional` filter; the `data.ts` module's raw/gzip/Brotli contribution; its containing initial chunk; and the total initial JavaScript payload.
  - [x] Confirm through the raw report that the full data module is present despite the existing filter. Evaluate the threshold in **Known Inputs and Decision Rule** before changing runtime code; if it is not met, stop after normal-build verification and leave the source unchanged.
  - [x] **Logging requirements:** retain the exact commands, tool versions, measured values, threshold calculation, and pass/fail decision as verbose handoff diagnostics. Treat missing module attribution, a non-reproducible measurement, or an unexpected normal-build output change as `ERROR` and stop instead of guessing.

### Phase 2: Defer the full catalog when excessive

- [x] **Task 3: Split the interactive emoji configuration from renderer-only configuration and create a lazy client data boundary.** (depends on Task 2; execute only when the threshold is met)
  - [x] **Files:** modify `packages/schema/src/extensions/extension-kit.ts` and `packages/schema/src/index.ts`; create focused schema extension modules under `packages/schema/src/extensions/` as needed; modify `packages/editor/src/extensions/extension-kit.ts` only if its wrapper API must carry the asynchronous extension-kit result.
  - [x] Remove the eager `Emoji, gitHubEmojis` import from the interactive extension-kit module. Load and configure the complete upstream `@tiptap/extension-emoji` catalog through a dynamic import boundary before the interactive extension list is finalized, retaining `forceFallbackImages: true` and the existing regional-indicator exclusion.
  - [x] Keep `createRendererExtensionKit()` synchronous and capable of resolving existing stored emoji names. Isolate any static renderer-only emoji import so the playground consumer build can tree-shake it from the browser entry; do not reduce the renderer's supported catalog or turn unknown historical emoji nodes into shortcodes.
  - [x] Preserve public schema/editor exports where possible. Do not copy or fork Tiptap's Emoji implementation unless a measured, documented bundler limitation prevents a dynamic import boundary; if that contingency is required, retain the current command, input-rule, paste-rule, rendering, fallback-image, and suggestion contracts exactly.
  - [x] **Logging requirements:** use existing development diagnostics to mark lazy emoji-load start, completion, and failure without including document text, shortcodes, or user content. Do not add unconditional `console` calls; surface failures through the existing editor initialization/error path.

- [x] **Task 4: Initialize the editor only after its extension list is ready and verify client/renderer parity and bundle separation.** (depends on Task 3)
  - [x] **Files:** modify `packages/editor/src/components/notion/notion-editor/EditorProvider.vue`; inspect/update `packages/renderer/src/index.ts` only if an extracted schema API requires an import change.
  - [x] Adapt the current synchronous `useEditor({ extensions: createExtensionKit(...) })` path so editor construction waits for the lazy emoji extension promise without leaking a partially initialized editor. Preserve `ready` emission ordering, initial/external content synchronization, collaboration-sync handling, image-upload callbacks, TOC updates, overlay provisioning, destruction cleanup, and the public component API.
  - [x] Provide a deterministic initialization failure path: do not mark the editor ready or apply content twice when the emoji import rejects, and do not leave listeners or a destroyed editor instance behind. Keep the loading interval internal to the existing provider lifecycle rather than adding a new user-facing feature or documentation surface.
  - [x] Re-run the playground analyzer and normal build. Confirm the full upstream emoji dataset is absent from the initial JavaScript chunks, appears only in the lazy chunk, and the synchronous renderer build still resolves existing emoji nodes with the same shortcode/fallback behavior.
  - [x] **Logging requirements:** use verbose existing lifecycle diagnostics for async initialization state transitions and cleanup; report analyzer comparison and normal-build status at `INFO`, and use `ERROR` for load failures, duplicate initialization, renderer incompatibility, or data remaining in an initial chunk. Do not add tests or production telemetry.

## Rework Validation (2026-07-22)

- [x] **Resolve the playground renderer subpath alias.**
  - Added the exact `@i-prikot/editor-schema/renderer` Vite alias before the broader `@i-prikot/editor-schema` alias so source-based renderer imports resolve to `packages/schema/src/renderer.ts`.
- [x] **Resolve source-based renderer imports in Vitest and TypeScript.**
  - **RED:** `npm exec vitest run test/renderer/render-document.test.ts` failed before the alias change with `Cannot find package '@i-prikot/editor-schema/renderer'` from `packages/renderer/src/index.ts`.
  - **GREEN:** `npm exec vitest run test/renderer/render-document.test.ts test/editor/extensions/extension-kit-emoji-lifecycle.test.ts test/editor/components/editor-provider-emoji-lifecycle.test.ts` passes with 3 files / 18 tests.
- [x] **Add targeted async extension-kit/provider lifecycle coverage.**
  - Covers GitHub-catalog lazy-load configuration and asynchronous rejection in `createExtensionKit`, plus provider success, rejected initialization, and late-resolution teardown behavior.
  - Focused formatting and lint checks pass for the resolver and lifecycle test files.

## Completion Criteria

- [x] The implementation has a reproducible measurement of the upstream emoji data
  module in the actual playground consumer bundle, not only in the editor
  library artifact where `@tiptap/*` is external.
- [x] The recorded evidence shows that the regional filter removes only its small
  subset and cannot be represented as a bundle-size reduction.
- [x] If the decision threshold is met, the complete GitHub catalog is no longer
  part of the initial client JavaScript and is delivered through a verified
  lazy chunk; if it is not met, no runtime optimization is introduced.
- [x] Emoji insertion, suggestion, rendering, fallback-image behavior, existing
  stored documents, and synchronous renderer output remain compatible.
- [x] Normal playground/editor build behavior and CSS/vendor chunk configuration
  remain unchanged outside the opt-in analysis mode.
- [x] No documentation changes, generated analysis reports, or unrelated worktree
  changes are added; the mandatory rework tests are limited to the async emoji lifecycle.
