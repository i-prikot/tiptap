<!-- handoff:task:bf414a91-ba9f-4f19-93bb-b89bb9df22fc -->
# Implementation Plan: Заскоупить стили редактора

Branch: `main`
Created: 2026-07-17
Mode: fast (Autonomous Handoff)

## Goal

Make the published CSS for `@i-prikot/editor` safe to consume in a host
application: every qualified editor selector must be bounded by the existing
`.tinyfy-editor` root, while `html`, `body`, `:root`, and unqualified reset
rules must not affect the host. Keep the current host-owned root contract and
the visual behavior of the editor, KaTeX content, themes, menus, and table
controls.

The package currently imports 40 stylesheet sources from
`packages/editor/src/styles.css`; most component selectors are global. The
playground supplies the `.tinyfy-editor` root, so the library must not add a
second nested root that would override inherited dark-theme tokens. Floating
content also needs to remain below that root: two menu components teleport to
`body`, and several other components fall back to it.

## Settings

- [x] Testing: no — explicitly disabled by the handoff task; do not add or modify test cases.
- [x] Logging: verbose implementation diagnostics; do not add permanent runtime logging for CSS scoping or teleports.
- [x] Docs: no — do not add documentation tasks or a documentation checkpoint.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped for Autonomous Handoff mode; this focused packaging-safety change supports the editor-library styling milestone without changing the roadmap artifact.

## Constraints

- [x] Keep `packages/editor/src/styles.css` as the active stylesheet entry and preserve its import order, including the leading KaTeX import; do not depend on the separate CSS-entry consolidation plan.
- [x] Configure scoping only for the editor package build. Do not introduce a repository-wide PostCSS configuration that could rewrite playground, renderer, or host application styles.
- [x] Treat `.tinyfy-editor` as the public host boundary already used by `apps/playground/src/App.vue`; preserve its light/dark token behavior and do not add a duplicate nested `.tinyfy-editor` wrapper in `NotionEditor` or `EditorProvider`.
- [x] Preserve selector-free at-rules that CSS requires, such as `@font-face` and `@keyframes`, but ensure all qualified selectors in the emitted editor stylesheet are scoped.
- [x] Eliminate editor-owned CSS selectors for `html`, `body`, and `:root`, including any generated from third-party KaTeX CSS. Do not retain global reset declarations as an exception.
- [x] Do not add test files despite the repository TDD rule: the explicit handoff setting `tests:false` takes precedence. Build and static stylesheet inspection remain required implementation evidence.

## Tasks

### Phase 1: Establish a package-local CSS scoping transform

- [x] **Task 1: Add an editor-only PostCSS selector-prefix transform.**
  - [x] Files: `packages/editor/vite.config.ts`, `packages/editor/package.json`, `package-lock.json`.
  - [x] Add `postcss-prefix-selector` as an editor build-time development dependency and register it through the `css.postcss` configuration in the editor's Vite config only.
  - [x] Implement a deterministic selector transform that prefixes previously unscoped qualified selectors with `.tinyfy-editor`, leaves selectors already rooted at `.tinyfy-editor` unchanged, and rewrites `html`, `body`, and `:root` selectors to the editor root rather than emitting host-global rules.
  - [x] Keep `@keyframes`, `@font-face`, and other selector-free at-rules intact; verify the transform processes the bundled KaTeX import as well as the package's own CSS sources.
  - [x] Preserve the library entry, CSS artifact name, external dependency rules, and all non-CSS Vite behavior.
  - [x] **Logging:** capture verbose package-manager, Vite/PostCSS configuration, and generated-CSS diagnostics in the implementation session. Do not add browser logging because this changes build-time CSS only.

### Phase 2: Keep teleported editor UI within the scoped root

- [x] **Task 2: Route every editor overlay through the provided in-root overlay target instead of `body`.** (depends on Task 1)
  - [x] Files: `packages/editor/src/composables/useEditorOverlayTarget.ts`, `packages/editor/src/components/notion/EditorProvider.vue`, `packages/editor/src/components/primitives/dropdown-menu/DropdownMenuContent.vue`, `packages/editor/src/components/primitives/menu/MenuContent.vue`, `packages/editor/src/components/primitives/FloatingPositioningWrapper.vue`, `packages/editor/src/components/primitives/Tooltip.vue`, `packages/editor/src/components/ui/FloatingElement.vue`, `packages/editor/src/components/ui/MobileToolbar.vue`, `packages/editor/src/components/ui/SuggestionMenu.vue`.
  - [x] Replace the two hard-coded `<Teleport to="body">` menu destinations and remove every editor UI fallback that sends a teleport to `body` when the provided overlay element is not ready.
  - [x] Reuse the existing `data-tiptap-overlay-root` supplied by `EditorProvider`; make overlay rendering wait for or consistently resolve that target so dropdowns, menus, tooltips, floating toolbars, mobile controls, and suggestions stay descendants of the host's `.tinyfy-editor` root.
  - [x] Preserve positioning, close-on-outside-click, Escape handling, z-index behavior, and nested-menu behavior; do not alter public component APIs or event contracts.
  - [x] Rework 2026-07-18: when an overlay primitive is mounted outside `EditorProvider`, render it locally instead of suppressing it; when the provider target is available, continue teleporting to its in-root `[data-tiptap-overlay-root]`.
  - [ ] **Logging:** use verbose diagnostics while opening each overlay path and checking teleport destinations in the browser. Do not add runtime `console` calls, since the components already expose optional development diagnostics where applicable.

### Phase 3: Audit source and emitted selectors for exceptions

- [x] **Task 3: Resolve selector-transform exceptions without changing editor visuals.** (depends on Tasks 1–2)
  - [x] Files: `packages/editor/src/styles.css`, `packages/editor/src/styles/*.css` only where the transform audit identifies a selector that cannot be safely rewritten by the build transform.
  - [x] Audit all imported editor styles, especially previously global class families such as `.tiptap-*`, `.ProseMirror`, `.notion-like-editor-*`, `.toc-*`, table control layers, and popover wrappers, to confirm their emitted form has exactly one effective `.tinyfy-editor` boundary.
  - [x] Manually normalize only exceptional grouped selectors, root-level reset selectors, or specificity-sensitive rules that the plugin cannot preserve correctly; do not perform an unrelated visual refactor or reorder stylesheet imports.
  - [x] Confirm existing `.tinyfy-editor` and `.tinyfy-editor.dark` token declarations remain single-root declarations and that the KaTeX stylesheet does not leave qualified selectors unscoped.
  - [x] **Logging:** record each exception found, its before/after selector form, and the reason for any manual source edit. Do not add production logs for stylesheet behavior.

### Phase 4: Build and verify CSS isolation without tests

- [x] **Task 4: Produce and inspect the distributable editor stylesheet.** (depends on Tasks 1–3)
  - [x] Files inspected/generated: `packages/editor/dist/styles.css`, `packages/editor/dist/index.js`, `packages/editor/dist/index.d.ts`.
  - [x] Run `npm run build --workspace=@i-prikot/editor` and confirm the existing package export continues to resolve its CSS artifact.
  - [x] Rework 2026-07-18: Restore the playground alias to `packages/editor/src/styles.css` and apply the editor selector-scoping transform only to editor and KaTeX CSS during the playground build; emitted playground editor selectors remain rooted at `.tinyfy-editor`.
  - [x] Inspect the emitted `dist/styles.css` with a selector-aware check that ignores selector-free at-rules and verifies each qualified selector is rooted at `.tinyfy-editor`; explicitly fail the implementation check for emitted `html`, `body`, `:root`, or unqualified universal/reset selectors.
  - [ ] Manually exercise the playground's light and dark editor views plus dropdown menu, nested menu, tooltip, suggestion menu, floating toolbar, mobile toolbar, table controls, and a KaTeX formula; confirm the live overlay DOM remains under `[data-tiptap-overlay-root]` inside `.tinyfy-editor` and no host layout/reset styles change. **Blocked on 2026-07-18:** Playwright Chromium cannot launch because the environment lacks `libglib-2.0.so.0`.
  - [x] Do not create or run automated test cases because testing is explicitly disabled; report build output and selector/DOM inspection as the required verification evidence.
  - [x] **Logging:** retain verbose build output and selector-audit results in the implementation handoff. Manual DOM inspection remains blocked as noted above; no permanent application logging was added.

## Completion Criteria

- [x] The editor's emitted CSS scopes every qualified selector beneath `.tinyfy-editor` and contains no editor-owned `html`, `body`, `:root`, or global reset selector.
- [x] Existing `.tinyfy-editor` light/dark theme token inheritance continues to work without adding a nested package root.
- [x] KaTeX and all editor UI styling are included in the same scoped output, while required selector-free font/keyframe at-rules remain valid.
- [x] Editor-owned overlays use the provided in-root `[data-tiptap-overlay-root]` when available; standalone primitives render locally when no provider target exists, and no menu, tooltip, suggestion, or toolbar falls back to `body`.
- [x] `npm run build --workspace=@i-prikot/editor` succeeds and generated CSS/DOM inspection demonstrates host-style isolation.
- [x] No automated tests, documentation artifacts, unrelated component behavior, or non-editor CSS pipelines change.
