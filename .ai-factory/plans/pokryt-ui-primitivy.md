<!-- handoff:task:a1aeeca8-6238-4f89-a3c0-4f583ca2deaa -->
# Implementation Plan: Cover UI Primitives with Component Tests

Branch: main
Created: 2026-07-13

## Settings
- [ ] Testing: no additional application-test scope beyond the requested component test suites; the implementation deliverable itself is the new Vitest coverage.
- [ ] Logging: verbose test-run diagnostics during implementation; add no runtime application logging because this is a test-only change.
- [ ] Docs: no user-facing or project-documentation changes.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff default; this work directly advances the unchecked UI-primitives component-test item in `Этап 2. Тестирование: фундамент`.

## Current State
- [x] Vue 3 component tests run through Vitest 4, `@vue/test-utils`, and `happy-dom`; `test/setup.ts` enables automatic wrapper unmounting and mock restoration after every case.
- [x] No existing component suite mounts the primitives. The target components use `Teleport` and `@floating-ui/vue`, so test fixtures must attach wrappers to `document.body`, await Vue updates, and query teleported layers from the document.
- [x] `Button` composes `Tooltip`; `DropdownMenu` and `Menu` distribute state through typed provide/inject contexts; `Avatar` distributes image loading status to `AvatarImage` and `AvatarFallback`.
- [x] The interactive contracts to preserve are controlled/uncontrolled open state, `update:open` emissions, outside-pointer and Escape dismissal, close-on-selection options, hover timers, and avatar image/fallback transitions.
- [x] The working tree already contains unrelated changes. Do not modify, stage, revert, or fold them into this test-only task.

## Scope
- [x] Create focused `*.test.ts` component suites under `test/editor/components/primitives/` for `Button`, `Tooltip`, `Popover`, `DropdownMenu`, `Menu`, and `Avatar`.
- [x] Add only a small shared test helper for deterministic Teleport, document-event, timer, and image-loading fixtures when repeated setup would otherwise obscure component behavior.
- [x] Keep tests behavior-oriented: assert rendered accessibility/data attributes, emitted model events, and visible state changes rather than Floating UI pixel positioning or private reactive state.
- [x] Preserve application source, CSS, public component APIs, Vitest configuration, npm scripts, documentation, and coverage thresholds. If a new behavioral assertion exposes a genuine primitive defect, stop and request a separate production-fix scope rather than silently changing source code.

## Commit Plan
- [ ] **Commit 1** (after tasks 1-4): `test: cover button tooltip and popover primitives`
- [ ] **Commit 2** (after tasks 5-8): `test: cover menu and avatar primitives`

## Tasks

### Phase 1: Shared Component-Test Foundation
- [x] Task 1: Create reusable fixtures for primitive component specs.
  - [ ] Deliverable: create `test/editor/components/primitives/test-utils.ts` with minimal helpers for mounting into `document.body`, settling Vue/Teleport updates, dispatching document-level `pointerdown`/keyboard events, and controlling `window.Image` load and error callbacks.
  - [ ] Expected behavior: every suite can exercise its real Teleported content and browser-facing lifecycle without modifying `test/setup.ts`, duplicating fragile DOM boilerplate, or leaking timers/listeners/mocked image constructors into the next test.
  - [ ] Files to create: `test/editor/components/primitives/test-utils.ts`.
  - [ ] Logging requirements: add no runtime or helper console logging. Give helper functions precise names and surface failed assertions through Vitest’s normal output; retain full command output when a browser-environment incompatibility is encountered.
  - [ ] Dependency notes: none; all component suites below use this helper where it removes repeated setup.

### Phase 2: Button, Tooltip, and Popover Contracts
- [x] Task 2: Add `Button` component coverage, including its tooltip composition boundary.
  - [ ] Deliverable: create `test/editor/components/primitives/button.test.ts` that mounts `Button.vue` with representative slots, attributes, variants, sizes, tooltip text, and shortcut strings.
  - [ ] Expected behavior: verify slot content and arbitrary attributes reach the native button, caller classes are retained without being duplicated through `$attrs`, configured `data-style`/`data-size` values are exposed, and `showTooltip: false` renders no tooltip wrapper/layer. For tooltip-enabled buttons, focus must reveal the teleported label and parse/render each configured shortcut key in order.
  - [ ] Files to create: `test/editor/components/primitives/button.test.ts`.
  - [ ] Logging requirements: add no application logging. Use descriptive cases that name the forwarding, opt-out, and shortcut contract so a failed selector or assertion is immediately attributable in Vitest output.
  - [ ] Dependency notes: Task 1; keep tooltip timing assertions owned by Task 3 rather than duplicating them here.

- [x] Task 3: Add focused `Tooltip` interaction and timing coverage.
  - [ ] Deliverable: create `test/editor/components/primitives/tooltip.test.ts` using fake timers and a mounted trigger/content fixture for `Tooltip.vue`.
  - [ ] Expected behavior: verify layers are absent while closed, mouse entry opens only after the configured delay, mouse leave cancels a pending open, configured close delay is honored, focus opens immediately, focus loss closes, and open content is teleported with `role="tooltip"` while the trigger exposes the correct `data-tooltip-state`.
  - [ ] Files to create: `test/editor/components/primitives/tooltip.test.ts`.
  - [ ] Logging requirements: add no runtime logs. Restore real timers in cleanup and use timer-specific test names so timeout failures identify the affected open/close transition.
  - [ ] Dependency notes: Task 1; this owns fake-timer cleanup for tooltip behavior.

- [x] Task 4: Add `Popover` state, trigger, and dismissal coverage.
  - [ ] Deliverable: create `test/editor/components/primitives/popover.test.ts` with a host fixture using the named `trigger` slot and regular content slot.
  - [ ] Expected behavior: verify an initially closed popover opens from its trigger, emits `update:open` for open and close transitions, renders its content in the document Teleport with `data-state="open"` and the resolved side, synchronizes when the `open` prop changes, remains open for interactions inside its trigger/content, and closes on Escape or a document pointer event outside both regions.
  - [ ] Files to create: `test/editor/components/primitives/popover.test.ts`.
  - [ ] Logging requirements: add no application logs. Use explicit assertion messages/test names for controlled prop synchronization, event emission, and each dismissal boundary.
  - [ ] Dependency notes: Task 1; do not assert Floating UI coordinates, transforms, or implementation-private refs.

### Phase 3: Menu Primitive Contracts
- [x] Task 5: Add `DropdownMenu` root/trigger/content/item coverage.
  - [ ] Deliverable: create `test/editor/components/primitives/dropdown-menu.test.ts` with a composed fixture for `DropdownMenu.vue`, `DropdownMenuTrigger.vue`, `DropdownMenuContent.vue`, and `DropdownMenuItem.vue`.
  - [ ] Expected behavior: verify trigger clicks toggle open state and emit `update:open`, the teleported content exposes `role="menu"`, `data-state="open"`, and its resolved side, Escape and outside `pointerdown` close the menu, selecting a descendant with `role="menuitem"` closes it by default, and `closeOnSelect: false` keeps it open.
  - [ ] Files to create: `test/editor/components/primitives/dropdown-menu.test.ts`.
  - [ ] Logging requirements: add no runtime logs. Name cases by interaction boundary (trigger, Escape, outside pointer, select, opt-out) and retain verbose Vitest command output for any failure.
  - [ ] Dependency notes: Task 1; cover the public composed primitive rather than unit-testing its injection context separately.

- [x] Task 6: Add `Menu` root, selection, and nested-menu lifecycle coverage.
  - [ ] Deliverable: create `test/editor/components/primitives/menu.test.ts` with root and nested `Menu.vue` fixtures composed with `MenuContent.vue` and `MenuItem.vue`.
  - [ ] Expected behavior: verify a root trigger toggles its Teleported menu, Escape/outside pointer close an open menu, a selectable terminal menu item closes the full parent chain by default, `closeOnSelect: false` preserves it, disabled items emit no selectable result/close no menu, and a submenu opens on pointer enter then uses the documented delayed-close behavior without closing its parent prematurely.
  - [ ] Files to create: `test/editor/components/primitives/menu.test.ts`.
  - [ ] Logging requirements: add no application logging. Use fake timers only for the 120 ms submenu close path, restore them after each case, and make failure output distinguish root, nested, disabled, and selection behavior.
  - [ ] Dependency notes: Task 1; Task 5 establishes the analogous dropdown dismissal pattern, but this suite must independently protect Menu’s chain-closing and hover contracts.

### Phase 4: Avatar Composition and Quality Gate
- [x] Task 7: Add `Avatar` composition coverage for image, fallback, and group behavior.
  - [ ] Deliverable: create `test/editor/components/primitives/avatar.test.ts` covering `Avatar.vue`, `AvatarImage.vue`, `AvatarFallback.vue`, and `AvatarGroup.vue` through their public composition.
  - [ ] Expected behavior: verify root size and optional user color output, image elements stay hidden before mocked preload success and appear with the requested source after load, image errors preserve fallback behavior, fallback delay prevents early rendering and reveals after its timer, a loaded image hides the fallback, and `AvatarGroup` limits visible avatars then renders an accessible `+N` fallback for hidden children.
  - [ ] Files to create: `test/editor/components/primitives/avatar.test.ts`.
  - [ ] Logging requirements: add no runtime logs. Keep mocked `Image` callbacks and fake timers local to each test, restore globals/timers deterministically, and use status-specific test names for load, error, delay, and grouping failures.
  - [ ] Dependency notes: Task 1; do not inspect provided/injected refs directly—drive status solely through mocked image events and rendered output.

- [x] Task 8: Run the focused quality gate and preserve the test-only boundary.
  - [ ] Deliverable: execute `npm run test -- test/editor/components/primitives`, `npm run typecheck`, and `npm run lint -- test/editor/components/primitives` after all suites are in place; fix only test-fixture, typing, lint, or deterministic-cleanup issues inside the new test files/helper.
  - [ ] Expected behavior: all six requested primitive suites pass without modifying `src/editor/components/primitives/**`, `test/setup.ts`, `vitest.config.ts`, documentation, or unrelated working-tree files. Record any reproducible production behavior mismatch as a blocker for a separately approved source fix.
  - [ ] Files to change: `test/editor/components/primitives/test-utils.ts`, `test/editor/components/primitives/button.test.ts`, `test/editor/components/primitives/tooltip.test.ts`, `test/editor/components/primitives/popover.test.ts`, `test/editor/components/primitives/dropdown-menu.test.ts`, `test/editor/components/primitives/menu.test.ts`, `test/editor/components/primitives/avatar.test.ts` (only if validation reveals test-local defects).
  - [ ] Logging requirements: preserve verbose command stdout/stderr for failures; do not add console logging to production or test code merely to make validation pass.
  - [ ] Dependency notes: Tasks 1-7.

## Out of Scope
- [ ] Changing implementation behavior, API contracts, styles, or Floating UI positioning logic in `src/editor/components/primitives/**`.
- [ ] Adding tests for non-target primitives, editor UI compositions, integration flows, or end-to-end scenarios.
- [ ] Changing `test/setup.ts`, `vitest.config.ts`, package dependencies/scripts, coverage thresholds, CI, the roadmap, or documentation.
- [ ] Editing or staging existing unrelated working-tree changes.
