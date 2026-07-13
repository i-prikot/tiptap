<!-- handoff:task:84c740ae-4d71-4cce-aaf9-bdebc5ada948 -->
# Implementation Plan: Cover `selection-utils` and `trigger-utils`

Branch: main
Created: 2026-07-11

## Settings
- [ ] Testing: no additional test scope beyond the requested focused unit suites; the deliverable is the two new Vitest test files.
- [ ] Logging: verbose test-run diagnostics while implementing; add no runtime application logging because this is a test-only change.
- [ ] Docs: no user-facing or project-documentation changes.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff default; this work advances the unchecked `selection-utils.ts` / `trigger-utils.ts` unit-test item in "Этап 2. Тестирование: фундамент".

## Current State
- [x] Vitest runs in `happy-dom` through `vitest.config.ts`, and `test/setup.ts` restores Vitest mocks after each test.
- [x] Nearby utility specs use manually assembled ProseMirror `Schema`/`EditorState` fixtures and narrow `Editor` casts instead of mounting the full editor.
- [x] `src/editor/utils/selection-utils.ts` has no focused unit spec and exposes selection validation, DOM-rect, node-name, document-content, overflow, and position helpers.
- [x] `src/editor/utils/trigger-utils.ts` has no focused unit spec; its public emoji, mention, and slash wrappers share one insertion path and depend on `findNodePosition` and editor command/chain boundaries.

## Tasks

### Phase 1: Selection utility coverage
- [x] **Task 1: Add focused selection utility tests** in `test/editor/utils/selection-utils.test.ts`.
  - [x] Build local ProseMirror fixtures with paragraph, code block, image-like node, and table nodes, plus minimal typed editor/view mocks where DOM access is the unit boundary.
  - [x] Cover `getSelectionBoundingRect` for a node selection with a DOM node rectangle and a non-node selection delegated to `posToDOMRect`; restore mocks after each case.
  - [x] Cover `isSelectionValid` and `isTextSelectionValid` for missing editor, empty and whitespace-only text selections, normal text selection, code-block text/node selections, configured excluded node types, and `CellSelection`.
  - [x] Cover pure selection helpers: removal of empty paragraphs while retaining non-text/meaningful content, all four overflow outcomes, known/fallback node display names, content above the cursor, selected text with separators/null characters, and `findSelectionPosition` precedence (`nodePos`, matching node, empty-cursor block fallback, and unsupported selections).
  - [x] **Logging requirements:** add no production logging; use descriptive `describe`/`it` names and assertion messages that identify selection state and expected result, leaving Vitest's default failure output as verbose diagnostics.

### Phase 2: Trigger insertion coverage
- [x] **Task 2: Add focused trigger utility tests** in `test/editor/utils/trigger-utils.test.ts`.
  - [x] Create reusable typed editor harnesses for text and non-text block selections, recording chain calls, dispatched transactions, focus positions, and run results without relying on component mounting.
  - [x] Verify all public wrappers (`addEmojiTrigger`, `addMentionTrigger`, `addSlashTrigger`) accept their default and custom trigger values and use the shared behavior.
  - [x] Verify guard behavior returns `false` without mutations for a missing editor, non-editable editor, and selected image node; also cover a thrown insertion boundary returning `false`.
  - [x] Verify inline insertion at the cursor, including insertion of a leading space only when preceding text is not a space, plus explicit target-node/node-position handling for empty and non-empty paragraphs, correct transaction insertion positions, and focus positions.
  - [x] Verify non-text block insertion creates a new paragraph through the chain API, reuses an empty target paragraph when applicable, returns `false` when a requested node cannot be resolved, and preserves the `chain().run()` boolean result.
  - [x] **Logging requirements:** add no production logging; name fixtures and cases after the trigger path (`inline`, `paragraph`, `guard`, `unresolved`) so failing assertions expose the command boundary and position under test.

### Phase 3: Focused verification
- [x] **Task 3: Run and stabilize only the new unit suites** with `npm test -- test/editor/utils/selection-utils.test.ts test/editor/utils/trigger-utils.test.ts`.
  - [x] Resolve only failures caused by the new fixtures, mock restoration, TypeScript typing, or assertions; do not change utility runtime behavior or unrelated test infrastructure.
  - [x] Confirm both suites are deterministic under the configured single-worker `happy-dom` environment and leave no leaked DOM nodes, spies, or global stubs.
  - [x] **Logging requirements:** retain the exact Vitest command/output for diagnosis; do not introduce application logging or snapshot output.

## Completion Criteria
- [x] `test/editor/utils/selection-utils.test.ts` covers each exported helper and its material null, selection-type, DOM, and boundary branches.
- [x] `test/editor/utils/trigger-utils.test.ts` covers public trigger wrappers, guard exits, inline and paragraph insertion paths, explicit target positioning, unresolved targets, and caught failures.
- [x] The focused Vitest command passes without modifying `src/editor/utils/selection-utils.ts`, `src/editor/utils/trigger-utils.ts`, documentation, or unrelated tests.

## Implementation Notes
- [x] Reuse the lightweight `Schema`/`EditorState` approach established in `test/editor/utils/table-utils.test.ts` and `test/editor/utils/toc-utils.test.ts`.
- [x] Keep test setup self-contained in each new spec unless an existing helper is already directly reusable; do not create shared fixture infrastructure solely for these two suites.
- [x] Mock `@tiptap/core` DOM helpers only at the boundary needed to test delegation, and exercise actual ProseMirror selections/transactions for selection and trigger semantics wherever feasible.

## Final Commit
- [ ] `test: cover selection and trigger utilities`
