<!-- handoff:task:8ce5debb-6b47-4b32-9fac-a5cab73ec7ac -->
# Implementation Plan: Optimize public reader payload

Branch: `main`
Created: 2026-07-22

## Settings
- [ ] Testing: no — do not add or change automated tests or snapshots for this task. Validate with the renderer build and the payload-measurement command only.
- [ ] Logging: verbose CLI diagnostics — the measurement command must print raw, gzip-level-9, and maximum-quality text-Brotli bytes, plus the applicable budget and pass/fail result. Add no runtime logging, telemetry, or document-content logging to the renderer.
- [ ] Docs: no — do not update the README, package documentation, or roadmap as part of this implementation.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff defaults; this work directly implements the existing Stage 7 public-reader payload roadmap item.

## Scope and Constraints
- [ ] Keep `renderDocument()` server/static-only: public pages must continue to deliver the rendered HTML fragment plus explicit stylesheet links, with no import of `@i-prikot/editor`, Vue, ProseMirror editor UI, or client-side hydration requirement.
- [ ] Treat `packages/renderer/styles.css` as the core reader stylesheet. Its current baseline is 4,993 raw bytes, 1,284 bytes with gzip level 9, and 1,084 bytes with text-mode maximum-quality Brotli.
- [ ] Measure a deterministic representative public-page shell around the output of `renderDocument()` and record both per-fixture and worst-case HTML sizes. Measure KaTeX CSS as an optional, math-only supplemental asset; do not silently include it in non-math page payloads.
- [ ] Preserve semantic/static behavior and accessibility: heading anchors, links and focus treatment, task completion state, image alt/loading attributes, table structure, code whitespace, MathML/KaTeX fallback, and sanitization of untrusted JSON must remain intact.
- [ ] Keep only attributes required for static semantics, styles, accessibility, or reader CSS. Do not remove serialized document data until its consumer and CSS dependency have been verified.

## Tasks

### Phase 1: Establish a reproducible payload contract
- [x] **Task 1: Add a deterministic public-page payload measurement command.** Create `packages/renderer/scripts/measure-public-payload.mjs` and a canonical fixture module at `packages/renderer/scripts/public-page-fixture.mjs`. The fixture must exercise headings, nested lists, tasks, quote/code, image, table, marks, and inline/block math; wrap `renderDocument()` output in the production reader host element, `<article class="tinyfy-public-document">…</article>`, without introducing editor JavaScript. Measure UTF-8 raw bytes, gzip at level 9, and Brotli in text mode at maximum quality for (a) `styles.css`, (b) each rendered representative fixture/page shell, (c) the worst-case generated HTML, and (d) the KaTeX stylesheet as a separately reported math-only increment. Add `measure:public-payload` to `packages/renderer/package.json`; it must build the renderer before importing `dist/index.js`, print a readable table, and support machine-readable JSON for CI/hand-off use. **Files:** `packages/renderer/scripts/measure-public-payload.mjs`, `packages/renderer/scripts/public-page-fixture.mjs`, `packages/renderer/package.json`. **Logging:** write verbose sizes, compression parameters, fixture names, budgets, and exit status to command output only; never log rendered user content at runtime.

### Phase 2: Reduce core reader CSS without losing coverage
- [x] **Task 2: Compact the core public reader stylesheet to its explicit budget.** Refactor `packages/renderer/styles.css` to eliminate duplicated declarations and selectors while retaining the current wrapper-scoped semantic coverage. Keep the public CSS independent from the editor stylesheet, preserve task-checkbox accessibility, link focus visibility, responsive media/tables, block code, and display-math overflow. Enforce core stylesheet ceilings of 4,096 raw bytes, 1,100 gzip bytes, and 950 Brotli bytes in the measurement command; if a stricter binding Tinyfy budget is supplied during implementation, use it instead and do not weaken these caps to accommodate a regression. Do not minify away necessary selector safety, add global selectors, add a CSS build dependency, or move editor-only rules into this asset. **Files:** `packages/renderer/styles.css`, `packages/renderer/scripts/measure-public-payload.mjs`. **Logging:** report before/after core-CSS metrics and the specific failed ceiling when a budget is exceeded; add no browser or renderer logging. **Dependencies:** Task 1 establishes the measurement format and gate.

### Phase 3: Remove only redundant generated static markup
- [x] **Task 3: Minimize generated public HTML through a verified attribute audit.** Update the renderer’s post-processing in `packages/renderer/src/index.ts` so it removes only redundant attributes that are emitted for editor traversal or math placeholders after they have served their rendering purpose. In particular, remove duplicated math-placeholder metadata only after KaTeX markup is rendered and update `packages/renderer/styles.css` to rely on durable rendered math selectors rather than discarded placeholder data attributes. Retain static semantics and security behavior: disabled task inputs and `data-checked`, document links and image attributes, table spans/widths/alignment, supported colors, structural IDs required by output contracts, and KaTeX’s accessible MathML must remain. Measure each representative fixture before and after; set generated HTML limits in the measurement command from the approved Tinyfy budget, or, when no external numeric limit is available, lock each fixture and the canonical worst-case page to no more than its documented pre-change baseline. **Files:** `packages/renderer/src/index.ts`, `packages/renderer/styles.css`, `packages/renderer/scripts/measure-public-payload.mjs`. **Logging:** the command must identify the fixture and metric that regresses; `renderDocument()` must remain silent and must not expose content through logs. **Dependencies:** Tasks 1–2 provide the measurement baseline and CSS selector contract.

### Phase 4: Gate package delivery against future payload regressions
- [x] **Task 4: Make the measured budgets a release-safe package check.** Extend `packages/renderer/package.json` so the normal renderer build remains separate from `measure:public-payload`, and make the measurement command exit non-zero for a core-CSS or HTML-budget failure. Confirm `./styles.css` and `./katex.css` remain explicit package subpath exports, with `katex.css` documented in command output as conditional-only; the JavaScript entry must not import either stylesheet or editor UI code. Run the workspace renderer build and the new measurement command after the optimizations, then preserve the resulting measurements in the command output/CI log rather than adding a documentation artifact. **Files:** `packages/renderer/package.json`, `packages/renderer/scripts/measure-public-payload.mjs`. **Logging:** print the package export boundary, conditional KaTeX status, final metrics, and a single clear pass/fail summary. **Dependencies:** Tasks 1–3 complete the measurement, optimization, and static HTML contract.

## Validation
- [x] Run `npm run build --workspace=@i-prikot/editor-renderer` to ensure the static renderer still compiles independently of the editor package.
- [x] Run `npm run measure:public-payload --workspace=@i-prikot/editor-renderer` and confirm all core CSS and approved HTML limits pass with the fixed gzip/Brotli settings.
- [x] Inspect the command output to verify that KaTeX CSS is reported separately and that no JavaScript editor asset is included in the public-page payload calculation.

## Rework: 2026-07-23
- [x] Require a complete `HTML_BUDGETS` entry for every public-page fixture and compute raw, gzip, and Brotli worst-case payloads independently.
- [x] Include the conditional `katex.css` stylesheet in math fixture shells only.
