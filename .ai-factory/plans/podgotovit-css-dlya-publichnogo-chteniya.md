<!-- handoff:task:c0e0dab1-91c8-426a-b189-76b37dfc32e2 -->
# Implementation Plan: Prepare CSS for public reading

Branch: `main`
Created: 2026-07-17

## Settings
- [x] Testing: yes — use `test/renderer/public-styles.test.ts` for behavioral coverage of the public stylesheet and its package export; record targeted RED/GREEN command outcomes below.
- [ ] Logging: verbose development diagnostics; add no runtime logging because the deliverable is static CSS and may style user-authored content.
- [ ] Docs: no — do not update README, package documentation, or the roadmap.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by the autonomous Handoff defaults; the task directly corresponds to the Stage 4 public-reading CSS item.

## Scope and Decisions
- [ ] Deliver a separate public asset from `@i-prikot/editor-renderer`, not a subset of `@i-prikot/editor/styles.css`: the current editor stylesheet is about 1.58 MB and includes menus, toolbars, selections, drag handles, and other editing-only UI.
- [ ] Scope every selector below a stable host wrapper, `.tinyfy-public-document`; `renderDocument()` continues returning semantic HTML without injecting wrapper markup, so the Tinyfy host owns the wrapper around the rendered fragment.
- [ ] Cover content already emitted by `renderDocument()` with semantic selectors (`p`, `h1`–`h6`, `ul`/`ol`, task lists, `blockquote`, `table`, `th`, `td`, `pre`, `code`, `img`, `figure`, `figcaption`, and `hr`) while preserving supplied alignment and colour attributes.
- [ ] Keep formula rules layout-only and forward-compatible (`math`, `.katex`, and `.katex-display` spacing/overflow). Do not import, copy, or bundle KaTeX vendor CSS or fonts in this task: server formula rendering and the KaTeX distribution contract are a separate roadmap item.
- [ ] Do not add global resets, `html`/`body` selectors, UI states, animations, container JavaScript, or CSS that relies on `.tiptap`, `.ProseMirror`, `.tinyfy-editor`, editor NodeViews, toolbars, menus, or table-selection classes.

## Tasks

### Phase 1: Create the public reading stylesheet
- [x] **Task 1: Add a compact, semantic public-content stylesheet.** Create `packages/renderer/styles.css` with only selectors nested under `.tinyfy-public-document`. Define a small local custom-property set for readable foreground colour, muted text, link colour, borders, quote accent, inline-code background, and content spacing; apply it to normal-flow typography without setting global page fonts or backgrounds. Style paragraphs and heading hierarchy with consistent vertical rhythm, responsive typography, anchor-safe heading scroll margins, nested ordered/unordered lists, and static checked task-list presentation. Add accessible link focus styling, quotation treatment, inline/block code wrapping, wide-table horizontal scrolling without editor resize/selection affordances, responsive images/figures/captions, and horizontal rules. Add minimal display-math spacing and overflow behavior for `math`, `.katex`, and `.katex-display`, leaving KaTeX rendering internals to the later KaTeX decision. The uncompressed source must remain deliberately small and contain no imports from editor CSS or interactive selectors. **Files:** `packages/renderer/styles.css`. **Logging:** CSS has no runtime path; add no `console` calls, telemetry, or document-content logs. Use build and package command output only as verbose local diagnostics.

### Phase 2: Publish a stable stylesheet entry point
- [x] **Task 2: Export the public CSS with the renderer package.** Extend `packages/renderer/package.json` so consumers can import `@i-prikot/editor-renderer/styles.css`; point the subpath export at the root `styles.css` asset and include that asset in the package `files` allowlist alongside `dist`. Keep the JavaScript renderer entry (`.`) dependency-free with respect to CSS so Node consumers of `renderDocument()` do not evaluate a stylesheet. Do not add a dependency on `@i-prikot/editor`, Vue, Tiptap editor UI packages, or KaTeX solely for styling. **Files:** `packages/renderer/package.json`, `packages/renderer/styles.css`. **Dependencies:** Task 1. **Logging:** package metadata introduces no runtime logging; retain only npm command output for local debugging and never print rendered documents or user content.

### Phase 3: Validate the static distribution contract
- [x] **Task 3: Validate renderer build, packed public asset, and behavioral CSS contract.** Run `npm exec vitest run test/renderer/public-styles.test.ts` before and after the CSS changes, then record its relevant RED/GREEN outcomes. Run `npm run typecheck --workspace=@i-prikot/editor-renderer` and `npm run build --workspace=@i-prikot/editor-renderer` to confirm the package remains server-buildable. Run `npm pack --dry-run --workspace=@i-prikot/editor-renderer` and verify that the generated package contains `styles.css`, the `./styles.css` export resolves to that included file, and `dist/index.js` remains the JavaScript entry. Manually review a representative `renderDocument()` fragment inside `<article class="tinyfy-public-document">` containing headings, nested and task lists, a quote, a wide table, code, image/figure, and display-math markup; confirm it has no toolbar/menu/drag/selection presentation and requires no client-side editor JavaScript. **Files:** `test/renderer/public-styles.test.ts`; generated `packages/renderer/dist/**` only if the repository's tracked-build workflow requires updated declarations/output. **Dependencies:** Tasks 1–2. **Logging:** preserve command output only as local verbose diagnostics; do not add application logs or serialize document content in diagnostics.

## Rework Resolution
- [x] **2026-07-17: Preserve task-list completion semantics without interactivity.** `renderDocument()` emits disabled native task checkboxes, retaining their checked state for assistive technologies while removing keyboard and pointer toggling; the stylesheet visually clips those controls and uses `label::before`, driven by `li[data-checked]`, as the static visual indicator.
- [x] **2026-07-17: Protect display MathML.** Apply block display, vertical spacing, width limits, and horizontal overflow handling to `math[display='block']`, matching the protection applied to block-math containers and `.katex-display`.
- [x] **2026-07-17: Record behavioral RED/GREEN evidence.** `npm exec vitest run test/renderer/public-styles.test.ts` was RED before the CSS update: 1 test file failed, with 2 failed assertions (the checkbox used `display: none` and display MathML had no protected rule) and 1 passing export assertion. The same command was GREEN after the update: 1 test file passed, 3 tests passed.
- [x] **2026-07-17: Disable static task controls with RED/GREEN coverage.** `npm exec vitest run test/renderer/render-document.test.ts` was RED after adding the disabled-checkbox assertion: 1 test failed because generated task markup lacked `disabled`. After the renderer safeguard, `npm exec vitest run test/renderer/render-document.test.ts test/renderer/public-styles.test.ts` was GREEN: 2 test files passed, 6 tests passed.
