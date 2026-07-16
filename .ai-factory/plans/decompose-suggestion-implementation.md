<!-- handoff:task:b8e4f00a-374e-4830-bd5d-d752f4c9c15a -->
# Decompose Suggestion Implementation

**Mode:** Fast
**Created:** 2026-07-14
**Branch:** `main`
**Scope:** Refactor only; preserve the current suggestion-plugin API and behavior.

## Settings

- [x] **Testing:** Yes — rework overrides the original no-test setting because `.ai-factory/RULES.md` requires RED/GREEN behavioral coverage for refactors.
- [ ] **Logging:** Do not add runtime logging. Preserve the current silent utility API; use typecheck/lint output only as implementation diagnostics.
- [ ] **Documentation:** No — do not change user-facing or project documentation.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** Optional linkage is skipped in autonomous Handoff mode. The task directly addresses the backlog item in `.ai-factory/ROADMAP.md` for decomposing `utils/suggestion/suggestion.ts`.

## Objective

Split `src/editor/utils/suggestion/suggestion.ts` into focused internal modules for the ProseMirror plugin orchestration, plugin state transitions, inline decorations, and Floating UI mount/positioning behavior. Keep `suggestion.ts` as the compatibility façade so current consumers continue importing the same runtime symbols and types from the existing path.

## Constraints

- [ ] Preserve the existing public API: `Suggestion`, `SuggestionPluginKey`, `findSuggestionMatch`, `calculateStartPosition`, `filterSuggestionItems`, `SuggestionItem`, and all exported suggestion contracts.
- [ ] Keep `src/editor/components/ui/SlashDropdownMenu.vue` and `src/editor/components/ui/SuggestionMenu.vue` on their existing `../../utils/suggestion/suggestion` import path unless a type-only import requires no path change.
- [ ] Preserve Escape dismissal, `dismissedRange` transaction mapping/reset rules, async item cancellation/debounce, renderer lifecycle ordering, decoration attributes/classes, and mount cleanup/outside-click behavior exactly.
- [ ] Do not alter Tiptap extension wiring, Vue menu rendering, package configuration, or docs. The rework permits focused behavioral tests for the extracted suggestion runtime paths only.

## Tasks

### Phase 1 — Define module contracts and preserve the façade

- [x] **1. Establish the suggestion module boundary and compatibility exports.**
  - [x] **Files:** Modify `src/editor/utils/suggestion/suggestion.ts`; create `src/editor/utils/suggestion/types.ts`.
  - [x] Move shared public contracts (`SuggestionMatch`, `FindSuggestionMatchConfig`, `SuggestionProps`, `MountOptions`, `SuggestionRenderer`, and `SuggestionOptions`) into `types.ts`, with the smallest necessary internal state/positioning contracts exported for sibling modules.
  - [x] Convert `suggestion.ts` into the stable entry point: re-export all existing public types and runtime functions from the decomposed modules, including the existing `SuggestionItem` type re-export.
  - [x] Keep `SuggestionPluginState` internal to the suggestion directory unless a consumer outside the directory already relies on it; do not make new implementation details public merely to complete the extraction.
  - [x] Confirm the existing direct imports in `SlashDropdownMenu.vue`, `SuggestionMenu.vue`, and `test/editor/utils/suggestion.test.ts` remain source-compatible through the façade.
  - [x] **Logging:** Do not add `console`, application, lifecycle, or error logs.
  - [x] **Dependencies:** None.

### Phase 2 — Extract pure matching and plugin-state behavior

- [x] **2. Move suggestion matching helpers and state transitions into focused modules.**
  - [x] **Files:** Create `src/editor/utils/suggestion/matching.ts` and `src/editor/utils/suggestion/state.ts`; modify `src/editor/utils/suggestion/suggestion.ts` and later `src/editor/utils/suggestion/plugin.ts`.
  - [x] Relocate `findSuggestionMatch` and `calculateStartPosition` to `matching.ts`; retain their regular-expression semantics, prefix handling, space behavior, range computation, and public façade exports.
  - [x] Relocate plugin-state initialization and the transaction `apply` transition logic to `state.ts`, accepting explicit dependencies/configuration rather than importing the plugin factory and creating a circular dependency.
  - [x] Preserve all state-machine outcomes: editability/composition checks, selection-outside-range deactivation, generated decoration IDs, `exit` metadata handling, `dismissedRange` persistence/mapping/reset, `allow`, `shouldShow`, and `shouldResetDismissed` callbacks.
  - [x] Keep `filterSuggestionItems` as a public utility in the façade or move it to a small pure helper module only if it keeps `suggestion.ts` as a re-export-only façade; its filtering and stable sorting behavior must remain unchanged.
  - [x] **Logging:** Do not log transactions, matches, query text, or editor content.
  - [x] **Dependencies:** Task 1.

### Phase 3 — Extract decoration and positioning/mount behavior

- [x] **3. Isolate inline decorations from the Floating UI mount and positioning helpers.**
  - [x] **Files:** Create `src/editor/utils/suggestion/decorations.ts` and `src/editor/utils/suggestion/positioning.ts`; modify later `src/editor/utils/suggestion/plugin.ts`.
  - [x] Move the active-state `DecorationSet` builder into `decorations.ts`; preserve the inline range, `decorationTag`, combined empty/non-empty class names, and `data-decoration-id` / `data-decoration-content` attributes exactly.
  - [x] Move container resolution, decoration/client-rect fallback, Floating UI middleware construction, virtual-reference handling, `autoUpdate`, `computePosition`, outside-click dismissal, and cleanup into `positioning.ts`.
  - [x] Preserve placement defaults, offset defaults, optional flip and custom middleware, `container` selector fallback to `document.body`, detached-element insertion/removal, hidden-first positioning, custom `onPosition` behavior, and capture-phase `pointerdown` listener semantics.
  - [x] Expose narrow factory functions and explicit callback/context inputs so positioning can request plugin exit without importing or owning plugin state.
  - [x] **Logging:** Do not add DOM, Floating UI, positioning, or outside-click logs; retain current graceful fallbacks for invalid selectors and unavailable `DOMRect` construction.
  - [x] **Dependencies:** Task 1.

### Phase 4 — Extract the ProseMirror plugin orchestrator

- [x] **4. Move plugin construction and renderer/item-loading lifecycle into a dedicated module.**
  - [x] **Files:** Create `src/editor/utils/suggestion/plugin.ts`; modify `src/editor/utils/suggestion/suggestion.ts`; integrate `state.ts`, `decorations.ts`, and `positioning.ts`.
  - [x] Move `SuggestionPluginKey`, the `Suggestion` factory, cancellable/debounced item fetching, plugin `view` lifecycle, renderer phase emission, key handling, and plugin props into `plugin.ts`.
  - [x] Compose the extracted state transition, decoration builder, and positioning factories without changing lifecycle behavior: `onBeforeStart`, `onStart`, initial loading update, query updates, resolved/error item updates, exit, and destroy must retain their present ordering and props.
  - [x] Preserve request cancellation and stale-result guards, `minQueryLength`/`initialItems` handling, command callback range behavior, Escape interception, and renderer key forwarding.
  - [x] Keep the stable `SuggestionPluginKey` export and default configuration values available through `suggestion.ts`; avoid any Vue imports or component-specific logic in the extracted utility modules.
  - [x] **Logging:** Do not log item provider queries, aborts, errors, renderer callbacks, or keyboard events; retain the existing error-to-non-loading behavior.
  - [x] **Dependencies:** Tasks 2 and 3.

### Phase 5 — Normalize imports and perform static validation

- [x] **5. Verify the façade and extracted modules without expanding scope.**
  - [x] **Files:** Review `src/editor/utils/suggestion/suggestion.ts`, `src/editor/utils/suggestion/types.ts`, `src/editor/utils/suggestion/matching.ts`, `src/editor/utils/suggestion/state.ts`, `src/editor/utils/suggestion/decorations.ts`, `src/editor/utils/suggestion/positioning.ts`, and `src/editor/utils/suggestion/plugin.ts`; modify only to resolve extraction-related imports or types.
  - [x] Confirm existing consumers continue to compile through `src/editor/utils/suggestion/suggestion.ts`, with no required modifications to Vue components or test files.
  - [x] Run `npm run typecheck` and lint only the touched suggestion source files. Rework validation may add and run focused behavioral tests for the extracted runtime paths.
  - [x] Inspect the final diff to verify the change only decomposes the suggestion utility, preserves public exports and behavior, adds no logs, and makes no documentation changes.
  - [x] **Logging:** Verify no new runtime logging statements were introduced; retain command output only as local implementation diagnostics.
  - [x] **Dependencies:** Task 4.

### Phase 6 — Rework: behavioral regression evidence

- [x] **6. Add and validate RED/GREEN coverage for extracted runtime paths.**
  - [x] **Files:** Create `test/editor/utils/suggestion-runtime-modules.test.ts`; modify this plan only to resolve the testing-policy conflict and record validation evidence.
  - [x] Exercise `Suggestion` from `plugin.ts` through an editor lifecycle, `createSuggestionPluginState` from `state.ts` through active-to-dismissed exit handling, and `createSuggestionMount` / `createSuggestionClientRect` from `positioning.ts` through floating placement, outside-click dismissal, cleanup, and DOMRect fallback.
  - [x] Run a controlled regression probe that removes the dismissed-range preservation assignment in `state.ts`; the focused test command must fail on the expected active-to-dismissed assertion. Restore the exact assignment and rerun the same command successfully.
  - [x] **Logging:** Do not add runtime logging.
  - [x] **Dependencies:** Task 5.

## Rework Validation Evidence — 2026-07-15

- [x] **RED:** Mutated only `src/editor/utils/suggestion/state.ts` by replacing the exit-path dismissed-range preservation assignment with `null`, then ran `npm test -- test/editor/utils/suggestion-runtime-modules.test.ts -t "preserves the active range as dismissed state on an explicit exit"`. The command failed with exit code 1 on the expected `dismissedRange: { from: 1, to: 5 }` assertion.
- [x] **GREEN:** Restored the exact assignment `next.dismissedRange = prev.active ? { ...prev.range } : prev.dismissedRange` and reran the same command successfully (1 passed).
- [x] **Regression suite:** `npm test -- test/editor/utils/suggestion-runtime-modules.test.ts test/editor/utils/suggestion.test.ts` passed (2 files, 12 tests).
- [x] **Static checks:** `npm run typecheck` and `npx eslint src/editor/utils/suggestion/plugin.ts src/editor/utils/suggestion/state.ts src/editor/utils/suggestion/positioning.ts test/editor/utils/suggestion-runtime-modules.test.ts` passed.

## Commit Plan

1. `refactor(suggestion): extract state decoration and positioning helpers` — complete Tasks 1–3.
2. `refactor(suggestion): isolate ProseMirror suggestion plugin` — complete Tasks 4–5.

## Completion Criteria

- [x] `src/editor/utils/suggestion/suggestion.ts` remains the supported public entry point for current Vue components and tests.
- [x] Plugin orchestration, state transitions, decorations, and Floating UI mount/positioning reside in dedicated focused modules under `src/editor/utils/suggestion/`.
- [x] The refactor preserves matching, item filtering, async loading/cancellation, renderer lifecycle, Escape dismissal, decorations, command execution, and mount cleanup behavior.
- [x] Static validation passes through `npm run typecheck` and linting of only the touched source files.
- [x] No documentation, package configuration, Vue consumer code, or unrelated working-tree changes are modified; the focused behavioral-test rework exception is recorded above.

## Out of Scope

- [ ] Behavioral changes to slash, mention, or emoji suggestion menus.
- [ ] Changes to `SuggestionMenu.vue`, `SlashDropdownMenu.vue`, Tiptap extension configuration, or editor commands.
- [ ] Additional tests beyond the focused extracted-runtime coverage, browser/e2e validation, coverage work, documentation, or roadmap edits.
- [ ] General-purpose Floating UI abstraction shared with menu, dropdown, or popover primitives.
