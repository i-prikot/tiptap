<!-- handoff:task:f4633773-107f-413b-b2e5-c63236bfffb4 -->

# Fix Plan: Restore `npm run typecheck` for editor tests

**Problem:** `npm run typecheck` fails with 53 TypeScript errors across 13 recently added editor test files.  
**Created:** 2026-07-14 03:30 UTC

## Analysis

The production composables consistently accept `Editor` from `@tiptap/vue-3`, while several tests construct and annotate an `Editor` from `@tiptap/core`. The Vue editor class adds reactive fields, so a Core editor is not assignable to the composable contracts. This accounts for the repeated `reactiveState`, `reactiveExtensionStorage`, `contentComponent`, and `appContext` errors.

The remaining failures come from test fixtures that are intentionally partial but are currently checked as complete Tiptap/ProseMirror objects, plus library/API typing changes:

- Node-view mocks omit the complete `ChainedCommands`, extension, node, and `Fragment` APIs.
- `posAtCoords` now requires `{ pos, inside }`; captured table positions are not narrowed inside callbacks.
- `tableNodes` now requires `cellAttributes`.
- Array `.at()` is unavailable under the configured TypeScript library target.
- Generic helper signatures infer writable computed refs, heterogeneous extension arrays, or invalid constructor parameter types.
- Recent-color fixtures and synthetic event listeners do not satisfy the current domain/event contracts.
- The table-kit test invokes an overloaded node-extension hook through a context typed as an incompatible base extension.

No production implementation fails type checking. The fix should remain test-only; changing the TypeScript target or weakening production contracts would hide fixture defects and broaden runtime impact.

## Fix Steps

- [x] Standardize affected editor integration/composable tests on the Vue editor type and constructor.
  - [x] Replace Core `Editor` imports with `@tiptap/vue-3` where a test passes an editor to a Vue composable, provider, or node-view.
  - [x] Keep core-only symbols (for example `Extension`, `AnyExtension`/`Extensions`, and command types) as type imports from `@tiptap/core` where required.
  - [x] Update `shallowRef`/computed helper annotations to `ComputedRef<Editor | null>` so Vue does not unwrap the editor into an incompatible structural type.
  - [x] Cover `test/editor/components/table-selection-overlay.integration.test.ts`, `test/editor/composables/additional-branches.test.ts`, `test/editor/composables/cursor-visibility.test.ts`, `test/editor/composables/node-actions*.test.ts`, `test/editor/composables/scroll-and-viewport-branches.test.ts`, and `test/editor/composables/table-align-cell-branches.test.ts`.

- [x] Make node-view test doubles explicitly typed as deliberate partial mocks.
  - [x] In `test/editor/components/image-upload-node-view.integration.test.ts`, isolate the intentional mock casts through `unknown` for the command chain and full node-view props rather than claiming a small object is a complete Tiptap `ChainedCommands`, extension, or ProseMirror `Node`.
  - [x] Cast queried file-input elements to `HTMLInputElement` only at the test boundary.
  - [x] In `test/editor/nodes/image-node-view-branches.test.ts`, apply the same typed node-view prop fixture approach for the minimal extension mock.
  - [x] Replace `.at(-1)` calls with indexed last-call helpers compatible with the configured ES library target.

- [x] Update test fixtures for current ProseMirror and table APIs.
  - [x] Supply `cellAttributes: {}` to `tableNodes` in `test/editor/components/table-extend-row-column-buttons.test.ts`.
  - [x] In the table-selection and table-handle fixtures, retain the validated table position in a `number` local for callbacks and return both `pos` and `inside` from `posAtCoords` spies.
  - [x] Replace the remaining `updates.at(-1)` assertion with an index-based last-item assertion.
  - [x] In `test/editor/extensions/table-kit-options.test.ts`, invoke `addProseMirrorPlugins` through a type narrowed to the `NotionTable` node-extension hook (or an equivalent correctly typed context) instead of relying on an incompatible overload selected from the generic extension union.

- [x] Correct composable-test helper and fixture contracts.
  - [x] Type `useAction` factories with `ComputedRef<Editor | null>` rather than `ReturnType<typeof computed<...>>`, which selects the writable-computed overload.
  - [x] Type editor extension arguments as `Extensions`/`AnyExtension[]` so StarterKit and Image/Node extensions can coexist.
  - [x] Replace `Parameters<typeof Editor>` in upload/TOC tests with the appropriate Tiptap extensions type because `Editor` is a class constructor, not a callable function.
  - [x] Remove the unused `node` callback parameter, add required `label` values to `RecentColor` inputs/expectations, and pass an event payload when manually invoking typed selection listeners.

- [x] Verify that type-only fixture changes preserve test behavior.
  - [x] Run the affected editor component, composable, extension, and node test files with Vitest.
  - [x] Run `npm run typecheck` and confirm it exits successfully with no TypeScript errors.
  - [x] Do not add `[FIX]` runtime logging: this change repairs static test fixtures only and does not alter a runtime production path.

## Files to Modify

- [x] `test/editor/components/image-upload-node-view.integration.test.ts` — type the node-view and command-chain mocks, input elements, and last-call assertions.
- [x] `test/editor/components/table-extend-row-column-buttons.test.ts` — provide required table-node options.
- [x] `test/editor/components/table-selection-overlay.integration.test.ts` — use the Vue editor and satisfy `posAtCoords`/provider contracts.
- [x] `test/editor/composables/additional-branches.test.ts` — align editor/ref types and complete local fixture/listener contracts.
- [x] `test/editor/composables/cursor-visibility.test.ts` — preserve the Vue editor class with shallow refs.
- [x] `test/editor/composables/node-actions.test.ts` — correct computed-ref and heterogeneous extension helper types.
- [x] `test/editor/composables/node-actions-branches.test.ts` — correct computed-ref and heterogeneous extension helper types.
- [x] `test/editor/composables/scroll-and-viewport-branches.test.ts` — pass a Vue editor computed ref to the composable.
- [x] `test/editor/composables/table-align-cell-branches.test.ts` — use the Vue editor and a compatible computed ref.
- [x] `test/editor/extensions/table-handle.integration.test.ts` — satisfy coordinate-result typing and ES-library compatibility.
- [x] `test/editor/extensions/table-kit-options.test.ts` — narrow the tested node-extension hook to its correct `this` context.
- [x] `test/editor/nodes/image-node-view-branches.test.ts` — isolate the intentional node-view extension mock cast.
- [x] `test/editor/nodes/upload-and-toc-node.integration.test.ts` — use a valid extensions-array type in the editor factory.

## Risks & Considerations

- The changes must not replace `@tiptap/core` imports that are intentionally used for extension or command types; only the editor class passed into Vue-facing APIs should change.
- Partial fixture casts should remain local to test setup and use `unknown` as an explicit boundary; avoid `any` and do not weaken production component/composable types.
- Keep the compiler library target unchanged. Index-based last-item access avoids unrelated compatibility changes to `tsconfig.json`.
- Table coordinate mocks must preserve the existing selected-cell behavior while adding the required `inside` property.
- Existing worktree changes are unrelated and must not be reverted or reformatted.

## Test Coverage

- Existing image-upload and image node-view integration tests should continue to exercise upload errors, selection, and resize behavior with typed mock boundaries.
- Existing table tests should continue to exercise selection overlays, handle hover/drag behavior, extension options, and row/column controls.
- Existing composable tests should continue to exercise node actions, movement, cursor visibility, scrolling, floating toolbar state, and cell alignment.
- [x] Run targeted Vitest coverage for the 13 affected files, then run `npm run typecheck` as the acceptance check.
