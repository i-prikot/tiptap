<!-- handoff:task:2b90cf30-4948-4573-9805-f4bbff1561d8 -->
# Implementation Plan: Fix Subscription Cleanup

Branch: `main`
Created: 2026-07-21

## Settings
- [ ] Testing: no (explicitly disabled for this task)
- [ ] Logging: verbose development diagnostics; do not log high-frequency editor, DOM, or animation-frame callbacks
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped for autonomous fast planning; the work is a targeted lifecycle-safety fix within the existing Vue 3 best-practices work.

## Scope and Current Findings
- [x] Audit production source only: `packages/editor/src` and `apps/playground/src`; exclude generated and dependency directories.
- [x] The current `EditorProvider.vue` already calls `provider.off('synced', ...)` after synchronization and during `onBeforeUnmount`. Do not add a duplicate listener/removal pair. Instead, make cleanup target the exact provider instance that received `on`, so a changed prop cannot leave a listener on an earlier provider.
- [x] Current `editor.on(...)` registrations, DOM listeners, and the `useRafLoop` owner generally already use watcher cleanup or `onBeforeUnmount`; preserve those ownership patterns and correct only gaps found by the exhaustive audit.
- [x] `useCursorVisibility.ts` schedules a `requestAnimationFrame` from `ResizeObserver` without retaining its ID. Treat this as a pending lifecycle resource and cancel it during disposal.

## Tasks

### Phase 1: Fix Collaboration Provider Ownership
- [x] **Task 1: Make the `synced` listener in `EditorProvider` idempotent and bound to its registration target.**
  - [x] Files: `packages/editor/src/components/notion/EditorProvider.vue`.
  - [x] Capture the provider used by `provider.on('synced', listener)` in the initialization closure, and use that same reference for both one-shot removal in the callback and teardown removal in `onBeforeUnmount`.
  - [x] Centralize or otherwise make removal idempotent: clear `collabSyncedListener` after detaching, do not remove an unrelated replacement provider, and retain the existing `isTearingDown` guard before deferred initialization runs.
  - [x] Preserve the existing cleanup of editor `update` and `transaction` listeners, the debounced update timer, and explicit `editor.destroy()`; do not introduce a second `synced` subscription.
  - [x] Logging: use `debugEditor` only for attach/detach lifecycle checkpoints when `developmentDiagnostics` is enabled; never emit logs for every `synced` payload.
  - [x] Dependency: none.

### Phase 2: Close All Editor-Emitter Lifecycles
- [x] **Task 2: Verify and normalize ownership of every editor/provider emitter subscription across Vue components and composables.**
  - [x] Files: `packages/editor/src/components/notion/CollabUsers.vue`, `packages/editor/src/components/table/TableSelectionOverlay.vue`, `packages/editor/src/components/ui/FloatingElement.vue`, `packages/editor/src/nodes/image/ImageNodeView.vue`, `packages/editor/src/composables/useEditorSelectionSignal.ts`, `packages/editor/src/composables/useFloatingToolbarVisibility.ts`, `packages/editor/src/composables/useScrollToHash.ts`, `packages/editor/src/composables/useTableHandleState.ts`, `packages/editor/src/composables/useUiEditorState.ts`, `packages/editor/src/composables/useUndoRedo.ts`, `apps/playground/src/composables/useDemoDocumentSeed.ts`.
  - [x] For every `editor.on(...)` and `provider.on(...)`, keep one stable callback reference and pair it with the matching `off(...)` in the same watcher cleanup, `onBeforeUnmount`, or `onScopeDispose` scope.
  - [x] When a watched editor/provider instance changes, dispose the old instance before attaching the new one; do not rely solely on component unmount for listeners created inside a watcher.
  - [x] Preserve the existing `useScrollToHash` watcher `onCleanup` behavior for `provider.on('synced')`; align any corrected sites with that pattern rather than adding global listener registries.
  - [x] Logging: no new per-event logs. If a corrected lifecycle has existing diagnostics, log attach/detach once at DEBUG level behind its existing development-only switch; use ERROR only for real cleanup failures.
  - [x] Dependency: Task 1 establishes the canonical provider-listener ownership pattern.

### Phase 3: Close DOM Listener Lifecycles
- [x] **Task 3: Audit DOM event listeners and correct any listener whose exact target/callback/options are not removed with its Vue scope.**
  - [x] Files: `packages/editor/src/components/notion/TocSidebar.vue`, `packages/editor/src/components/primitives/dropdown-menu/DropdownMenuContent.vue`, `packages/editor/src/components/primitives/menu/Menu.vue`, `packages/editor/src/components/primitives/menu/MenuContent.vue`, `packages/editor/src/components/primitives/popover/Popover.vue`, `packages/editor/src/components/primitives/toolbar/Toolbar.vue`, `packages/editor/src/components/table/TableExtendRowColumnButtons.vue`, `packages/editor/src/components/table/TableSelectionOverlay.vue`, `packages/editor/src/components/ui/FloatingElement.vue`, `packages/editor/src/components/ui/NotionToolbarFloating.vue`, `packages/editor/src/composables/useCursorVisibility.ts`, `packages/editor/src/composables/useFloatingToolbarVisibility.ts`, `packages/editor/src/composables/useIsBreakpoint.ts`, `packages/editor/src/composables/useMenuNavigation.ts`, `packages/editor/src/composables/useWindowSize.ts`, `packages/editor/src/nodes/image/ImageNodeView.vue`, `packages/editor/src/utils/suggestion/positioning.ts`, `apps/playground/src/App.vue`.
  - [x] Ensure every `addEventListener` has a matching `removeEventListener` using the same target, callback, capture option, and lifecycle owner. In handlers created for a drag/open interaction, ensure the stop/close path and unmount path are both safe and idempotent.
  - [x] Keep component-local cleanup local (`onBeforeUnmount`); for composables that can be invoked outside a component, use `onScopeDispose` where required by the calling pattern.
  - [x] Retain the cleanup function returned by suggestion positioning (`autoUpdate` stop + outside-click listener removal) and do not move browser-global listeners into shared singleton state.
  - [x] Logging: do not add logging to pointer, scroll, resize, keydown, or mousemove paths. Use one DEBUG lifecycle message only where an existing diagnostics facility already exists.
  - [x] Dependency: none; can be implemented in parallel with Task 2 after Task 1's provider convention is agreed.

### Phase 4: Dispose Animation-Frame Work
- [x] **Task 4: Guarantee that repeating and pending `requestAnimationFrame` work cannot survive component disposal.**
  - [x] Files: `packages/editor/src/composables/useRafLoop.ts`, `packages/editor/src/components/table/TableSelectionOverlay.vue`, `packages/editor/src/composables/useCursorVisibility.ts`, `packages/editor/src/components/ui/slash-menu-items.ts`.
  - [x] Preserve `useRafLoop.stop()` as the single idempotent cancellation path and verify `TableSelectionOverlay` stops resize tracking on all interaction exits and on unmount.
  - [x] In `useCursorVisibility`, retain the frame ID scheduled by `ResizeObserver`, avoid stacking duplicate pending frames, and cancel the pending frame before disconnecting observers and on scope disposal.
  - [x] Classify the slash-menu AI `requestAnimationFrame` as a one-shot rather than a loop. Add a cancellation/validity guard only if the callback can still mutate an unmounted or destroyed editor; do not broaden the change with unrelated scheduling rewrites.
  - [x] Logging: no logs inside frame callbacks. If an existing debug facility is used, log start/stop transitions once at DEBUG level only.
  - [x] Dependency: Task 3 confirms the related `ResizeObserver` and window-listener cleanup ownership.

## Acceptance Criteria
- [ ] Repeated Tinyfy SPA editor mount/unmount cycles leave no `synced`, `update`, `transaction`, `selectionUpdate`, or `tableHandleState` callbacks registered on the destroyed editor or its original provider.
- [x] A `provider` prop replacement cannot cause teardown to call `off` on a different provider instance from the one that received `on`.
- [x] Every production `addEventListener` in the scoped source has a lifecycle-owned removal with matching target/callback/options, including interaction listeners that are active during unmount.
- [x] `useRafLoop` has no scheduled frame after `stop()` or unmount, and `useCursorVisibility` cancels pending observer-scheduled frames before disposal.
- [ ] No automated tests or documentation changes are added for this task; perform only focused manual SPA remount checks during implementation.
