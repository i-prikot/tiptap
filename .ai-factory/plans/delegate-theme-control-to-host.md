<!-- handoff:task:0e25d7d1-7873-4282-876a-bc3d458ce6a5 -->
# Delegate Theme Control to Host

**Created:** 2026-07-14  
**Branch:** `main`  
**Mode:** Fast autonomous Handoff  

## Settings

- [x] **Testing:** superseded by the 2026-07-14 rework. `.ai-factory/RULES.md` requires targeted RED/GREEN evidence for the host theme-delegation behavior.
- [x] **Logging:** no new runtime logging. Theme selection is presentation-only; retain existing unrelated development diagnostics unchanged.
- [x] **Docs:** no documentation changes.

## Scope and Constraints

- [x] Remove the library-owned `ThemeToggle` and all writes to `<html>`, `document.documentElement`, or global `meta[name="color-scheme"]` used to choose the editor theme.
- [x] Make the host application own the selected theme and apply it at a `.tinyfy-editor` root using the existing `dark` class contract (`.tinyfy-editor.dark`). The editor library only consumes that scoped state; it does not detect, persist, or toggle a global theme.
- [x] Move the current theme button into `src/playground/` as a controlled playground UI element. Preserve the current user-visible system-preference initialization and toggle behavior there without mutating global document state.
- [x] Convert editor style defaults and dark overrides away from `:root`, `.dark`, and `.dark body` so multiple editor instances can be independently themed. Preserve body-level page styling only in the playground host when it is still needed for the demo shell.
- [x] Account for the editor menus, popovers, tooltips, suggestion UI, and floating/mobile controls that currently `Teleport` to `body`: their rendered containers must remain inside the scoped theme boundary (or receive the same scoped token context) rather than silently falling back to light/global styles.
- [x] Work with the existing uncommitted editor/playground extraction changes; do not revert or overwrite unrelated work.

## Tasks

### Phase 1: Establish host-owned theme state and playground control

- [x] **Task 1: Replace the library toggle with a controlled playground toggle and root theme state.** Remove `src/editor/components/notion/ThemeToggle.vue`. Create `src/playground/components/ThemeToggle.vue` as a presentational, controlled control (input props plus emitted change/toggle event) that uses the existing button/icons and never reads or writes global document theme state. Update `src/playground/components/NotionEditorHeader.vue` to consume this local component and forward its controlled state/event. Update `src/App.vue` to own the selected dark-mode ref, initialize it from the browser preference for the playground, react to preference changes only while the host has not explicitly overridden it, and wrap the header/editor demo in a `.tinyfy-editor` element whose `dark` class is bound to that host state.
  - [x] **Expected behavior:** only the playground selects a theme; clicking its toggle changes the class on its own `.tinyfy-editor` root, not `<html>` or `body`. The reusable `NotionEditor` has no built-in theme switcher or global DOM side effects.
  - [x] **Files:** `src/App.vue`, `src/playground/components/ThemeToggle.vue` (new), `src/playground/components/NotionEditorHeader.vue`, `src/editor/components/notion/ThemeToggle.vue` (delete).
  - [x] **Logging:** add no logs, telemetry, storage writes, or document/selection data collection. Remove the deleted component's global mutation behavior rather than replacing it with another global side effect.

### Phase 2: Scope tokens and editor stylesheet selectors to `.tinyfy-editor`

- [x] **Task 2: Define the scoped token contract and remove global theme selectors.** In `src/editor/styles/design-tokens.css`, make the light defaults and dark overrides resolve from `.tinyfy-editor` and `.tinyfy-editor.dark`, including color, border, card, shadow, scrollbar, selection, and text-color tokens. Move editor-only resets/background/layout rules out of global `body`/`:root` selectors in `src/editor/styles/notion-editor.css` and into the editor root or playground-specific shell styles as appropriate. Remove the `prefers-color-scheme` override in `src/editor/styles/textarea.css` so the host class always wins.
  - [x] **Expected behavior:** a light and a dark `.tinyfy-editor` can coexist on the same page without changing each other or the host page; missing theme classes retain the editor's light token values.
  - [x] **Files:** `src/editor/styles/design-tokens.css`, `src/editor/styles/notion-editor.css`, `src/editor/styles/textarea.css`, and `src/playground/styles/notion-editor-header.css` for the host-header tokens.
  - [x] **Logging:** add no runtime logs; CSS custom properties and classes are the observable theme contract.

- [x] **Task 3: Migrate all component dark selectors to the scoped root contract.** Replace each remaining editor `.dark ...` and `:root.dark` selector with the equivalent `.tinyfy-editor.dark ...` selector, and anchor any light-only token declarations that currently use `:root` to `.tinyfy-editor`. Cover the style modules under `src/editor/styles/`, including UI primitives (`ai-prompt-input.css`, `avatar.css`, `badge.css`, `button*.css`, `card.css`, `combobox.css`, `dropdown-menu.css`, `input.css`, `menu.css`, `outline.css`, `popover.css`, `separator.css`, `toolbar.css`), editor/node/table surfaces (`blockquote-node.css`, `code-node.css`, `editor.css`, `emoji-input.css`, `horizontal-rule-node.css`, `image-node.css`, `image-upload-node.css`, `list-node.css`, `prosemirror-base.css`, `slash-decoration.css`, `table*.css`, `toc.css`), and any selector found by the final audit.
  - [x] **Expected behavior:** all toolbar, content, table, sidebar, menu, popover, and form-control dark styles resolve from the nearest `.tinyfy-editor.dark` scope; no editor stylesheet relies on a bare `.dark`, `:root.dark`, or `.dark body` selector.
  - [x] **Files:** affected files in `src/editor/styles/` plus `src/playground/styles/notion-editor-header.css`; keep imports in `src/main.ts` aligned with any moved style ownership.
  - [x] **Logging:** add no application logs. Use a source audit only to confirm obsolete global selectors are gone.

### Phase 3: Keep teleported editor UI inside its themed host

- [x] **Task 4: Provide a per-editor overlay target and route body teleports through it.** Add an editor-scoped overlay container/provider at the rendered editor boundary, located beneath the host `.tinyfy-editor` root, and use it as the target for the editor UI that currently teleports to `body`. Update the affected primitives and floating surfaces (`src/editor/components/primitives/dropdown-menu/DropdownMenuContent.vue`, `src/editor/components/primitives/menu/MenuContent.vue`, `src/editor/components/primitives/popover/Popover.vue`, `src/editor/components/primitives/Tooltip.vue`, `src/editor/components/ui/FloatingElement.vue`, `src/editor/components/ui/MobileToolbar.vue`, `src/editor/components/ui/SuggestionMenu.vue`, and direct descendants as required) to consume that target while retaining a safe fallback for components deliberately used outside an editor provider. Keep table overlays targeted at their existing editor widget/overlay containers when those already live within the editor scope.
  - [x] **Expected behavior:** opening dropdowns, popovers, tooltips, slash suggestions, or mobile/floating controls from a dark editor renders them with that editor's dark tokens, while a simultaneous light editor remains light. Overlay positioning, focus behavior, and cleanup stay unchanged.
  - [x] **Files:** `src/editor/components/notion/EditorProvider.vue` and/or a focused composable under `src/editor/composables/`, the listed Teleport components, and any directly required style selectors.
  - [x] **Logging:** add no logs; do not expose overlay target elements or theme state through runtime diagnostics.

### Phase 4: Remove obsolete coupling and verify the host boundary

- [x] **Task 5: Audit the public surface and perform non-test validation.** Confirm `ThemeToggle` is neither exported nor referenced from `src/editor/`, and that the playground uses no deep library import for theme selection. Search the editor and playground sources for global theme mutations and bare/global dark selectors, correcting only theme-related leftovers. Run `npm run typecheck` and `npm run build`, then manually verify the playground in light and dark modes: editor content, header, toolbar, TOC, table controls, dropdowns, popovers, tooltip, and slash/floating/mobile surfaces all follow the local root class.
  - [x] **Expected behavior:** the package builds without the library toggle, host theme ownership is localized to the playground root, and editor overlays retain correct theme styling after teleporting.
  - [x] **Files:** validation covers all files changed in Tasks 1–4; expected source cleanups are in `src/App.vue`, `src/playground/`, `src/editor/components/`, `src/editor/composables/`, and `src/editor/styles/`.
  - [x] **Logging:** report command outcomes and manual-check results only in the implementation handoff; add no runtime logging.

## Validation

- [x] Add and run a targeted host theme-delegation test, recording its RED/GREEN outcomes under the rework evidence below.
- [x] Confirm no library code toggles classes on `document.documentElement`, writes global theme meta tags, or otherwise selects a page-wide theme.
- [x] Confirm the playground root owns the `.tinyfy-editor.dark` state and the playground toggle is controlled by that host state.
- [x] Confirm no editor stylesheet retains a bare `.dark`, `:root.dark`, `.dark body`, or editor-specific `prefers-color-scheme` theme override.
- [x] Confirm teleported editor surfaces receive the local editor token scope in both light and dark instances.
- [x] Run `npm run typecheck` and `npm run build`.

## Rework: Host-Level Overlay Scope (2026-07-14)

- [x] **Route playground host overlays beneath `.tinyfy-editor`.** `App.vue` provides a host overlay target inside its scoped editor root, enabling header tooltips to use the existing overlay-target injection. `CtaPopup.vue` now consumes that target instead of always teleporting to `body`.
- [x] **Validate scoped host overlays.** Added `test/playground/host-overlay-target.test.ts`; the RED check failed before the host target existed, and the GREEN check confirms both CTA and header tooltip DOM are inside that target. Targeted ESLint and `npm run typecheck` pass.

## Rework: Scoped CSS Preflight (2026-07-14)

- [x] **Scope the design-token preflight.** Prefix the preflight reset and every host-affecting element, form-control, attribute, and pseudo-element selector in `src/editor/styles/design-tokens.css` with `.tinyfy-editor` so importing it from `src/main.ts` cannot alter host-page styles.

## Rework: Theme Delegation Test Evidence (2026-07-14)

- [x] **Cover host-owned theme delegation.** `test/playground/host-overlay-target.test.ts` verifies that the playground toggle adds `dark` only to its `.tinyfy-editor` root while preserving pre-existing host classes on both `document.documentElement` and `document.body`.
  - [x] **RED:** with the exact pre-delegation `src/App.vue` restored from `HEAD`, `npm run test -- test/playground/host-overlay-target.test.ts` exited `1`. The new primary test failed at `wrapper.get('.tinyfy-editor')` because the legacy app rendered no host theme boundary.
  - [x] **GREEN:** after restoring the implemented host-owned `src/App.vue`, `npm run test -- test/playground/host-overlay-target.test.ts` exited `0` with `2 passed` tests.
  - [x] **Supporting validation:** `npx eslint test/playground/host-overlay-target.test.ts` and `npm run typecheck` both exited `0`.
