<!-- handoff:task:1eee4574-90e9-4008-aea4-6615cbb34aa9 -->
# Implementation Plan: Optimize Reactive References

Branch: `main`
Created: 2026-07-21

## Settings

- [ ] Testing: no — explicit task setting; do not add, update, or run unit, integration, or e2e tests for this refactor.
- [ ] Logging: verbose implementation diagnostics only; do not add runtime logging that exposes editor/provider instances, DOM nodes, `VirtualElement` geometry, or event targets.
- [ ] Docs: no — no documentation checkpoint or documentation changes.

## Roadmap Linkage

Milestone: "none"
Rationale: Autonomous Handoff mode skips roadmap linkage; the work nevertheless addresses the existing reactivity-audit item in Stage 6.

## Scope and Guardrails

- [ ] Replace `ref` with `shallowRef` only where the stored value is an external or heavy object and consumers react solely to assignment of `.value`, not to mutations of nested properties.
- [ ] Preserve ordinary `ref` for scalar UI state and collection state that requires deep tracking, including booleans, strings, numbers, selection indexes, and reactive arrays such as collaborator lists.
- [ ] Keep existing shallow boundaries intact: the Tiptap editor returned by `useEditor`, `useCollab().provider`, `EditorProvider`'s overlay target, and the toolbar editor context must not regress to deep refs.
- [ ] Preserve public props, emitted events, `provide`/`inject` contracts, Floating UI placement/update behavior, template ref bindings, lifecycle cleanup, and existing development diagnostics.
- [ ] Do not alter extension behavior, styles, tests, package configuration, or unrelated working-tree changes.

## Commit Plan

- [ ] **Commit 1** (after tasks 1-3): `refactor(editor): shallow external reactive references`
- [ ] **Commit 2** (after tasks 4-5): `refactor(editor): optimize floating reference reactivity`

## Tasks

### Phase 1: Establish and apply external-object boundaries

- [x] **Task 1: Convert host and editor-adjacent external object holders to shallow references.**
  - [x] **Files:** Modify `apps/playground/src/App.vue`, `packages/editor/src/components/table/TableExtendRowColumnButtons.vue`, `packages/editor/src/nodes/image/ImageNodeView.vue`, `packages/editor/src/composables/useImageUpload.ts`, `packages/editor/src/composables/useTableSelectionRect.ts`, and `packages/editor/src/components/notion/TocSidebar.vue`.
  - [x] **Deliverable:** Change holders for replacement-only external values to `shallowRef`: the host-supplied `CollaborationOptions`, table `DragBase` instances, image resize-state object, file-input and other DOM references. Confirm each value is assigned/replaced as a whole and is never relied on for nested reactive mutation before conversion.
  - [x] **Preserve:** Keep scalar UI state and values whose nested structure is consumed reactively as `ref`; retain all template-ref names, lifecycle handling, and `watch` dependencies so DOM mount/unmount updates continue to trigger consumers.
  - [x] **Logging:** Retain existing diagnostics unchanged. Add no logs for collaboration configuration, drag objects, image resize state, files, or DOM nodes; use verbose local type/lint output only while implementing.
  - [x] **Dependencies:** None.

- [x] **Task 2: Make primitive overlay element references shallow without changing primitive contracts.**
  - [x] **Files:** Modify `packages/editor/src/components/primitives/Tooltip.vue`, `packages/editor/src/components/primitives/toolbar/Toolbar.vue`, `packages/editor/src/components/primitives/dropdown-menu/DropdownMenu.vue`, `packages/editor/src/components/primitives/dropdown-menu/DropdownMenuTrigger.vue`, `packages/editor/src/components/primitives/dropdown-menu/DropdownMenuContent.vue`, `packages/editor/src/components/primitives/dropdown-menu/dropdown-menu-context.ts`, `packages/editor/src/components/primitives/menu/Menu.vue`, `packages/editor/src/components/primitives/menu/MenuContent.vue`, `packages/editor/src/components/primitives/menu/menu-context.ts`, and `packages/editor/src/components/primitives/popover/Popover.vue`.
  - [x] **Deliverable:** Replace DOM-element `ref`s used as trigger, reference, wrapper, toolbar, and floating nodes with `shallowRef`; update internal context/interface types to accept the exact shallow-ref contract where TypeScript requires it.
  - [x] **Preserve:** Keep `open` and query state as ordinary refs. Keep `useFloating`, outside-pointer checks, hover listeners, `watch` calls, `Teleport` targets, and `FloatingPositioningWrapper`'s model contract behaviorally identical; only the proxy depth changes.
  - [x] **Logging:** Add no runtime logs. Do not log overlay references, coordinates, pointer events, or keyboard events; retain local verbose diagnostics from type checking/linting only.
  - [x] **Dependencies:** Task 1 establishes the replacement-only criterion.

### Phase 2: Optimize Floating UI and component-instance holders

- [x] **Task 3: Convert Floating UI DOM and virtual-reference holders to shallow refs.**
  - [x] **Files:** Modify `packages/editor/src/components/ui/FloatingElement.vue`, `packages/editor/src/components/ui/SuggestionMenu.vue`, `packages/editor/src/components/table/TableSelectionOverlay.vue`, `packages/editor/src/composables/useTableHandlePositioning.ts`, `packages/editor/src/components/table/TableHandleControl.vue`, and any directly affected `Ref`/`ShallowRef` type declarations.
  - [x] **Deliverable:** Store `HTMLElement` floating targets and stable Floating UI `VirtualElement` objects in `shallowRef`; align the exported positioning contract with the new type only where necessary. Keep reactive sources that provide changing rectangles (`computed` and `watch`) intact so `update()` still runs when selection, table geometry, drag state, or mount state changes.
  - [x] **Preserve:** Do not recreate virtual references on every update, change middleware, alter placement/style merging, or modify table selection/resize semantics. `SuggestionMenu`'s computed virtual reference remains computed unless an audited nested-reactivity requirement proves otherwise.
  - [x] **Logging:** Add no runtime logs and never emit DOM nodes, virtual rectangles, floating styles, or selection coordinates. Use verbose local compiler/linter diagnostics only.
  - [x] **Dependencies:** Task 2 proves the primitive `useFloating` and context typing pattern.

- [x] **Task 4: Convert remaining replacement-only Vue component and menu element refs.**
  - [x] **Files:** Modify `packages/editor/src/components/ui/ColorPopoverPanel.vue`, `packages/editor/src/components/ui/EmojiMenuItem.vue`, `packages/editor/src/components/ui/MentionMenuItem.vue`, `packages/editor/src/components/ui/SlashMenuItem.vue`, `packages/editor/src/components/ui/MobileToolbar.vue`, and `packages/editor/src/components/ui/SuggestionMenu.vue`.
  - [x] **Deliverable:** Change `ComponentPublicInstance` and menu `HTMLElement` holders to `shallowRef` when their only purpose is imperative focus/scroll/position access after assigning the instance. Keep reactive menu visibility, query, selected-index, and item-data state unchanged.
  - [x] **Preserve:** Maintain exposed component APIs, focus restoration, keyboard navigation, selection behavior, template ref callbacks, and all null/mount guards. Do not convert refs merely because they are typed as an object if nested reactive reads are required.
  - [x] **Logging:** Add no runtime logging of component instances, focus targets, queries, or menu items; retain existing logging behavior and use verbose local diagnostics only.
  - [x] **Dependencies:** Tasks 1-3.

### Phase 3: Validate the bounded refactor

- [x] **Task 5: Perform a final source audit and static validation without test work.**
  - [x] **Files:** Review all files changed in Tasks 1-4 plus `packages/editor/src/components/notion/EditorProvider.vue`, `packages/editor/src/composables/useCollab.ts`, and `packages/editor/src/composables/useTiptapEditor.ts`; modify only to correct type or reactivity-contract issues introduced by this plan.
  - [x] **Deliverable:** Re-run the targeted `ref`/`shallowRef` inventory and confirm that external-object holders use shallow refs while scalar and deep-reactive state remains `ref`. Confirm editor/provider boundaries are still shallow and that no public API, lifecycle cleanup, or Floating UI behavior was broadened.
  - [x] **Validation:** Run `npm run typecheck`, then run ESLint only for the files changed by this refactor. Do not add, modify, or execute test files/commands because `Testing: no` is an explicit task constraint.
  - [x] **Logging:** Treat compiler and linter output as verbose local diagnostics. Do not add application runtime logs or print object/DOM/geometry details.
  - [x] **Dependencies:** Tasks 1-4.

## Completion Criteria

- [x] All audited external object, DOM, component-instance, and stable Floating UI virtual-reference holders use `shallowRef` only where assignment-level reactivity is sufficient.
- [x] Scalar and nested-reactive application state remains on `ref`; no behavior relies on accidentally removed deep tracking.
- [x] Tiptap editor and collaboration provider retain their existing shallow reactive boundaries.
- [x] Floating overlays, menu focus/navigation, table controls, image resizing, and lifecycle cleanup preserve their prior behavior and public contracts.
- [x] `npm run typecheck` and ESLint for changed files pass; no tests or documentation changes are introduced.

## Out of Scope

- [ ] Rewriting `computed`/`watch` logic, adding watch options, or changing lifecycle subscriptions.
- [ ] Modifying Tiptap extensions, ProseMirror state, collaboration transport behavior, overlay styles, or public package APIs.
- [ ] Test coverage, documentation, roadmap updates, dependency upgrades, and cleanup of unrelated working-tree changes.
