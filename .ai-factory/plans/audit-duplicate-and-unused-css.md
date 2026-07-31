<!-- handoff:task:8a98762b-a946-49b9-a689-88663c651791 -->
# Implementation Plan: Audit Duplicate and Unused CSS

Branch: `main`
Created: 2026-07-28

## Settings
- [ ] Testing: no
- [ ] Logging: verbose command diagnostics only; this CSS-only cleanup adds no runtime logging
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: This maintenance audit has no requested roadmap linkage.

## Scope and Guardrails
- [x] Audit the editor stylesheet entrypoints, modular editor styles, and the playground-only styles loaded by `apps/playground/src/main.ts`.
- [x] Preserve `packages/editor/src/styles/ai-prompt-input.css` and both of its imports in `packages/editor/src/styles.css` and `packages/editor/src/styles/index.css` unchanged. It is reserved for the future in-house AI extension, even if no current component references it.
- [x] Treat the current working tree as the baseline: `packages/editor/src/styles/editor.css` is already being removed in favor of modular styles. Do not restore that legacy monolith or discard unrelated local changes.
- [x] Do not classify selectors as unused solely because a static text search misses them. Verify classes, data attributes, NodeView markup, Tiptap/ProseMirror-generated DOM, and public editor styling contracts first; retain uncertain rules.
- [x] Do not add tests, test fixtures, documentation, runtime loggers, telemetry, or a standalone audit report.

## Tasks

### Phase 1: Establish CSS ownership and import boundaries
- [x] **Task 1: Map stylesheet entrypoints and module ownership before editing rules.** Trace the public editor style entry (`packages/editor/src/styles.css`), internal modular entry (`packages/editor/src/styles/index.css`), package exports in `packages/editor/package.json`, and playground imports in `apps/playground/src/main.ts`. Confirm that `apps/playground/src/styles/notion-editor-header.css` is owned by `apps/playground/src/components/NotionEditorHeader.vue` and `apps/playground/src/styles/cta-popup.css` by `apps/playground/src/components/CtaPopup.vue`; include them in the audit without moving their rules into the published editor CSS. Record candidate duplicate modules or redundant imports only in the implementation checklist/commit work, not in a new report file. **Files:** `packages/editor/src/styles.css`, `packages/editor/src/styles/index.css`, `packages/editor/src/styles/*.css`, `packages/editor/package.json`, `apps/playground/src/main.ts`, `apps/playground/src/styles/*.css`. **Logging:** No runtime logging applies; retain verbose shell/build output only for local diagnostics.

### Phase 2: Prove duplicate and dead-selector candidates
- [x] **Task 2: Audit rule overlap and selector reachability against actual rendered markup.** For repeated selectors and declarations across `packages/editor/src/styles/*.css` and `apps/playground/src/styles/*.css`, distinguish intentional cascade/state variants from exact duplicate declarations. Trace each removal candidate through Vue templates, `:class` bindings, string-built class names, NodeViews, extension configuration, menu/table components, and Tiptap/ProseMirror DOM contracts under `packages/editor/src/**` and `apps/playground/src/**`. Pay special attention to shared roots such as `.tinyfy-editor`, `.tinyfy-editor.dark`, `.tiptap.ProseMirror`, button, badge, menu, table, TOC, and image-upload selectors: repeated roots may be module-local theme overrides rather than dead styles. Produce a conservative keep/remove decision list in the implementation workflow; keep any selector whose ownership cannot be proven. **Files:** `packages/editor/src/styles/*.css` except the protected `ai-prompt-input.css`, `apps/playground/src/styles/*.css`, `packages/editor/src/components/**`, `packages/editor/src/extensions/**`, `apps/playground/src/components/**`, `apps/playground/src/App.vue`. **Dependencies:** Task 1. **Logging:** No runtime logging applies; use verbose search command output to support each removal decision without writing application logs.

### Phase 3: Remove verified redundancy while preserving cascade contracts
- [x] **Task 3: Consolidate only behaviorally equivalent duplicate rules and delete only proven-unused selectors.** Edit the owning stylesheet module rather than moving unrelated rules into a new catch-all file. Merge repeated declarations only when selector scope, specificity, source order, media-query conditions, and light/dark behavior remain equivalent; otherwise preserve the intentional override. Remove an entire stylesheet and its import only when every rule is proven unused and no public or playground entrypoint requires it. Update `packages/editor/src/styles.css`, `packages/editor/src/styles/index.css`, or `apps/playground/src/main.ts` only when an import becomes empty or redundant. Keep `packages/editor/src/styles/ai-prompt-input.css` and both imports intact regardless of audit results; keep `packages/editor/package.json` public `./style.css` and `./styles.css` exports stable. **Files:** `packages/editor/src/styles.css`, `packages/editor/src/styles/index.css`, affected files in `packages/editor/src/styles/` except `packages/editor/src/styles/ai-prompt-input.css`, affected files in `apps/playground/src/styles/`, and `apps/playground/src/main.ts` only if a verified-empty playground stylesheet is removed. **Dependencies:** Tasks 1–2. **Logging:** CSS cleanup adds no runtime logs; do not add `console` calls or telemetry.

### Phase 4: Validate stylesheet compilation and visual integration
- [x] **Task 4: Validate the cleaned import graph without adding automated tests.** Run `npm run build --workspace=@i-prikot/editor` to verify the public stylesheet export compiles after the cleanup, then run `npm run build --workspace=@i-prikot/playground` to verify the demo still resolves editor and playground CSS imports. Manually smoke-check the playground in light and dark modes for editor content, toolbars, slash/table menus, images, tables, TOC, header, and CTA presentation; compare the affected UI states before accepting each removal. Confirm no stale import points at a deleted CSS file and that `ai-prompt-input.css` remains present and imported by both editor entries. **Files:** modified stylesheet and import files from Task 3; generated build output only if the repository normally tracks it. **Dependencies:** Task 3. **Logging:** Preserve verbose npm/Vite diagnostics locally; do not add runtime logging.
  - [x] **Build and import validation (2026-07-28):** `npm run build --workspace=@i-prikot/editor` and `npm run build --workspace=@i-prikot/playground` both completed successfully. The protected `ai-prompt-input.css` imports remain in `packages/editor/src/styles.css` and `packages/editor/src/styles/index.css`; no source import references the deleted `packages/editor/src/styles/editor.css`.
  - [x] **Manual light/dark visual smoke check (2026-07-28):** Ran the playground in real Chromium at `http://127.0.0.1:5173/`. Light and dark editor surfaces, header controls, seeded image/table/TOC content, and the slash menu rendered without visual regression. The mounted slash menu showed 15 options and two visible horizontal separators in both modes; each was `1px` high, measured `226px` wide, and changed from `rgba(37, 39, 45, 0.1)` in light mode to `rgba(238, 238, 246, 0.11)` in dark mode. The theme toggle changed its accessible label to “Switch to light mode”.

## Acceptance Criteria
- [x] Every removed selector or declaration has a verified unused or behaviorally duplicate rationale; selectors with uncertain Tiptap/ProseMirror or public-contract ownership remain.
- [x] The protected `packages/editor/src/styles/ai-prompt-input.css` file and its imports are unchanged.
- [x] Editor and playground CSS remain separated: published editor styles do not absorb demo-only header or CTA styling.
- [x] Existing modular styles remain the source of truth; the deleted legacy `packages/editor/src/styles/editor.css` is not reintroduced.
- [x] `@i-prikot/editor` and `@i-prikot/playground` builds complete successfully, and the manual playground smoke-check finds no visual regression in audited surfaces. The builds and the light/dark browser check passed on 2026-07-28.

## Risks
- [x] Naive class-name searching can miss dynamic Vue classes and editor-generated DOM; mitigate by tracing component, extension, and Tiptap contracts before deleting anything.
- [x] Combining visually similar rules can alter CSS cascade order, selector specificity, responsive behavior, or dark-mode overrides; mitigate by merging only semantically identical rules in their existing ownership module.
- [x] The working tree already contains unrelated style modularization changes; mitigate by limiting edits to verified audit findings and preserving all other local work.

## Rework
- [x] Restore `min-height: 520px` in `packages/editor/src/styles/prosemirror-base.css` so the live `.tiptap.ProseMirror` editor root preserves the legacy minimum surface height after `editor.css` removal; validate the editor and playground builds. Completed on 2026-07-28: `@i-prikot/editor` and `@i-prikot/playground` builds passed.
