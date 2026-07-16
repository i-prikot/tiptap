<!-- handoff:task:08216b25-a06e-4e01-910e-d8898bc8301c -->
# Implementation Plan: Consolidate color and highlight logic

Branch: `main`
Created: 2026-07-14

## Settings

- [ ] Testing: no — requested mode disables test additions, modifications, and execution for this refactor.
- [ ] Logging: verbose implementation diagnostics only; add no runtime editor, selection, color-value, or keyboard-event logs.
- [ ] Docs: no — do not modify project or user documentation.

## Roadmap Linkage

Milestone: "Внутренняя архитектура"
Rationale: Completes the roadmap item that removes duplicated Color/Highlight composable and popover logic while keeping both editor capabilities.

## Scope and Compatibility

- [x] Retain the separate public capabilities and exports of `useColorText`, `useColorHighlight`, `ColorTextPopover`, `ColorHighlightPopover`, and their current button/content components.
- [x] Preserve text-color specifics: `textStyle` capability checks, block-content selection before applying, text icon/shortcut, and `{ color, label }` apply payloads.
- [x] Preserve highlight specifics: mark versus node-background modes, `useColorValue`, the remove-highlight command, highlight icon/shortcut, compact palette defaults, and `{ color, label, mode }` apply payloads.
- [x] Keep current toolbar/mobile consumers source-compatible, including `NotionToolbarFloating.vue`, `MobileToolbar.vue`, and public exports from `src/editor/index.ts`.
- [x] Keep recent-color storage behavior, palette ordering, active-state detection, accessibility labels, keyboard navigation order, delayed mark application, and graceful `editor.can()`/schema fallbacks unchanged.

## Tasks

### Phase 1 — Extract a shared color-control core

- [x] **1. Create a configurable selection-aware color-control composable and shared contracts.**
  - [x] **Files:** Create `src/editor/composables/useColorControl.ts`; modify `src/editor/types/color.ts` only if shared palette/action contracts need a common type.
  - [x] Extract the duplicated reactive foundation currently present in `useColorText.ts` and `useColorHighlight.ts`: subscription to `useEditorSelectionSignal`, computed availability/active/visibility state, hide-when-unavailable handling, optional stored-mark clearing, delayed-versus-immediate command dispatch, and successful-application callbacks.
  - [x] Design the core around narrowly supplied capability, active-state, visibility, apply, and removal adapters so it does not hard-code Tiptap mark names, color palettes, icons, labels, or command chains.
  - [x] Preserve defensive behavior for a null/non-editable editor, unavailable schema/extensions, failed `editor.can()` checks, and command failures; do not broaden the public surface beyond types needed by the two wrapper composables.
  - [x] **Rework (2026-07-15):** Restore the shared pre-dispatch color guard so unresolved highlight colors return `false` before stored marks are cleared or deferred application is scheduled (`602eae29c667`).
  - [x] **Logging:** Do not add runtime logs. Do not log editor state, selected content, color values, command results, or callback payloads.
  - [x] **Dependencies:** None.

### Phase 2 — Rebuild public text and highlight composables as adapters

- [x] **2. Refactor `useColorText` and `useColorHighlight` to delegate common behavior without changing their contracts.**
  - [x] **Files:** Modify `src/editor/composables/useColorText.ts`, `src/editor/composables/useColorHighlight.ts`, and `src/editor/composables/useColorControl.ts`.
  - [x] Keep `TEXT_COLORS`, `HIGHLIGHT_COLORS`, shortcuts, icon exports, `canColorText`, `canColorHighlight`, `pickHighlightColorsByValue`, and all existing option/result names available from their current modules.
  - [x] Move only shared selection/action orchestration into the core; retain text-specific `textStyle` checks plus `selectCurrentBlockContent`, and retain highlight mark/node-background capability checks, `colorValue` resolution, active-node traversal, and remove-highlight semantics in the highlight adapter.
  - [x] Preserve asynchronous stored-mark behavior for text and mark-highlight actions, immediate node-background behavior, exact callback payload shapes, and the current boolean return values from handlers.
  - [x] **Logging:** Do not add runtime logs. Retain existing caught-error fallbacks without emitting editor-command or selection diagnostics.
  - [x] **Dependencies:** Task 1.

### Phase 3 — Consolidate reusable popover and keyboard-panel behavior

- [x] **3. Introduce focused shared UI helpers for color popover structure and palette navigation.**
  - [x] **Files:** Create `src/editor/components/ui/ColorPopoverShell.vue` and `src/editor/components/ui/ColorPopoverPanel.vue`; modify `src/editor/components/ui/ColorTextPopover.vue`, `src/editor/components/ui/ColorHighlightPopover.vue`, `src/editor/components/ui/ColorTextPopoverContent.vue`, and `src/editor/components/ui/ColorHighlightPopoverContent.vue`.
  - [x] Let `ColorPopoverShell.vue` own only the common conditional `Popover` structure and trigger/default slots, leaving each façade responsible for its distinct trigger rendering, button state, ARIA attributes, and emitted payloads.
  - [x] Let `ColorPopoverPanel.vue` own the shared card/container reference and `useMenuNavigation` wiring, exposing the selected index through a scoped slot or equivalent narrow interface. Configure it with ordered action items and a selection callback so both content façades retain their own palette layout and command behavior.
  - [x] Convert the existing text and highlight popovers/content components into compatibility façades over the helpers. Preserve all current props, defaults, emitted event names/payloads, labels, desktop/mobile styling, card roles/classes, `data-highlighted` click behavior, and keyboard selection behavior.
  - [x] Do not merge text and highlight palettes into one undifferentiated component: the text panel must continue to show recents plus text and highlight groups, while the compact highlight panel must continue to honor custom/default highlight colors, `useColorValue`, and remove-highlight.
  - [x] **Logging:** Do not add DOM, keyboard, focus, menu-navigation, popover, or color-application logs.
  - [x] **Dependencies:** Task 2.

### Phase 4 — Integrate consumers and protect API boundaries

- [x] **4. Normalize imports and verify all existing color UI consumers retain their behavior.**
  - [x] **Files:** Review and modify only as required: `src/editor/components/ui/ColorTextButton.vue`, `src/editor/components/ui/ColorHighlightButton.vue`, `src/editor/components/ui/ColorHighlightPopoverButton.vue`, `src/editor/components/ui/ColorMenu.vue`, `src/editor/components/ui/MobileToolbar.vue`, `src/editor/components/ui/NotionToolbarFloating.vue`, and `src/editor/index.ts`.
  - [x] Update internal imports or types for the extracted helpers without changing consumer-facing component names, exports, toolbar routing, styles, or color-menu behavior.
  - [x] Confirm buttons still expose their current props/events, floating toolbar still renders the combined text-color panel, and mobile toolbar still routes to the compact highlight panel.
  - [x] Keep `ColorMenu.vue` behavior intact unless an import/type correction is strictly necessary; its independent menu layout is outside this consolidation.
  - [x] **Logging:** Do not add logs. Preserve the existing `useRecentColors` storage-error reporting unchanged and avoid logging color or editor data elsewhere.
  - [x] **Dependencies:** Task 3.

### Phase 5 — Perform non-test static validation and scope review

- [x] **5. Validate the refactor without adding or running tests.**
  - [x] **Files:** Review all source files created or modified by Tasks 1–4; do not modify files under `test/`.
  - [x] Run `npm run typecheck` and lint only the touched color-related source files, then inspect the final diff for accidental public-API, palette, behavior, or unrelated-working-tree changes.
  - [x] Confirm both adapter composables still compile, all paired popover/content façades preserve their props/events, and no new cyclic imports or Vue-component imports enter `src/editor/composables/`.
  - [x] Do not add, modify, or execute tests; do not change coverage, package configuration, docs, roadmap, or unrelated files.
  - [x] **Logging:** Verify no new runtime logging statements were introduced; keep command output as local implementation diagnostics only.
  - [x] **Dependencies:** Task 4.

## Commit Plan

1. `refactor(color): extract shared color control behavior` — complete Tasks 1–2.
2. `refactor(color): share popover and palette navigation scaffolding` — complete Tasks 3–5.

## Completion Criteria

- [x] Shared composable infrastructure replaces duplicated selection-aware color-control behavior without changing the text-color or highlight-color public APIs.
- [x] Shared popover/panel helpers remove duplicated wrapper and keyboard-navigation scaffolding while text and highlight panels remain visually and behaviorally distinct.
- [x] Existing exported components and current desktop/mobile toolbar integrations remain source-compatible.
- [x] Text marks, highlight marks, node-background colors, recently used colors, active states, keyboard navigation, and remove-highlight behavior are preserved.
- [x] `npm run typecheck` and linting of touched source files complete successfully; no test or documentation work is performed.

## Out of Scope

- [ ] New color features, palette values, storage keys, or changes to `useRecentColors` persistence behavior.
- [ ] Changes to editor extension commands, schema definitions, CSS design tokens, or toolbar visual design.
- [ ] Refactoring the independent `ColorMenu.vue` implementation beyond required import/type compatibility.
- [ ] Test additions, test modifications, test execution, coverage work, documentation changes, roadmap edits, or unrelated working-tree cleanup.
