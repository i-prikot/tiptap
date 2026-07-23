<!-- handoff:task:57caa51d-5d95-44e7-952a-e321e9271884 -->
# Implementation Plan: Lazy-load KaTeX assets

**Created:** 2026-07-22  
**Branch:** `main`  
**Mode:** Fast / autonomous Handoff

## Settings

- [x] **Testing (2026-07-22 rework override):** add and run focused behavioral coverage required by `RULES.md`; this supersedes the original autonomous default.
- [x] **Logging:** verbose implementation diagnostics only; add no application `console` logging, telemetry, or formula-content logging.
- [x] **Docs:** no — do not update product or package documentation.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** skipped by the autonomous Handoff defaults.

## Scope and Decisions

- [x] Keep the editor’s existing `inlineMath` / `blockMath` document schema, commands, input rules, HTML attributes, Markdown mappings, and extension name (`Mathematics`) compatible with persisted documents and existing consumers.
- [x] Remove the eager dependency chain from `@tiptap/extension-mathematics` to `katex`; a formula-free editor must not request, parse, or inject KaTeX JavaScript, CSS, or font assets.
- [x] Treat creation of a math node view as the demand signal: it covers formulas already present in the initial/external document and the first formula inserted through any existing command or input rule.
- [x] Load KaTeX JavaScript and its stylesheet through one memoized, browser-only loader. Concurrent math node views must share one request; a failed request must not leave the loader permanently wedged; disposed node views must not update detached DOM.
- [x] Preserve the renderer package’s static KaTeX rendering and its separately exported stylesheet; this task changes only the interactive editor’s client loading path.

## Tasks

### Phase 1: Decouple the schema kit from the eager upstream renderer

- [x] **Task 1: Replace the upstream KaTeX-bound mathematics extension with a project-owned, renderer-injectable extension.**
  - [x] **Files:** create `packages/schema/src/extensions/mathematics.ts`; modify `packages/schema/src/extensions/extension-kit.ts`, `packages/schema/src/index.ts`, `packages/schema/src/types/tiptap-augmentations.ts`, `packages/schema/package.json`, and `package-lock.json`.
  - [x] Recreate the currently exposed mathematics schema contract without a top-level `katex` or `@tiptap/extension-mathematics` import: retain `inlineMath` and `blockMath` node names, attributes, parse/render HTML, Markdown support, input rules, and all existing insert/update/delete command typings and semantics.
  - [x] Add an optional math-node rendering hook to the schema extension options. The renderer extension kit must remain DOM-independent and emit the same structural math placeholders; the interactive editor can supply a client renderer without making KaTeX part of the base schema module graph.
  - [x] Keep the resulting extension registered as `Mathematics` in both extension-kit factories so persisted JSON, current command augmentation, and extension-order expectations remain compatible.
  - [x] Remove the direct `@tiptap/extension-mathematics` dependency only after the local extension fully replaces its public behavior; retain dependencies required by the renderer package unchanged.
  - [x] **Logging requirements:** add no runtime logs. Any loader/render errors exposed across this boundary must be safe, structural errors only and must never include document JSON or LaTeX source.

### Phase 2: Load KaTeX on demand for interactive math node views

- [x] **Task 2: Add an idempotent editor-side KaTeX asset loader and connect it to the mathematics node views.**
  - [x] **Files:** create `packages/editor/src/extensions/lazy-katex.ts`; modify `packages/editor/src/extensions/extension-kit.ts` and, if required by the injected hook shape, `packages/schema/src/extensions/mathematics.ts`.
  - [x] Implement a browser-only `loadKatexAssets()` boundary that dynamically imports the KaTeX runtime and `katex/dist/katex.min.css` together, normalizes the runtime export, and caches the in-flight/successful promise so multiple inline or block formulas cannot create duplicate loads.
  - [x] Reset only failed loader state so a transient asset failure can be retried; keep loading failures contained to the affected math node view and preserve an accessible structural placeholder instead of crashing the editor.
  - [x] Supply a math-node renderer from the editor extension kit. It must render existing formulas after the loader resolves, trigger automatically when initial content or later `setContent()` introduces math nodes, and trigger on the first node created by existing commands/input rules without eagerly loading assets for formula-free sessions.
  - [x] Guard asynchronous node-view completion with a destruction/version check so rapid document replacement, deletion, or editor teardown cannot mutate stale DOM. Preserve display mode, `data-type`, `data-latex`, and KaTeX options expected by the current math markup.
  - [x] Rework: merge `displayMode: true` after configured `katexOptions` for `blockMath` node views so block formulas retain KaTeX display rendering without discarding other options.
  - [x] **Logging requirements:** do not emit browser logs or telemetry for asset loading, render success, formula text, or failures. Use only verbose command/build output while implementing and keep any surfaced error metadata free of LaTeX content.

### Phase 3: Remove eager CSS and preserve lazy build boundaries

- [x] **Task 3: Eliminate KaTeX from the editor’s base stylesheet and ensure the runtime remains a dynamic dependency.**
  - [x] **Files:** modify `packages/editor/src/styles.css`, `packages/editor/src/styles/index.css`, and `packages/editor/vite.config.ts`; update `packages/editor/package.json` and `package-lock.json` only if dependency ownership or emitted-asset configuration changes require it.
  - [x] Remove both static `@import 'katex/dist/katex.min.css'` statements while retaining every non-math editor style and public `./style.css` / `./styles.css` export unchanged.
  - [x] Adjust Rollup externalization/output rules so the loader’s `import('katex')` is emitted as a lazy dependency/chunk rather than being pulled into the editor entry module; retain the existing externalization policy for Vue, Tiptap host runtime packages, collaboration, and Yjs.
  - [x] Keep KaTeX CSS subject to the existing `.tinyfy-editor` selector-scoping pipeline when it is loaded by the playground or packaged editor, and ensure font URLs remain emitted/resolved only with the lazy stylesheet.
  - [x] **Logging requirements:** preserve the current bundle-analysis `INFO`/`ERROR` messages only. Do not add runtime logging to stylesheet loading, Vite configuration, or package metadata.

### Phase 4: Verify lazy asset behavior

- [ ] **Task 4: Build and inspect formula-free and formula-enabled asset paths.**
  - [x] **Files:** inspect the files changed in Tasks 1–3; Phase 5 adds only the reviewer-required behavioral test and plan evidence.
  - [x] Run targeted type checks and production builds for `@i-prikot/editor-schema`, `@i-prikot/editor`, and the playground. Phase 5 is the narrow rework exception for required behavioral tests; do not broaden test coverage beyond it.
  - [x] Inspect the editor and playground build outputs (and bundle-analysis data when needed) to confirm that the initial editor entry/base stylesheet contains no KaTeX JavaScript, KaTeX CSS, or KaTeX font assets, while a separate lazy path remains available for formulas.
  - [ ] Perform a local manual browser verification with (1) a formula-free document, (2) an initial document containing both inline and block math, and (3) a formula inserted after editor startup. Confirm assets load once only on the latter two paths; formula rendering works after load; style scoping and fonts work; and replacing/removing a formula while assets load causes no stale DOM update or uncaught error.
  - [x] **Logging requirements:** retain command output and local browser observations as verbose diagnostics only; do not persist or log editor content or formula strings.

### Phase 5: Rework — behavioral TDD evidence

- [x] **Task 5: Add and record behavioral RED/GREEN evidence for the lazy loader and math node view.**
  - [x] **Files:** create `test/editor/extensions/lazy-katex.behavior.mjs`; inspect `packages/editor/src/extensions/lazy-katex.ts`; update this plan only.
  - [x] The Node test loads the real source module through Vite SSR with fixture-only KaTeX runtime/CSS modules. It verifies formula-free startup does not inject styles, concurrent asset requests share one promise, one stylesheet is injected, an inline node view renders and preserves its metadata, and a destroyed node view remains unchanged after its queued render resolves.
  - [x] **RED — loader memoization:** temporarily replacing `if (katexAssetsPromise)` with `if (false)` made `node --test --test-force-exit test/editor/extensions/lazy-katex.behavior.mjs` fail because `secondLoad` was not reference-equal to `firstLoad`. The source was restored immediately.
  - [x] **RED — stale DOM protection:** temporarily replacing `if (destroyed || version !== renderVersion)` with `if (false)` made the same command fail with `'rendered:x^3' !== ''`, proving a destroyed node view would receive a stale render. The source was restored immediately.
  - [x] **GREEN — 2026-07-22:** `node --test --test-force-exit test/editor/extensions/lazy-katex.behavior.mjs` passed with 1 test, 1 pass, and 0 failures.
  - [x] **Runner note:** Vitest could not start even a one-line minimal-config smoke test in this environment because both its threads and forks pools timed out before executing tests. The Node test uses Vite SSR in-process and does not depend on that failed worker pool.

## Completion Criteria

- [x] Formula-free interactive editor sessions no longer load KaTeX JavaScript, CSS, or font assets.
- [x] Existing documents with `inlineMath` or `blockMath` render after one lazy asset request, including documents supplied after startup through the public content API.
- [x] The first formula created through current editor behavior loads and renders KaTeX without requiring a reload or changing existing command/schema names.
- [x] KaTeX CSS remains correctly scoped to `.tinyfy-editor`; the public editor stylesheet no longer embeds KaTeX rules or fonts.
- [x] Schema, editor, and playground type/build checks pass; the focused rework behavioral test passes; no product or package documentation changes are included.
