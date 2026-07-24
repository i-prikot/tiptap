<!-- handoff:task:7ef380f7-17a3-40da-967a-8aeb71b7ac62 -->
# Implementation Plan: Test Localized UI Rendering

Branch: `main`
Created: 2026-07-23

## Settings
- [x] Testing: no additional test scope; the requested implementation is focused localization test coverage only
- [x] Logging: verbose development diagnostics only; preserve the existing `EditorI18n` locale/fallback diagnostics and add no test-only or component logging
- [x] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped for this focused regression-test task.

## Scope and Decisions
- [x] Exercise the production `provideEditorI18n()` resolver with bundled `en` and `ru` messages rather than stubbing `t()` to return a key.
- [x] Cover representative, high-value editor UI surfaces: slash-command content, table-handle actions, and color/turn-into controls.
- [x] Make every locale case assert both the expected human-readable string and the absence of every message key exercised by that component. Check rendered text plus accessible labels, placeholders, and titles where those are the output surface.
- [x] Keep existing interaction/action assertions intact; localization tests must not change editor commands, menu availability, or table-action helper arguments.
- [x] Do not add production localization keys, change catalogs, alter fallback behavior, add documentation, or broaden the test suite beyond the requested UI-rendering coverage.

## Tasks

### Phase 1: Establish locale-aware component test fixtures
- [x] **Task 1: Add a parameterized localization-rendering test harness for the editor UI.** Create a focused component test suite that mounts a small Vue host, calls `provideEditorI18n(locale, undefined)`, and exposes reusable assertions for rendered text/attributes and forbidden raw keys. Run the same cases for `en` and `ru` using explicit expected catalog values; do not derive expected output by calling `t()` in the assertion. The helper must allow component-specific mocks/stubs while keeping the i18n provider real. **Files:** create `test/editor/components/ui/localized-ui-rendering.test.ts`; import only the required components, test utilities, and `provideEditorI18n` implementation. **Dependencies:** none. **Logging:** do not add logging; preserve the production resolver's existing development-only diagnostics and never log catalog messages, raw keys, or editor content.

### Phase 2: Cover menu rendering in both locales
- [x] **Task 2: Verify slash-command, color, and turn-into UI surfaces render translated copy without raw keys.** Extend the new parameterized suite to mount the slash dropdown using the established Tiptap integration harness and trigger the slash menu, then mount representative color and turn-into menu content with the smallest existing-style dependency stubs. For each locale, assert command labels/descriptions or placeholders, color labels/accessibility text, and the turn-into heading/item labels match the concrete English or Russian catalog text. Assert the DOM contains none of the exercised `editor.*`, `menus.*`, `colors.*`, or `toolbar.*` keys. Ensure teleports and floating UI are stubbed consistently with adjacent tests and unmount/destroy editors after each case. **Files:** `test/editor/components/ui/localized-ui-rendering.test.ts`; reuse patterns from `test/editor/components/ui/slash-dropdown-menu.integration.test.ts` and `test/editor/components/ui/coverage-branch-behavior.test.ts` without changing production components. **Dependencies:** Task 1. **Logging:** add no test or UI logging; rely only on the established `EditorI18n` diagnostics and do not expose translated values, search input, or editor state in logs.

### Phase 3: Localize existing table-menu test coverage
- [x] **Task 3: Update the table-handle menu tests to use real localized rendering and retain action behavior coverage.** Replace the current `useEditorI18n()` key-echo mock with a locale-provided host or an equivalent mock that delegates to the production resolver. Parameterize visible row and column action assertions for `en` and `ru`, including header, move, insert, sort, clear, duplicate, and delete labels. Keep the current click/helper-argument expectations unchanged, and add negative DOM assertions that the exercised `table.*` message keys never render for either locale. **Files:** `test/editor/components/table-handle-menu-content.test.ts`; reuse `packages/editor/src/composables/useEditorI18n.ts` through `provideEditorI18n` rather than modifying `packages/editor/src/components/table/table-handle/TableHandleMenuContent.vue`. **Dependencies:** Task 1. **Logging:** add no logging; retain only the resolver's existing development diagnostics and do not log table selections, labels, or editor objects.

## Completion Criteria
- [x] Both `en` and `ru` assertions cover each selected UI surface with explicit expected translated output.
- [x] No tested DOM output exposes a raw key from the exercised `editor`, `menus`, `colors`, `toolbar`, or `table` namespaces.
- [x] Existing slash-menu and table-action interaction expectations remain protected alongside localization assertions.
- [x] The implementation records the focused Vitest command and its RED/GREEN result as required by `.ai-factory/RULES.md`; do not run unrelated suites.

## Validation
- Focused Vitest command: `npm test -- --run test/editor/components/ui/localized-ui-rendering.test.ts test/editor/components/table-handle-menu-content.test.ts`
- RED: Initial fixture runs exposed test-harness assumptions (slash descriptions are not rendered and the menu shell requires context); no production localization change was required.
- GREEN: 2 test files and 11 tests passed after aligning the harness to the rendered UI surfaces.
- Formatting: `npx prettier --check test/editor/components/ui/localized-ui-rendering.test.ts test/editor/components/table-handle-menu-content.test.ts` passed.
- Lint: `npx eslint test/editor/components/ui/localized-ui-rendering.test.ts test/editor/components/table-handle-menu-content.test.ts` passed.
