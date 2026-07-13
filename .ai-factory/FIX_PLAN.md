<!-- handoff:task:a74eee1e-2578-40bc-892d-39b73946ff96 -->

# Fix Plan: Resolve block conversion test editor type mismatch

**Problem:** `npm run typecheck` fails because the new block conversion tests instantiate `Editor` from `@tiptap/core`, while the composables and conversion helper intentionally accept the Vue integration's `Editor` type from `@tiptap/vue-3`.
**Created:** 2026-07-13 04:12 UTC

## Analysis

- `src/editor/composables/blocks/useBlockConversions.ts`, `block-conversion.ts`, and `useEditorSelectionSignal.ts` use `Editor` from `@tiptap/vue-3` in their public contracts.
- `test/editor/composables/blocks/block-conversion.test.ts` and `test/editor/composables/blocks/useBlockConversions.test.ts` currently import and construct `Editor` from `@tiptap/core`.
- The two editor classes are structurally incompatible: the Vue wrapper extends the core editor with Vue-specific properties such as `reactiveState`, `reactiveExtensionStorage`, `contentComponent`, and `appContext`.
- This is a test-fixture type mismatch, not a block conversion runtime defect. It produces all reported `TS2345` and `TS2322` errors through the shared factory/helper signatures.

## Fix Steps

- [x] In `test/editor/composables/blocks/block-conversion.test.ts`, import and instantiate `Editor` from `@tiptap/vue-3` so fixtures match `convertSelectedBlock`'s declared input type.
- [x] In `test/editor/composables/blocks/useBlockConversions.test.ts`, replace the core editor import with the Vue editor import so `createApi`, composable factories, and selection helpers use one compatible editor type.
- [x] Keep extension, selection, and command assertions unchanged; the test behavior should remain the same while TypeScript sees the correct Vue editor contract.
- [x] Run `npm run typecheck` to confirm all reported type incompatibilities are removed, then run the two focused Vitest files to ensure the Vue editor fixture works in the test environment.

## Files to Modify

- `test/editor/composables/blocks/block-conversion.test.ts` — align the test editor import with the helper's Vue editor contract.
- `test/editor/composables/blocks/useBlockConversions.test.ts` — align the test fixture and factory typings with the composables' Vue editor contract.

## Risks & Considerations

- Do not widen production signatures to `@tiptap/core` solely to accommodate the tests; those APIs are already intentionally typed for the Vue integration.
- Do not add runtime `[FIX]` logging: this change is type-only test-fixture alignment and has no production execution path; logging would add noise without diagnostic value.
- Confirm `@tiptap/vue-3`'s exported `Editor` can be constructed in the existing happy-dom Vitest environment, since the tests now exercise that integration class directly.

## Test Coverage

- Existing `block-conversion.test.ts` coverage continues to validate each conversion result using a type-correct Vue editor fixture.
- Existing `useBlockConversions.test.ts` coverage continues to validate metadata, reactive availability, selection updates, and conversion commands through the Vue editor contract.
- [x] Regression check: run `npm run typecheck` and both focused test files after the import changes.
