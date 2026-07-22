<!-- handoff:task:01d50387-0026-4eab-9ec9-40ef50e801d7 -->
# Implementation Plan: Audit `computed` and `watch`

Branch: `main`
Created: 2026-07-21

## Settings

- [x] Testing: no — the task explicitly excludes adding, updating, or running unit, integration, and e2e tests. This explicit task setting overrides the repository TDD default for this refactor.
- [x] Logging: verbose implementation diagnostics only. Preserve existing editor diagnostics, but add no runtime logs that expose editor/provider instances, DOM nodes, Floating UI geometry, event targets, or document content.
- [x] Docs: no — do not change README files, `docs/`, or other user-facing documentation.

## Roadmap Linkage

Milestone: "none"
Rationale: Autonomous Handoff mode skips formal linkage. The work implements the existing unchecked reactivity-audit item in Stage 6, "Vue 3: best practices".

## Audit Baseline and Guardrails

- [x] Audit scope: all 73 source files containing `computed` and all 36 source files containing `watch` or `watchEffect` under `packages/editor/src` and `apps/playground/src`.
- [x] Baseline result: `npx eslint packages/editor/src apps/playground/src --rule 'vue/no-side-effects-in-computed-properties: error' --no-ignore` currently reports no `computed` side-effect violations. Preserve that result; do not manufacture source changes for already-pure derivations.
- [x] Treat `computed` as a read-only derivation. Move any newly discovered mutation, emit, editor command, event subscription, DOM write, timer, or network action to an explicit event handler, `watch`, or `watchEffect` selected for that side effect.
- [x] Apply `immediate` only when the effect must establish state or subscribe to an editor already present during setup. Apply `flush: 'post'` only when an effect reads or writes mounted DOM/Floating UI elements; retain Vue's default scheduling for state-only watchers.
- [x] Preserve public props/emits, `provide`/`inject` contracts, Floating UI placement, editor event cleanup, and current keyboard/pointer behavior. Do not modify unrelated working-tree changes, especially `packages/editor/src/components/table/TableHandle.vue`, `packages/editor/src/components/table/TableHandleMenuContent.vue`, and `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue`.

## Commit Plan

- [ ] **Commit 1** (after Tasks 1–3): `refactor(editor): clarify reactive state derivation`
- [ ] **Commit 2** (after Tasks 4–5): `refactor(editor): schedule reactive DOM effects`

## Tasks

### Phase 1: Keep derived state pure

- [x] **Task 1: Make the no-side-effects `computed` invariant permanent and audit all derivations.**
  - [x] **Files:** Modify `eslint.config.js`; inspect every current `computed` call site in `packages/editor/src/**/*.vue`, `packages/editor/src/**/*.ts`, and `apps/playground/src/**/*.vue`.
  - [x] **Deliverable:** Enable `vue/no-side-effects-in-computed-properties` as an error for Vue SFCs. Manually review TypeScript composables that use `computed`, because the Vue rule does not cover standalone `.ts` modules; keep pure derived callbacks unchanged and extract only real mutations discovered during review into the appropriate explicit effect boundary.
  - [x] **Acceptance:** A `computed` callback returns derived data only; it neither changes refs/reactive objects nor emits events, dispatches editor transactions, mutates DOM, or installs listeners. Existing event-handler composables such as formatting and table commands remain event-driven rather than being moved into computed state.
  - [x] **Logging:** Retain current `console.warn`/`console.error` diagnostics. Add no runtime logs; use the ESLint output as the verbose implementation diagnostic.
  - [x] **Dependencies:** None.

- [x] **Task 2: Replace prop-to-local-state mirror watchers in menu primitives with controlled derived state.**
  - [x] **Files:** Modify `packages/editor/src/components/primitives/dropdown-menu/DropdownMenu.vue`, `packages/editor/src/components/primitives/menu/Menu.vue`, and `packages/editor/src/components/primitives/popover/Popover.vue`.
  - [x] **Deliverable:** Remove the `watch(() => props.open, ...)` mirrors. Model each primitive's effective `open` value with a writable `computed`: the prop is authoritative in controlled mode, while a private ref owns uncontrolled mode; its setter updates only uncontrolled state as appropriate and emits `update:open` through the existing public contract.
  - [x] **Acceptance:** Controlled consumers render the parent-provided `open` state and receive `update:open`; uncontrolled consumers still open, close, toggle, and close parent/submenu chains locally. Keep the injected `open` ref-compatible and preserve outside-click, Escape, hover-delay, and trigger behavior.
  - [x] **Logging:** Preserve existing diagnostics and add none for open state, references, or pointer events.
  - [x] **Dependencies:** Task 1 establishes the derived-state rule this refactor follows.

- [x] **Task 3: Eliminate the emit-only watcher from the Turn Into dropdown.**
  - [x] **Files:** Modify `packages/editor/src/components/ui/TurnIntoDropdown.vue`.
  - [x] **Deliverable:** Replace `watch(open, value => emit('openChange', value))` with the component's explicit open-change event path (or a writable computed binding) so the state transition and `openChange` emission occur together.
  - [x] **Acceptance:** Opening and closing through `DropdownMenu`, keyboard interaction, outside dismissal, and parent-driven state changes each emit exactly once; no watcher remains whose sole purpose is forwarding a ref value as an event.
  - [x] **Logging:** Do not log dropdown state transitions or editor selection details; retain existing diagnostics unchanged.
  - [x] **Dependencies:** Task 2 defines the controlled-open contract used by the dropdown primitive.

### Phase 2: Schedule DOM effects and establish initial subscriptions

- [x] **Task 4: Give DOM- and Floating UI-dependent effects explicit post-render scheduling and cleanup.**
  - [x] **Files:** Modify `packages/editor/src/components/primitives/dropdown-menu/DropdownMenuContent.vue`, `packages/editor/src/components/primitives/popover/Popover.vue`, `packages/editor/src/components/primitives/menu/MenuContent.vue`, `packages/editor/src/components/table/TableSelectionOverlay.vue`, and `packages/editor/src/composables/useTableHandlePositioning.ts`; inspect `packages/editor/src/components/ui/FloatingElement.vue` for the same requirement.
  - [x] **Deliverable:** Run transform-origin writes and Floating UI `update()` calls with `flush: 'post'` when they depend on rendered refs or teleported content. Consolidate `MenuContent`'s floating-element click listener into one watcher/lifecycle path that removes the listener when the element changes or the component unmounts, preventing duplicate registration.
  - [x] **Acceptance:** A newly opened, teleported, flipped, resized, or replaced floating element is positioned only after its DOM exists; CSS custom properties are applied to the current element; click handlers are attached once and removed from stale elements. Keep non-DOM state watchers on their existing/default flush mode.
  - [x] **Logging:** Add no DOM, rect, placement, or event-target logging. Preserve current Floating UI behavior and diagnostics.
  - [x] **Dependencies:** Tasks 1–3 keep derivation and state transitions separate from DOM side effects.

- [x] **Task 5: Apply `immediate` only to subscriptions and synchronizations that must run at setup.**
  - [x] **Files:** Modify `packages/editor/src/components/notion/CollabUsers.vue`; inspect and adjust only when justified in `packages/editor/src/components/notion/TocSidebar.vue`, `packages/editor/src/components/ui/LinkPopover.vue`, `packages/editor/src/components/notion/EditorContentArea.vue`, and `packages/editor/src/components/notion/EditorProvider.vue`.
  - [x] **Deliverable:** Make the collaborator transaction subscription run immediately so an editor already available during child setup is read and subscribed exactly once. For each remaining candidate, add `immediate: true` only if initial state must be applied before a future source change; leave watchers that intentionally react only to transitions unchanged.
  - [x] **Acceptance:** Initial collaborator data is shown without waiting for the next transaction; a replaced editor removes the old listener before subscribing to the new one; unmount still removes listeners. Initial TOC/link/AI/content behavior remains intentional, with no duplicate editor transaction, content, or emitted-event effects.
  - [x] **Logging:** Preserve existing `debugEditor` calls and error diagnostics. Do not log collaborators, document content, selection data, or editor instances.
  - [x] **Dependencies:** Task 4 completes the DOM scheduling decisions; this task covers state and editor lifecycle only.

### Phase 3: Static verification without tests

- [x] **Task 6: Verify the reactive refactor with static checks and targeted source review.**
  - [x] **Files:** Recheck all files changed in Tasks 1–5; no test files are created or modified.
  - [x] **Deliverable:** Run `npx eslint packages/editor/src apps/playground/src --no-ignore` and `npm run typecheck`. Re-run the `vue/no-side-effects-in-computed-properties` audit and inspect the changed watcher options to confirm that `immediate`/`flush` were added only for the documented lifecycle or DOM reasons.
  - [x] **Acceptance:** Lint and TypeScript checks pass for the changed implementation; there are no `computed` side-effect violations, no stale or duplicate floating-element listeners, and no unrelated files in the final diff. Do not run or add tests, per task settings.
  - [x] **Logging:** Record only command outcomes in the implementation handoff; do not add production logging.
  - [x] **Dependencies:** Tasks 1–5.
