<!-- handoff:task:ec9cc390-3344-4e11-b0ed-3d902a9ee820 -->
# Implementation Plan: Configure static KaTeX rendering

Branch: `main`
Created: 2026-07-17

## Settings
- [x] Testing: no — do not add, modify, or run unit, snapshot, integration, or end-to-end tests.
- [x] Logging: retain verbose command output for local diagnostics; add no runtime logging or document-content logging.
- [x] Docs: no — do not update README, package documentation, or roadmap artifacts.

## Roadmap Linkage
Milestone: "none"
Rationale: The autonomous Handoff task is a focused implementation of the Stage 4 public-renderer KaTeX item; linkage is intentionally skipped.

## Scope and Decisions
- [x] Reuse the already shared `Mathematics` extension in `@i-prikot/editor-schema`: persisted `inlineMath` and `blockMath` nodes carry their source in `attrs.latex`. Do not change editor commands, NodeViews, input rules, or the JSON schema.
- [x] Keep `renderDocument()` synchronous and server-only. It must return fully rendered KaTeX markup for both math node types, so a public page needs no client-side editor, KaTeX JavaScript, auto-render script, or hydration.
- [x] Retain `generateHTML()` for the non-math schema. Then parse that generated, server-side HTML in an isolated `happy-dom` document and replace only `[data-type="inline-math"]` and `[data-type="block-math"]` placeholders. This preserves the existing schema serializer and avoids regex replacement or decoding of HTML attributes by hand.
- [x] Render each formula with `katex.renderToString()` using `output: 'htmlAndMathml'`, `displayMode: false` for inline math, `displayMode: true` for block math, `throwOnError: false`, and `trust: false`. Valid formulas therefore include visual HTML and accessible MathML; invalid LaTeX remains a static KaTeX error rendering instead of breaking the whole published document.
- [x] Preserve the outer Tiptap placeholder element and its `data-type` / `data-latex` attributes, inserting KaTeX output as its child. This retains useful structural metadata while rendering the formula exactly once on the server.
- [x] Treat an absent or non-string `attrs.latex` on a math node as malformed JSON: fail with an error naming only the node type and structural path, never the formula text or full document. Keep existing unsupported-node and CSS-attribute sanitation failures visible to callers.
- [x] Make KaTeX CSS a deliberate package contract: expose `@i-prikot/editor-renderer/katex.css`, whose source imports `katex/dist/katex.css`. The consuming public-page build must include this CSS asset so KaTeX fonts and layout are served by the stylesheet pipeline; no JavaScript runtime import is permitted.

## Tasks

### Phase 1: Establish renderer runtime and CSS distribution
- [x] **Task 1: Declare the KaTeX and DOM runtime contract.** Add direct production dependencies on `katex` (server `renderToString()` and vendor CSS) and `happy-dom` (safe server-side DOM parsing) to the renderer workspace, then update the root lockfile. Extend the renderer package export map and published-file allowlist for a `./katex.css` subpath without changing the JavaScript root entry. Create `packages/renderer/katex.css` as a minimal CSS entry that imports `katex/dist/katex.css`; do not copy vendor CSS or fonts, add global selectors, or import any editor UI CSS. **Files:** `packages/renderer/package.json`, `packages/renderer/katex.css`, `package-lock.json`. **Logging:** package metadata and CSS add no runtime logging; keep install/package command output only as local verbose diagnostics and never print user documents or LaTeX strings.

### Phase 2: Render math nodes to static HTML and MathML
- [x] **Task 2: Add a safe KaTeX transformation step to `renderDocument`.** In `packages/renderer/src/index.ts`, keep the existing immutable JSON sanitation and `generateHTML()` flow. Add recursive math-node validation that identifies `inlineMath` / `blockMath`, requires a string `attrs.latex`, and reports malformed values by type plus structural path only. Parse the generated fragment with a fresh `happy-dom` document, locate only the two emitted `data-type` placeholders, and set their contents from `katex.renderToString()` using the agreed static options (`htmlAndMathml`, mode by node type, `throwOnError: false`, `trust: false`). Serialize the fragment back to a string after all placeholders are replaced. Do not use regexes, browser globals, `eval`, a client KaTeX script, or any API that logs formula/document content. **Files:** `packages/renderer/src/index.ts`. **Dependencies:** Task 1. **Logging:** preserve renderer purity; add no `console`, telemetry, or error logs. Exceptions must contain only safe structural metadata and must not serialize LaTeX, JSON, or generated HTML.

### Phase 3: Validate the static-publication contract without tests

- [x] **Task 3: Build and manually inspect server output and package assets.** Run `npm run typecheck --workspace=@i-prikot/editor-renderer` and `npm run build --workspace=@i-prikot/editor-renderer`; do not run `npm test`, Vitest, or any other test command. After building, use a short local Node/ESM inspection against the renderer output to render a document containing one `inlineMath` and one `blockMath`, then confirm the HTML contains the original math `data-type` wrappers, KaTeX classes, and MathML while containing no `<script>` or client-editor markup. Also inspect an invalid-LaTeX case to confirm it produces static fallback markup rather than aborting the document render, and inspect a non-string `latex` case to confirm the safe structural error. Run `npm pack --dry-run --workspace=@i-prikot/editor-renderer` and verify that `katex.css` is packaged, the `./katex.css` export resolves, and its `@import` continues to target the declared `katex` dependency. **Files:** no source changes expected; update `packages/renderer/dist/**` only if tracked build artifacts are required by repository workflow. **Dependencies:** Tasks 1–2. **Logging:** retain only command output and local inspection results as verbose diagnostics; do not persist or log rendered documents or formulas.
