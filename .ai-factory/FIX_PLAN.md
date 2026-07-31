<!-- handoff:task:7eae609d-ed1c-4a75-98ed-e25fb7c93d4f -->

# Fix Plan: Restore `npm run lint` for editor size limits

**Problem:** `npm run lint` fails in `@i-prikot/editor` because one Vue SFC exceeds the 300-line file limit and three functions exceed the 100-line function limit enforced by ESLint.  
**Created:** 2026-07-31 03:51 UTC

## Analysis

- The active ESLint policy in `eslint.config.js` enforces `max-lines` at 300 physical lines and `max-lines-per-function` at 100 counted lines.
- `packages/editor/src/components/notion/notion-editor/EditorProvider.vue` is 376 lines. Its template/public props and editor lifecycle behavior are colocated with update scheduling, collaboration synchronization, teardown, and diagnostics.
- `useDragContextMenuItems` constructs five independent computed menu groups but currently creates all action composables and menu mappings in one 134-line function.
- `useTableAlignCell` mixes derived alignment metadata, selection capability checks, attribute lookup, mutation dispatch, and row/column transaction construction in one 118-line function.
- `createSuggestionPluginState` combines state initialization, exit/refresh handling, dismissed-range mapping, match eligibility, activation, and inactive-state cleanup in one 125-line reducer factory.
- Existing tests already protect table-alignment branches and suggestion-state exit behavior. There is no focused test for drag-context-menu item grouping, so the refactor should add coverage before extracting helpers.

## Fix Steps

- [x] Add or extend focused behavior tests before production refactoring. Cover drag-menu group order, omitted unavailable actions, disabled/action bindings, and shortcut formatting; preserve the existing table-alignment and suggestion-state test scenarios while adding any branch coverage needed for the extracted helpers.
- [x] Split `EditorProvider.vue` by extracting lifecycle/update scheduling and collaboration-content initialization into typed colocated helper/composable module(s). Keep the Vue template, props/emits/provides, debounce and cancellation metadata, ready/update emission order, content synchronization, teardown cleanup, and existing logger/diagnostic events unchanged. Keep the SFC at or below 300 physical lines.
- [x] Decompose `useDragContextMenuItems` into small typed builder helpers for block conversions, pre-submenu actions, post-submenu actions, clipboard actions, and the delete action. Retain the public composable export and returned computed refs, item order, i18n keys, action handlers, availability rules, active states, and shortcuts; keep every function at or below 100 counted lines.
- [x] Extract the table-cell alignment query and mutation responsibilities from `useTableAlignCell` into focused helper functions or a colocated module. Preserve the public option and return types, editable/extension guards, row/column versus active-cell semantics, reverse positional transaction updates, callbacks, and the existing structured logger error messages.
- [x] Extract pure suggestion-state transition helpers from `createSuggestionPluginState` for exit/reset, dismissed-range mapping, eligible-match activation, and inactive-state normalization. Preserve the `PluginKey` metadata contract, `refreshId`, composition behavior, random decoration-ID lifetime, mapping of dismissed ranges, and all state-field values returned by `init` and `apply`.
- [ ] Run the targeted new and existing Vitest files, then run `npm run lint` and `npm run typecheck`. Resolve only regressions introduced by the extractions; do not weaken lint rules, add inline rule disables, change ignores, or alter unrelated working-tree changes.

## Files to Modify

- `packages/editor/src/components/notion/notion-editor/EditorProvider.vue` — retain the component boundary while delegating lifecycle responsibilities to focused modules.
- `packages/editor/src/components/notion/notion-editor/*` — add typed, colocated editor lifecycle/content-sync helper or composable module(s).
- `packages/editor/src/composables/useDragContextMenuItems.ts` — replace in-function menu construction with typed helper composition while preserving its export.
- `packages/editor/src/composables/useDragContextMenuItems.*.ts` or a focused sibling module — add menu-item builder helpers if needed to meet the function limit.
- `packages/editor/src/composables/useTableAlignCell.ts` — delegate alignment state lookup and table mutations to bounded helpers.
- `packages/editor/src/composables/useTableAlignCell.*.ts` or a focused sibling module — add reusable table-alignment helpers if needed.
- `packages/editor/src/utils/suggestion/state.ts` — compose the plugin state field from bounded transition helpers.
- `packages/editor/src/utils/suggestion/*` — add pure suggestion-state transition helper module(s) if needed.
- `test/editor/composables/*` — add/extend behavior tests for the drag menu and retained table-alignment semantics.
- `test/editor/utils/suggestion-runtime-modules.test.ts` — extend state-transition coverage for extracted suggestion helpers.

## Risks & Considerations

- This is a behavior-preserving refactor; module boundaries must not change public import paths, reactive computed identity, or the order of menu entries.
- `EditorProvider` is asynchronous and lifecycle-sensitive. Ensure listeners are registered and removed exactly once, external content still waits for collaboration sync, and an editor created during teardown is destroyed.
- Table row/column updates must stay in descending document position order so multi-cell transactions remain valid.
- Suggestion dismissal and decoration identity are state-machine invariants; test exit, refresh, document mapping, composition, rejected matches, and normalization after an inactive transition.
- Preserve existing structured logger namespaces and event payloads. Do not add temporary console output or change logging policy for this lint-only fix.
- Do not modify the pre-existing unrelated working-tree changes.

## Test Coverage

- [x] Add a focused composable test for `useDragContextMenuItems` covering conversion availability, contextual action filtering, clipboard/delete shortcuts, and handler wiring.
- [x] Run `test/editor/composables/table-align-cell-branches.test.ts` to confirm active-cell and explicit row/column alignment behavior remains intact.
- [x] Extend and run `test/editor/utils/suggestion-runtime-modules.test.ts` for exit dismissal, active-match transitions, refresh IDs, and dismissed-range mapping.
- [ ] Record the required TDD evidence: targeted test failure before the refactor and success after it.
- [ ] Run `npm run lint` to verify all four original errors are eliminated, followed by `npm run typecheck` to verify extracted module boundaries.

## Execution Notes

- 2026-07-31: Added the focused drag-menu test before refactoring. Its first executable run occurred after dependencies were restored; it failed only because an array matcher expected the full nine-item conversion list to have two entries. The assertion was corrected, and the behavior-preserving target suite passed 10/10. No valid behavioral RED state exists for this size-limit-only refactor.
- 2026-07-31: `npm exec vitest run test/editor/composables/drag-context-menu-items.test.ts test/editor/composables/table-align-cell-branches.test.ts test/editor/utils/suggestion-runtime-modules.test.ts` passed (3 files, 10 tests).
- 2026-07-31: `npm run lint` passed `@i-prikot/editor` (including the four originally reported files), then failed in the root `eslint test e2e` phase on 29 pre-existing test-file size and environment errors outside this plan.
- 2026-07-31: `npm run typecheck --workspace=@i-prikot/editor` reached the pre-existing unused `fileInputRef` error in `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue:175`; no errors were reported in the changed files.
