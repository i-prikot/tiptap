<!-- handoff:task:4cafbee3-393b-42e1-af4f-ae0f2ae6c838 -->
# Implementation Plan: Cover Custom Tiptap Extensions

Branch: main
Created: 2026-07-11

## Settings
- [x] Testing: no additional test scope beyond the requested focused Vitest unit suites; the implementation deliverable itself is the new test coverage.
- [x] Logging: verbose test-run diagnostics during implementation; add no runtime application logging because this is a test-only change.
- [x] Docs: no user-facing or project-documentation changes.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff default; this work advances the existing test-coverage foundation without changing product behavior.

## Current State
- [x] Vitest is configured with `happy-dom` in `vitest.config.ts`; `test/setup.ts` restores Vitest mocks and configures Vue Test Utils cleanup.
- [x] Existing unit tests are kept under `test/editor/**`, use direct Vitest imports, and build focused ProseMirror/Tiptap harnesses instead of mounting the full editor UI.
- [x] `Indent`, `ListNormalization`, `NodeBackground`, and `NodeAlignment` are registered by `src/editor/components/notion/EditorProvider.vue`; their public commands are declared in `src/editor/types/tiptap-augmentations.d.ts`.
- [x] `Indent` owns global `indent` attributes, commands, keyboard handling, and a drop-normalization plugin; `ListNormalization` owns a Backspace-only list-joining shortcut.
- [x] `NodeBackground` and `NodeAlignment` own global attributes plus set/unset/toggle commands over selected supported nodes.
- [x] The working tree already contains unrelated edits and test additions. Do not modify, stage, revert, or fold them into this task.

## Scope
- [x] Add a reusable, test-only Tiptap/ProseMirror fixture and four focused Vitest suites under `test/editor/extensions/`.
- [x] Assert public extension behavior through real editor commands, keyboard shortcuts, document JSON/HTML, and transaction results.
- [x] Cover valid paths, documented boundaries, and no-op/rejection paths for each requested custom extension.
- [x] Preserve the four production extensions, editor registration, Tiptap typings, Vitest configuration, package scripts, documentation, and unrelated worktree changes.

## Tasks

### Phase 1: Shared Extension Test Harness
- [x] Task 1: Add a minimal, reusable fixture for custom-extension unit tests.
  - [x] Deliverable: create `test/editor/extensions/extension-test-utils.ts` with helpers that instantiate and destroy a real Tiptap `Editor` in `happy-dom`, configure `StarterKit` plus only the list/table extensions required by a case, set document content and selections, and expose stable document/selection assertions.
  - [x] Expected behavior: each test receives an isolated editor and host element; cleanup destroys editors, removes hosts, and restores any spies so plugin state, DOM state, and command mocks cannot leak to the next suite.
  - [x] Expected behavior: helpers support paragraph/heading/blockquote content, bullet/ordered/task lists, and table-cell selections needed for the requested command and shortcut coverage without importing `EditorProvider.vue` or application cloud/UI dependencies.
  - [x] Files: `test/editor/extensions/extension-test-utils.ts`.
  - [x] Dependency notes: establish this harness before all four extension suites; keep helpers test-only and avoid edits to `test/setup.ts` unless a demonstrable framework-level gap blocks cleanup.
  - [x] Logging requirements: add no runtime logs. Use named fixtures and explicit assertion helpers so failing Vitest output identifies the selected node, key command, or serialized attribute being exercised.

### Phase 2: Indentation and List-Normalization Coverage
- [x] Task 2: Cover `Indent` attributes, commands, keyboard behavior, and drop normalization.
  - [x] Deliverable: create `test/editor/extensions/indent.test.ts` using the shared harness and the real `Indent` extension.
  - [x] Expected behavior: verify `indent`, `outdent`, `setIndent`, and `unsetIndent` update only selected supported blocks; clamp levels to configured `minLevel`/`maxLevel`; and return `false` when the selection has no eligible node or an operation would make no change.
  - [x] Expected behavior: verify parsing accepts `data-indent` first, then positive `margin-left`, `padding-left`, or `text-indent`; converts by `indentUnit`; clamps malformed/out-of-range input appropriately; and renders `data-indent` plus the CSS variable, including the configured direct `margin-left` mode.
  - [x] Expected behavior: verify `Tab` and `Shift-Tab` call indent/outdent for eligible blocks and list items, do not intercept table-cell navigation, and preserve the non-handled result for unsupported contexts.
  - [x] Expected behavior: verify Enter outdents only an empty indented supported block, Backspace outdents only at the beginning of an indented supported block, and neither automatic path runs for list items, non-empty/mid-text cursors, range selections, or zero indentation.
  - [x] Expected behavior: dispatch a transaction marked as a drop and assert moved supported blocks adopt the adjacent block's indent while unrelated node types and already-matching values remain untouched.
  - [x] Files: `test/editor/extensions/indent.test.ts`.
  - [x] Dependency notes: depends on Task 1. Exercise the public command/shortcut API and observable document state rather than exporting private helpers from `src/editor/extensions/indent.ts`.
  - [x] Logging requirements: add no runtime logs. Use scenario-specific test names for command bounds, key handling, automatic outdent, and drop metadata so focused Vitest failures are immediately diagnosable.

- [x] Task 3: Cover the Backspace-driven list normalization contract.
  - [x] Deliverable: create `test/editor/extensions/list-normalization.test.ts` using the shared harness and the real `ListNormalization` extension.
  - [x] Expected behavior: for bullet, ordered, and task lists of the same type separated by an empty top-level paragraph, invoke Backspace at the paragraph start, remove the separator, join the lists, and place the cursor at the end of the last item from the leading list.
  - [x] Expected behavior: assert the shortcut returns `false` and leaves document/selection unchanged for non-empty paragraphs, a cursor away from the start, range selections, separators at a container edge, different list types, and non-list neighbors.
  - [x] Expected behavior: preserve ordered-list and task-list node structure/attributes while joining; do not replace content with a simplified JSON fixture that bypasses ProseMirror's join behavior.
  - [x] Files: `test/editor/extensions/list-normalization.test.ts`.
  - [x] Dependency notes: depends on Task 1; keep this suite independent of `Indent` so failure localization remains confined to the list-normalization extension.
  - [x] Logging requirements: add no runtime logs. Describe each accepted/rejected cursor context in the test name and assert both return value and final editor state for useful Vitest diagnostics.

### Phase 3: Node Background and Alignment Coverage
- [x] Task 4: Cover background-color attributes and commands across supported selected nodes.
  - [x] Deliverable: create `test/editor/extensions/node-background.test.ts` using the shared harness and the real `NodeBackground` extension.
  - [x] Expected behavior: verify `backgroundColor` parses style values with data-attribute fallback and serializes style output by default, then serializes `data-background-color` when configured with `useStyle: false`; empty values must render no attribute.
  - [x] Expected behavior: verify `setNodeBackgroundColor`, `unsetNodeBackgroundColor`, and `toggleNodeBackgroundColor` update selected supported nodes, preserve unrelated attributes, and report no change for selections with no supported nodes or an already-equal set/unset value.
  - [x] Expected behavior: verify toggling a mixed selection first applies the requested color to every selected node, while toggling an all-equal selection clears the color from every selected node; include a table-cell selection or equivalent supported non-text block in addition to paragraphs.
  - [x] Files: `test/editor/extensions/node-background.test.ts`.
  - [x] Dependency notes: depends on Task 1. Assert command return values and document attributes through the editor instead of coupling tests to the internal `toggleValue` helper.
  - [x] Logging requirements: add no runtime logs. Name cases by serialization mode, selected-node mix, and command transition so a failing color assertion identifies the exact state transition.

- [x] Task 5: Cover text/vertical node alignment attributes and command interactions.
  - [x] Deliverable: create `test/editor/extensions/node-alignment.test.ts` using the shared harness and the real `NodeAlignment` extension.
  - [x] Expected behavior: verify text and vertical alignment parse valid style values first, fall back to the corresponding data attributes, reject unsupported values, and render either styles or data attributes according to `useStyle`.
  - [x] Expected behavior: verify each text and vertical set/unset/toggle command accepts only configured values, updates selected supported nodes, preserves the other alignment dimension, clears an all-equal toggle selection, and applies a requested value to mixed selections.
  - [x] Expected behavior: verify `setNodeAlignment` applies either supplied valid dimension or both together without clearing an omitted dimension; verify `unsetNodeAlignment` clears both dimensions only when at least one is set; and verify commands return `false` for selections with no eligible nodes or invalid/no-op inputs.
  - [x] Files: `test/editor/extensions/node-alignment.test.ts`.
  - [x] Dependency notes: depends on Task 1. Keep text-align and vertical-align assertions separate enough to expose regressions in either attribute path.
  - [x] Logging requirements: add no runtime logs. Use descriptive test names that state the starting mixed/equal state and expected text/vertical attribute outcome.

### Phase 4: Focused Verification and Patch Isolation
- [x] Task 6: Run the four focused suites, type-check the test additions, and validate the rework's invalid-alignment guard.
  - [x] Deliverable: run `npm test -- --run test/editor/extensions/indent.test.ts test/editor/extensions/list-normalization.test.ts test/editor/extensions/node-background.test.ts test/editor/extensions/node-alignment.test.ts`, `npm run typecheck`, targeted Prettier/ESLint, and scoped whitespace checks before handoff.
  - [x] Expected behavior: all focused tests pass in the configured `happy-dom` environment; no editors/DOM fixtures/spies leak between cases; targeted formatting, lint, and scoped whitespace validation pass.
  - [ ] Environment gate: `npm run typecheck` is blocked by unrelated errors in `test/editor/composables/blocks/block-conversion.test.ts` and `test/editor/composables/blocks/useBlockConversions.test.ts`; repository-wide `git diff --check` is blocked by unrelated whitespace changes in pre-existing worktree files.
  - [x] Rework record: finding `0c85259f81d8` exposed that unsupported individual set/toggle values resolved to `null`, clearing existing alignment attributes and returning `true`. `NodeAlignment` now uses `undefined` to reject invalid values and reserves `null` for explicit unset commands.
  - [x] Rework record: finding `721ab314d24d` added valid `toggleNodeTextAlign('center')` clear/reapply assertions that preserve vertical alignment, plus table-cell mixed `toggleNodeVAlign('middle')` set/clear assertions.
  - [x] Rework record: findings `5b0f4c581874` and `3650ac1220ba` added list-normalization no-op guards, list-item `Tab`/`Shift-Tab` nesting/lifting assertions, and invalid-style fallback to valid alignment `data-*` values.
  - [x] Rework record: findings `6ba9b32ce64e` and `bca116e7618c` select the separator paragraph at occurrence `1` for non-empty, nonzero-offset, and differing-list-type cases. The shared shortcut helper now supplies the real editor context, allowing the `Indent` `Tab` handler to assert `false` and preserve selection inside table cells without conflating it with table navigation's DOM event handling.
  - [x] Rework record: finding `6166d42335ec` replaces the nonzero-offset list-normalization fixture's empty separator with a non-empty paragraph, so `cursorOffset: 1` remains inside separator text while preserving document and selection no-op assertions.
  - [x] Files: `src/editor/extensions/node-alignment.ts`, `test/editor/extensions/extension-test-utils.ts`, `test/editor/extensions/indent.test.ts`, `test/editor/extensions/list-normalization.test.ts`, `test/editor/extensions/node-background.test.ts`, `test/editor/extensions/node-alignment.test.ts`.
  - [x] Dependency notes: depends on Tasks 1–5. The rework adds only the minimal source guard required by the new regression assertions; focused RED/GREEN evidence is retained in the implementation handoff.
  - [x] Logging requirements: add no runtime logs. Preserve focused command output as implementation diagnostics and explicitly identify any unrelated pre-existing worktree changes left untouched.

## Commit Plan
- [ ] Checkpoint 1 (after Tasks 1–3): `test(editor): cover indent and list normalization extensions`
- [ ] Checkpoint 2 (after Tasks 4–6): `test(editor): cover background and alignment extensions`

## Acceptance Criteria
- [x] `test/editor/extensions/extension-test-utils.ts` provides isolated, cleanup-safe Tiptap/ProseMirror fixtures without loading the production editor component.
- [x] `test/editor/extensions/indent.test.ts` covers commands, attribute parsing/rendering, keyboard guard paths, automatic outdent, and drop indent normalization.
- [x] `test/editor/extensions/list-normalization.test.ts` covers joining matching bullet/ordered/task lists plus all no-op guards and cursor preservation.
- [x] `test/editor/extensions/node-background.test.ts` covers style/data serialization, set/unset/toggle semantics, mixed selections, and supported table/block nodes.
- [x] `test/editor/extensions/node-alignment.test.ts` covers both alignment attributes, valid/invalid values, individual and combined set/unset/toggle behavior, and mixed selections.
- [ ] The focused Vitest command, `npm run typecheck`, and repository-wide `git diff --check` pass. The focused test command passes, while the latter two gates remain blocked by unrelated worktree errors/whitespace changes.

## Out of Scope
- [x] Changes to production extensions other than the minimal `src/editor/extensions/node-alignment.ts` invalid-value guard required by the rework.
- [x] Changes to `src/editor/components/notion/EditorProvider.vue`, `src/editor/types/tiptap-augmentations.d.ts`, `vitest.config.ts`, `test/setup.ts`, package scripts, CI, or browser/e2e test coverage.
- [x] Tests for other extensions, Vue UI controls, composables, collaboration, upload behavior, table-handle behavior, or editor integration flows outside the four requested extensions.
- [x] Documentation, roadmap, dependency, branch, commit, or Handoff-MCP synchronization changes.
