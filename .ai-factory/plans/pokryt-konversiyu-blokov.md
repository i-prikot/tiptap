<!-- handoff:task:17ac0dc4-6aa9-431d-97fc-d0b6bc39bf88 -->
# Implementation Plan: Покрыть конверсию блоков

Branch: main
Created: 2026-07-11

## Settings
- [x] Testing: no additional test scope; the requested deliverable itself is the focused Vitest unit coverage described below. Run only the two new targeted suites while implementing.
- [x] Logging: use verbose Vitest assertion output for diagnostics; add no runtime application logging. The tests and minimal toggle correction remain log-free.
- [x] Docs: no user-facing or project-documentation changes.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff default; the work directly addresses the unchecked block-conversion test item in "Этап 2. Тестирование: фундамент".

## Current State
- [x] `src/editor/composables/blocks/block-conversion.ts` centralizes selection normalization, `clearNodes()`, the caller-supplied conversion chain, final textblock selection, and a catch-all `false` result.
- [x] `src/editor/composables/blocks/useBlockConversions.ts` exposes capability predicates and Vue composables for text, six heading levels, three list types, blockquotes, and code blocks.
- [x] Vitest runs in `happy-dom` with a shared `test/setup.ts`; the current test convention stores source tests under `test/editor/...` and imports source modules by relative path.
- [x] A realistic editor fixture must register `StarterKit`, `TaskList`, and nested `TaskItem`, matching the extensions configured by `src/editor/components/notion/EditorProvider.vue`.
- [x] The working tree already contains unrelated source, tooling, test, and `.ai-factory` edits. Do not modify, stage, revert, or include them in this task.

## Scope
- [x] Add deterministic unit tests; do not change `src/editor/composables/blocks/block-conversion.ts`, editor UI components, extensions, or documentation. A minimal correction in `src/editor/composables/blocks/useBlockConversions.ts` is required because the new regression test exposes a failed active-code-block-to-paragraph conversion.
- [x] Verify supported conversions with real Tiptap editor state and narrowly scoped mocks only for otherwise unreachable failure branches.
- [x] Cover denied/invalid paths explicitly: absent or read-only editor, unsupported schema/selection, selected image, missing convertible-node position, and an exception while running a conversion chain.
- [x] Preserve document text and assert the final node/selection state rather than asserting private Tiptap implementation details.

## Tasks

### Phase 1: Shared Test Harness
- [x] Task 1: Create stable Tiptap and Vue lifecycle fixtures for block-conversion suites.
  - [x] Deliverable: create `test/editor/composables/blocks/block-conversion.test.ts` and `test/editor/composables/blocks/useBlockConversions.test.ts`, with local helpers shared only where the existing test layout permits without creating production helpers.
  - [x] Expected behavior: create editable and read-only `@tiptap/core` editors with `StarterKit`, `TaskList`, and `TaskItem.configure({ nested: true })`; supply paragraph, heading, list, task-list, blockquote, code-block, and image-selection documents.
  - [x] Expected behavior: provide helpers to set text/node selections, inspect the converted top-level block and its text, emit `selectionUpdate`, and always destroy editors and Vue `effectScope`s after each case.
  - [x] Files: `test/editor/composables/blocks/block-conversion.test.ts`, `test/editor/composables/blocks/useBlockConversions.test.ts`.
  - [x] Dependency notes: Tasks 2–4 use these fixtures; keep them local and deterministic so suites remain independent under Vitest's serialized worker configuration.
  - [x] Logging requirements: add no runtime logs. Give fixtures and test cases domain-specific names; preserve the exact failing assertion and targeted Vitest command in implementation evidence.

### Phase 2: Core Conversion Helper
- [x] Task 2: Cover `convertSelectedBlock()` selection normalization, successful application, and caught failures.
  - [x] Deliverable: add focused tests in `test/editor/composables/blocks/block-conversion.test.ts` for `CONVERTIBLE_TYPES` and the public behavior of `convertSelectedBlock()`.
  - [x] Expected behavior: from a text selection inside exactly one supported block, prove the helper locates and selects the block, clears nested wrappers when necessary, applies the supplied chain, retains the text content, and finishes with the caret at the converted textblock end.
  - [x] Expected behavior: prove an existing `NodeSelection` is converted without relying on the lookup path, and validate representative supported targets (heading, list, blockquote, and code block) rather than testing the same chain mechanics repeatedly.
  - [x] Expected behavior: mock the imported position lookup to return no valid position and force a chained command to throw; both paths must return `false` without leaking an exception or corrupting the source document.
  - [x] Files: `test/editor/composables/blocks/block-conversion.test.ts`.
  - [x] Dependency notes: depends on Task 1; Task 4 relies on this helper's behavior and must not duplicate its internal-selection assertions.
  - [x] Logging requirements: add no runtime logs. Use separate named cases for lookup failure and command failure so Vitest output identifies the failed recovery contract.

### Phase 3: Capability and Reactive API Contracts
- [x] Task 3: Test capability predicates, exported metadata, and reactive state of every conversion composable.
  - [x] Deliverable: add parameterized tests in `test/editor/composables/blocks/useBlockConversions.test.ts` for `canToggleText`, `canToggleHeading`, `canToggleList`, `canToggleBlockquote`, `canToggleCodeBlock`, and all five `use*Block` factories.
  - [x] Expected behavior: verify labels, shortcuts, and icon mappings for text, heading levels 1–6, bullet/ordered/task lists, blockquote, and code block; verify `isActive` and `canToggle` recompute after a `selectionUpdate` in a Vue scope.
  - [x] Expected behavior: verify `turnInto: false` uses the target command's direct availability, while normal conversion requires a selection wholly within `CONVERTIBLE_TYPES` and permits the documented `clearNodes()` fallback.
  - [x] Expected behavior: return `false` for a missing editor, a read-only editor where applicable, a schema missing the requested node, an image `NodeSelection`, an unsupported selected block, and an unknown list type reached at runtime.
  - [x] Files: `test/editor/composables/blocks/useBlockConversions.test.ts`.
  - [x] Dependency notes: depends on Task 1; guard coverage establishes the preconditions used by Task 4's `handleToggle()` scenarios.
  - [x] Logging requirements: add no runtime logs. Name parameterized cases with the target block and rejected precondition, making failures actionable in verbose Vitest output.

### Phase 4: User-Facing Toggle Results
- [x] Task 4: Verify every `handleToggle()` performs its supported forward and reverse conversion and refuses invalid calls.
  - [x] Deliverable: complete `test/editor/composables/blocks/useBlockConversions.test.ts` with real-editor tests for `useTextBlock`, `useHeadingBlock`, `useListBlock`, `useBlockquoteBlock`, and `useCodeBlockBlock`.
  - [x] Expected behavior: assert text-to-paragraph, paragraph-to-heading and matching-heading-to-paragraph, each list type's creation and active-list lift, blockquote wrapping/lifting, and code-block toggling against the correct `paragraph` fallback.
  - [x] Expected behavior: for each successful family, preserve the original text and return `true`; cover a representative caret-at-end assertion through the shared helper rather than duplicating core-helper tests for every target.
  - [x] Expected behavior: for null, non-editable, or non-toggleable inputs, `handleToggle()` returns `false` and leaves the document unchanged.
  - [x] Files: `test/editor/composables/blocks/useBlockConversions.test.ts`.
  - [x] Dependency notes: depends on Tasks 2 and 3; it validates public user-triggered behavior, while Task 2 owns internal chain failure coverage.
  - [x] Logging requirements: add no runtime logs. Keep each forward/reverse pair in a clearly named test or parameter row so a failed conversion identifies its source and target block types.

## Validation
- [x] Run `npm test -- test/editor/composables/blocks/block-conversion.test.ts test/editor/composables/blocks/useBlockConversions.test.ts` after the new suites are complete.
- [x] Record the targeted command and observed result in the implementation handoff; no broad test, coverage, lint, or documentation work is in scope. The regression test justifies the minimal code-block toggle correction above.
