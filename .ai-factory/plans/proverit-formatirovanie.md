<!-- handoff:task:1cd8ca1f-8bc1-44c2-ac50-1fa93546f124 -->
# Implementation Plan: Verify Text Formatting

**Created:** 2026-07-13
**Branch:** `main`
**Mode:** Fast / autonomous Handoff

## Settings

- [ ] **Testing:** No additional test scope — the requested deliverable itself is the integration-test suite.
- [ ] **Logging:** Verbose test diagnostics through descriptive test names and assertion messages; do not add runtime logging or mock `console` output without a behavior-specific need.
- [ ] **Docs:** No documentation changes.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** Explicitly skipped for this focused test-only task.

## Goal

Add UI integration coverage proving that the editor formatting controls work against a live Tiptap document: bold and italic can each be enabled and removed, a selected highlight color can be applied and cleared, and a link can be created from the popover and removed again.

## Scope and Constraints

- [ ] Add the suite at `test/editor/components/ui/text-formatting.integration.test.ts`; do not modify application source unless a test exposes a narrowly scoped formatting defect.
- [ ] Mount real `MarkButton`, `ColorHighlightButton`/`ColorHighlightPopoverContent`, and `LinkPopover` controls against a real `@tiptap/vue-3` `Editor`, rather than mocking editor chains or composables.
- [ ] Configure the test editor with `StarterKit` and the project highlight extension/options needed for colored marks, keeping link behavior aligned with `src/editor/components/notion/EditorProvider.vue` (`openOnClick: false`).
- [ ] Use explicit text selections before every command and assert the editor’s structured mark state/attributes, not only component active-state attributes or serialized HTML.
- [ ] Account for the deferred `toggleHighlight` command in `src/editor/composables/useColorHighlight.ts` by providing a focused async-settle helper before reading the document state.
- [ ] Follow the repository lifecycle convention: attach each live editor to a DOM host, then destroy editors, unmount wrappers, remove hosts, and clear provided editor refs in `afterEach`.
- [ ] Do not change `vitest.config.ts`, `test/setup.ts`, package scripts, CI, documentation, roadmap, or unrelated working-tree files.

## Tasks

### Phase 1 — Create the Live Formatting Harness

- [x] Create `test/editor/components/ui/text-formatting.integration.test.ts` with a reusable mounted host that provides a live Tiptap editor to the formatting components.
  - [x] Deliverable: construct an editor with selectable text content, `StarterKit`, and multicolor `Highlight`; mount a small Vue host using `provideTiptapEditor` and the real formatting controls needed by the scenarios.
  - [x] Add helpers to select the complete test text, locate controls by stable accessible labels/roles, flush Vue/Tiptap updates plus the highlight timer, and inspect the active mark or its attributes at the selected range.
  - [x] Track all editors, wrappers, and DOM hosts and clean them up in `afterEach` so the suite remains isolated under the shared `happy-dom` environment.
  - [x] **Logging:** Give helpers and assertions command-specific failure messages (control absent, selection not set, expected mark/URL missing); add no application or console logging.
  - [x] **Dependencies:** none.

### Phase 2 — Cover Bold and Italic Toggle Cycles

- [x] Add live UI scenarios for enabling and disabling bold and italic in `test/editor/components/ui/text-formatting.integration.test.ts`.
  - [x] Click the real `MarkButton` configured for `bold` on a selected text range; assert the command adds the `bold` mark and exposes the active state, then click it again and assert the mark is removed and the control is inactive.
  - [x] Repeat the same complete on/off cycle for the real `MarkButton` configured for `italic`, using a fresh selection so the assertions prove each mark’s independent behavior.
  - [x] Verify the document text is retained across every toggle; do not couple these assertions to icon markup or implementation-private component state.
  - [x] **Logging:** Include expected mark name, toggle direction, and expected retained text in every assertion message; do not emit runtime logs.
  - [x] **Dependencies:** Phase 1 harness and selection helpers.

### Phase 3 — Cover Highlight Apply and Removal

- [x] Add a real highlight-color apply/remove scenario in `test/editor/components/ui/text-formatting.integration.test.ts`.
  - [x] Select the test text, invoke a real highlight color control using one deterministic palette value, settle the deferred command, and assert a `highlight` mark exists with that exact color attribute.
  - [x] Open or mount the real highlight removal control from `ColorHighlightPopoverContent`, click `Remove highlight`, and assert the highlight mark is absent while the text content remains unchanged.
  - [x] Assert the command state transitions where stable, but make the document mark/attribute assertion the behavioral source of truth.
  - [x] **Logging:** Make failures distinguish a missing color mark, an incorrect color value, and a failed removal; use test assertions only, with no production logging.
  - [x] **Dependencies:** Phase 1 harness and async-settle helper.

### Phase 4 — Cover Link Creation and Removal

- [x] Add a link lifecycle scenario in `test/editor/components/ui/text-formatting.integration.test.ts` through the real `LinkPopover` and `LinkContent` UI.
  - [x] Select text, open the link popover using its real trigger, enter a deterministic valid URL into the `Paste a link...` input, and apply it through the visible UI (button or Enter).
  - [x] Assert the selected text has an active `link` mark with the exact `href`, and that the visible text is unchanged rather than replaced by URL text.
  - [x] Reopen the link UI as required, click its `Remove link` action, and assert the `link` mark is removed while the selected text remains in the document.
  - [x] Keep link opening/navigation out of scope; the test must not call `window.open` or depend on browser navigation behavior.
  - [x] **Logging:** Label assertions with the requested URL, applied/removal action, and expected retained text; rely on Vitest output instead of console logging.
  - [x] **Dependencies:** Phase 1 harness; execute after mark/highlight scenarios so shared helpers are established first.

## Validation

- [x] Run `npm test -- test/editor/components/ui/text-formatting.integration.test.ts` and confirm the suite passes in the configured `happy-dom` environment.
- [x] Run `npm run typecheck` to verify the Vue wrapper, Tiptap editor, and helper typings.
- [x] Record targeted RED/GREEN outcomes for the new scenarios in the implementation handoff, as required by `.ai-factory/RULES.md`.

## Acceptance Criteria

- [x] The new integration suite uses a real Tiptap editor and real formatting components, not mocked command-chain calls.
- [x] Bold is demonstrably applied and removed by UI clicks without changing the selected text.
- [x] Italic is demonstrably applied and removed by UI clicks without changing the selected text.
- [x] Highlight is applied with a deterministic color and then fully removed through the real UI.
- [x] A link is applied with the expected `href` through the popover and then removed through the real UI without altering link text.
- [x] All live editors, Vue wrappers, and attached DOM nodes are cleaned after each test.

## Out of Scope

- [ ] Coverage for underline, strike, inline code, superscript, subscript, text color, node background color, keyboard shortcuts, or toolbar visibility rules.
- [ ] Link URL sanitization, opening links in a new window, empty-selection URL insertion, invalid URL behavior, or editing an existing link URL.
- [ ] Production changes to formatting composables/components unless a targeted test reveals a reproducible defect.
- [ ] Documentation, roadmap, CI, dependency, test-runner, or unrelated working-tree changes.
