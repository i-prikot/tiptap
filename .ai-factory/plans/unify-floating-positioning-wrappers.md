<!-- handoff:task:529e65a3-f9b0-4fee-9e8e-50ef0f7e450a -->
# Implementation Plan: Unify floating positioning wrappers

Branch: `main`
Created: 2026-07-14

## Settings

- [x] Testing: rework exception — add focused wrapper regression coverage required by review and the TDD rule; retain the original no-test scope for unrelated code.
- [ ] Logging: verbose implementation diagnostics only; add no runtime logs for overlay targets, Floating UI calculations, pointer events, or keyboard events.
- [ ] Docs: no — do not modify project or user documentation.

## Roadmap Linkage

Milestone: "Внутренняя архитектура"
Rationale: Completes the roadmap item that removes the repeated transform-owning floating wrapper from Menu, DropdownMenu, and Popover.

## Scope and Compatibility

- [x] Create one internal primitive wrapper for the teleported outer element that receives Floating UI positioning styles, leaving animated/content elements as descendants so CSS `transform` animations remain independent.
- [x] Preserve each primitive's public props, emitted events, trigger/slot contracts, DOM content classes, ARIA roles, and consumer imports; no callers outside the three primitives should need changes.
- [x] Keep the current overlay-target behavior: when `useEditorOverlayTarget()` provides an element, teleport there; otherwise fall back to `body`. Fold the existing uncommitted target-file changes into the shared wrapper rather than reverting them.
- [x] Retain Menu's context-derived placement, submenu pointer handlers, nested-menu outside-click exception, and `--popover-*` size variables.
- [x] Retain DropdownMenu's side/align placement, `sideOffset`, Radix wrapper attribute, `minWidth: max-content`, `--radix-dropdown-menu-content-*` variables, resolved-side state, and post-flip transform origin.
- [x] Retain Popover's controlled/uncontrolled state behavior, main/cross-axis offsets, distinct flip/shift padding, Radix wrapper attribute, `minWidth: max-content`, `--radix-popover-content-*` variables, and post-flip transform origin.

## Tasks

### Phase 1 — Introduce the shared outer positioning primitive

- [x] **1. Add a focused floating-positioning wrapper component.**
  - [x] **Files:** Create `src/editor/components/primitives/FloatingPositioningWrapper.vue`.
  - [x] Implement a render-only primitive that owns the `Teleport`, resolves the target through `useEditorOverlayTarget()` with the existing `body` fallback, conditionally renders the outer positioned element, and renders the content slot inside it.
  - [x] Define a narrow typed API that lets consumers supply the open state, Floating UI style object, additional wrapper style, and receive the real wrapper element through a `v-model`/update contract compatible with each consumer's `useFloating(..., floatingRef, ...)` call.
  - [x] Forward wrapper-level attributes and listeners to the concrete outer element so callers can retain `role="presentation"`, `data-radix-popper-content-wrapper`, pointer handlers, and accessibility/data attributes. Merge styles deterministically so Floating UI's positioning transform is present while consumer-only values such as `zIndex` and `minWidth` are retained.
  - [x] Keep the wrapper generic: it must not import Menu, DropdownMenu, Popover, their contexts, or their CSS-variable names; it must not own Floating UI middleware, open-state transitions, outside dismissal, or transform-origin calculations.
  - [x] **Logging:** Do not add runtime logging. Keep any implementation diagnostics limited to local tooling output; never log overlay targets, element references, coordinates, or event targets.
  - [x] **Dependencies:** None.

### Phase 2 — Replace the duplicated positioning shells

- [x] **2. Adopt the shared wrapper in Menu, DropdownMenu, and Popover without changing their behavior.**
  - [x] **Files:** Modify `src/editor/components/primitives/menu/MenuContent.vue`, `src/editor/components/primitives/dropdown-menu/DropdownMenuContent.vue`, and `src/editor/components/primitives/popover/Popover.vue`; use `src/editor/components/primitives/FloatingPositioningWrapper.vue`.
  - [x] Replace only each component's duplicated `Teleport` plus outer `v-if`/`ref` wrapper markup with `FloatingPositioningWrapper`; bind the existing `floatingRef` through its element-update contract so all current `useFloating` calls continue to target the outer wrapper.
  - [x] Move the shared overlay-target lookup into the new wrapper and remove now-redundant `useEditorOverlayTarget` and teleport-target computed state from all three consumers, preserving the behavior currently present in the modified working tree.
  - [x] Preserve all component-specific Floating UI setup and effects in their current components: offsets, `flip`, `shift`, `size` middleware, CSS custom-property writes, resolved placement/side, and DropdownMenu/Popover transform-origin updates.
  - [x] Preserve outer-element details exactly: Menu forwards its presentation role and pointer-down/hover handlers; DropdownMenu and Popover retain their Radix data attribute, `minWidth: max-content`, and z-index; all three keep the existing content element and slot hierarchy untouched.
  - [x] Do not alter document-level Escape/outside-pointer handling, selection-closing behavior, submenu timing, trigger behavior, stylesheet selectors, or public exports.
  - [x] **Logging:** Do not add runtime logs. Retain existing graceful behavior without emitting positioning, dismissal, pointer, keyboard, or selection details.
  - [x] **Dependencies:** Task 1.

### Phase 3 — Perform static, scope-focused validation

- [x] **3. Validate the refactor and ensure duplication was removed without broadening scope.**
  - [x] **Files:** Review `src/editor/components/primitives/FloatingPositioningWrapper.vue`, `src/editor/components/primitives/menu/MenuContent.vue`, `src/editor/components/primitives/dropdown-menu/DropdownMenuContent.vue`, and `src/editor/components/primitives/popover/Popover.vue`; modify only to correct refactor-related typing, template, or import issues.
  - [x] Run `npm run typecheck` and ESLint only for the four touched primitive files. The 2026-07-15 rework supersedes the original test prohibition solely for `FloatingPositioningWrapper` coverage.
  - [x] Inspect the final diff to confirm the shared component is the sole owner of teleport-target resolution and outer transform-bearing wrapper markup, while each primitive still owns its unique Floating UI middleware and interaction logic.
  - [x] Confirm no changes were made to test files, stylesheets, documentation, public consumer components, package configuration, or unrelated working-tree edits.
  - [x] **Logging:** Verify no new runtime logging statements were introduced; retain command output only as local implementation diagnostics.
  - [x] **Dependencies:** Task 2.

## Completion Criteria

- [x] `FloatingPositioningWrapper.vue` is the single implementation of the dynamic teleport target and transform-owning outer wrapper used by Menu, DropdownMenu, and Popover.
- [x] The three primitives preserve their current public contracts and their distinct placement, CSS-variable, sizing, animation-origin, and dismissal semantics.
- [x] No consumer imports or content-layer CSS selectors require changes.
- [x] Static validation passes through `npm run typecheck` and targeted ESLint.
- [x] No unrelated tests, documentation, stylesheets, or unrelated working-tree changes are modified; the review-requested wrapper regression spec is the sole test addition.

## Out of Scope

- [ ] Changes to `src/editor/components/ui/FloatingElement.vue`, `SuggestionMenu.vue`, table-handle positioning, or other non-target Floating UI integrations.
- [ ] Unifying the Menu and DropdownMenu APIs, contexts, triggers, selection behavior, or keyboard navigation.
- [ ] Browser/e2e validation, coverage work, documentation, roadmap edits, package changes, or public API redesign.

## Rework — 2026-07-15

The review request supersedes the original test exclusion above for this narrow
scope. Add wrapper-focused regression coverage to satisfy the mandatory TDD
evidence rule without changing the floating-positioning implementation.

- [x] **4. Add focused `FloatingPositioningWrapper` regression coverage.**
  - [x] **Files:** Create `test/editor/components/primitives/floating-positioning-wrapper.test.ts`.
  - [x] Cover the body fallback and model element-update lifecycle, injected overlay-target teleporting, and forwarding/merging of wrapper attributes, pointer listeners, and positioning styles.
  - [x] **Evidence:** `npm run typecheck` passed on 2026-07-15 and includes `test/**/*.ts`. `npm run test -- test/editor/components/primitives/floating-positioning-wrapper.test.ts` could not reach test setup because Vitest's worker timed out; the same outcome occurred with `--pool=forks --maxWorkers=1`. `npx eslint test/editor/components/primitives/floating-positioning-wrapper.test.ts` remained blocked in host process state `D`, so no false GREEN outcome is recorded.
