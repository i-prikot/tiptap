<!-- handoff:task:4106407d-acf9-4599-a266-c145b676eb0a -->
# Implementation Plan: Verify the slash menu critical flow

Branch: main
Created: 2026-07-13

## Settings
- [x] Testing: no additional test scope; the requested deliverable is the integration test itself.
- [x] Logging: standard; do not add runtime logging solely for test coverage.
- [x] Docs: no

## Roadmap Linkage
Milestone: "Этап 2. Тестирование: фундамент (до рефакторинга и пакетизации)"
Rationale: Covers the roadmap's explicit critical slash-menu integration scenario.

## Tasks

### Phase 1: Build an integration harness
- [x] Task 1: Add `test/editor/components/ui/slash-dropdown-menu.integration.test.ts` with a real Tiptap editor mounted into `happy-dom`, the required StarterKit schema/extensions, and a Vue host that provides the editor through `provideTiptapEditor` and renders `SlashDropdownMenu`. Reuse `test/setup.ts` cleanup conventions; destroy the editor and remove its host after each test so the registered `slashDropdownMenu` plugin and teleported menu cannot leak into later cases.
  - [x] Expected behavior: the test exercises the actual `SuggestionMenu` plugin registration, `SlashDropdownMenu` filtering/rendering, keyboard navigation, and `slash-menu-items.ts` command instead of mocks of those components.
  - [x] Logging: add no production logs and no console output; label assertions with the user-visible action/state so a failing Vitest result identifies the failed editor transition.

### Phase 2: Cover the critical slash-menu flow
- [x] Task 2: In `test/editor/components/ui/slash-dropdown-menu.integration.test.ts`, simulate entering `/` at a focused empty paragraph using the real editor transaction, then await Vue/Tiptap updates and assert that the teleported element selected by `data-selector="tiptap-slash-dropdown-menu"` is open with command items and the first item selected.
  - [x] Expected behavior: typing the slash trigger opens the slash command list in the DOM; the test must not assert private component refs or call the selection callback directly.
  - [x] Logging: add no production logs and no console output; assertions must name the trigger and visible menu state to diagnose failure.

- [x] Task 3: In `test/editor/components/ui/slash-dropdown-menu.integration.test.ts`, dispatch `ArrowDown` to select the `Heading 1` item and then `Enter` through the editor DOM; assert that the menu closes, the `/` trigger is removed, and the active document block becomes a level-1 heading. Verify the selection occurred through the keyboard path rather than by invoking `onSelect` directly.
  - [x] Expected behavior: `Enter` executes the selected slash command and inserts/converts the chosen block, proving the end-to-end critical flow.
  - [x] Logging: add no production logs and no console output; use explicit assertions for keyboard selection, trigger removal, and resulting node type/attributes.

### Phase 3: Validate the focused suite
- [x] Task 4: Run `npm test -- test/editor/components/ui/slash-dropdown-menu.integration.test.ts`, then run `npm run typecheck` if the focused test passes; fix only failures caused by the new integration test or its harness.
  - [x] Expected behavior: the focused test is deterministic under the configured `happy-dom` environment and passes without altering slash-menu production behavior.
  - [x] Logging: preserve quiet test output; capture failure diagnostics through Vitest assertions rather than runtime logging.
