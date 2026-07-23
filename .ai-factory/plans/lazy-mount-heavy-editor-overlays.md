<!-- handoff:task:1166d39b-efb1-404a-893f-2830bd6f005c -->
# Implementation Plan: Lazy-mount Heavy Editor Overlays

Branch: `main`
Created: 2026-07-22

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 7. Производительность"
Rationale: Defers expensive editor overlay code and reactive subscriptions until an editor interaction needs them.

## Scope and Constraints
- [ ] Keep the public `EditorFeatureFlags` API and all default feature values unchanged.
- [ ] Preserve existing overlay behavior after activation: mobile toolbar views, drag-handle menus, table handles, selection resizing, and row/column extension controls.
- [ ] Use direct dynamic imports at the consuming component; do not retain static barrel imports that would pull the target modules into the initial editor graph.
- [ ] Activation should be one-way for an editor lifetime: load and mount a surface on its first relevant interaction, then leave it mounted to avoid repeated listener/Teleport teardown and reloads.
- [ ] Do not add automated tests or documentation changes for this task.

## Tasks

### Phase 1: Defer General Editor Overlays
- [x] **Task 1: Lazy-load `MobileToolbar` and `DragContextMenu` from the content area.**
  - [ ] **Files:** `packages/editor/src/components/notion/notion-editor/EditorContentArea.vue`
  - [ ] Replace the static `MobileToolbar` and `DragContextMenu` imports from the UI barrel with `defineAsyncComponent` loaders that import their concrete Vue files directly.
  - [ ] Keep the existing feature-flag gates. Add lightweight parent-level activation state so `MobileToolbar` is requested only when the mobile breakpoint is active, and `DragContextMenu` is requested only after a desktop editing interaction (pointer entry/movement or keyboard focus) makes a drag handle relevant.
  - [ ] Attach activation listeners to the editor-content surface without changing its EditorContent props, layout classes, floating-menu order, or the always-available emoji/mention/slash/floating-toolbar behavior.
  - [ ] Ensure activation is sticky after the first matching interaction and remains safe when the breakpoint or feature flags change; the child components retain their existing internal visibility guards and cleanup behavior.
  - [ ] **Logging requirements:** add no production logs or high-frequency interaction logs. Keep existing diagnostics unchanged; unexpected async-component failures must remain visible through Vue's normal error handling (`ERROR`), with no `DEBUG`/`INFO` telemetry for pointer or focus events.

### Phase 2: Defer Table Overlay Suite
- [x] **Task 2: Add a lightweight table-overlay activation host and asynchronously mount the table UI.**
  - [ ] **Files:** `packages/editor/src/components/table/table-overlays/TableOverlays.vue` (new), `packages/editor/src/components/table/table-overlays/index.ts` (new), `packages/editor/src/components/table/index.ts`, `packages/editor/src/components/notion/notion-editor/EditorProvider.vue`
  - [ ] Move the provider's three table presentation components (`TableExtendRowColumnButtons`, `TableHandle`, and `TableSelectionOverlay`) behind a new `TableOverlays` host. Remove their static imports from `EditorProvider` and preserve the existing `features.tableControls` gate.
  - [ ] In the host, use direct `defineAsyncComponent` imports for the three heavy table components and pass `:show-resize-handles="true"` unchanged to `TableSelectionOverlay`.
  - [ ] Subscribe only to lightweight editor signals until activation: the `tableHandleState` event emitted by `TableHandleExtension` plus table-relevant selection updates. Activate once a table is actually hovered, selected, or otherwise interacted with; then mount all three table surfaces together and retain them for the rest of the editor session.
  - [ ] Detach all pre-activation listeners when the editor instance changes or the host unmounts. Do not move table plugin logic, alter editor extensions, or make table controls unavailable after the first table interaction.
  - [ ] **Logging requirements:** add no logs for table hover, selection, transaction, or activation because these are hot paths. Preserve framework error propagation (`ERROR`) for rejected async loaders; no new `DEBUG`, `INFO`, or `WARN` records are emitted.

### Phase 3: Validate Lazy Boundaries and Runtime Compatibility
- [x] **Task 3: Verify the split points without expanding test or documentation scope.**
  - [ ] **Files:** `packages/editor/vite.config.ts` (inspect only unless the emitted build collapses the new imports), `packages/editor/src/components/notion/notion-editor/EditorContentArea.vue`, `packages/editor/src/components/notion/notion-editor/EditorProvider.vue`, `packages/editor/src/components/table/table-overlays/TableOverlays.vue`
  - [ ] Run the editor package typecheck/build workflow after implementation. Confirm that Vite's existing ES library build with `preserveModules: true` preserves dynamic-import boundaries rather than statically reintroducing the lazy overlay modules into the initial editor path.
  - [ ] Manually exercise the deferred paths: narrow viewport for the mobile toolbar, first eligible desktop editor interaction for the drag context menu, and first table hover/selection/resize interaction for the table controls. Confirm Teleport targets, menu actions, drag behavior, and cleanup remain intact after activation.
  - [ ] Do not add or modify automated tests, snapshots, test configuration, documentation, or public API types.
  - [ ] **Logging requirements:** do not add runtime instrumentation. Treat build/typecheck diagnostics and Vue async-loader errors as validation output (`ERROR` only); no application-level `DEBUG`/`INFO`/`WARN` logging is introduced.

## Implementation Notes
- [ ] `MobileToolbar` already contains its own `useIsBreakpoint('max', 480)` guard; the parent-level breakpoint check exists only to prevent module loading and mounting on desktop.
- [ ] `DragContextMenu` encapsulates `DragHandle`, context menus, block conversion, colors, and table alignment, so it must not be eagerly imported through `components/ui/index.ts` once lazy loading is introduced.
- [ ] The table UI currently mounts at editor creation even though its `Teleport` output is hidden until table state exists. The new activation host must preserve its source event contract with `TableHandleExtension`, not replicate or relocate table-handle plugin behavior.
- [ ] Editor CSS remains globally published through `packages/editor/src/styles.css`; this task defers JavaScript/component mounting only and does not change CSS delivery.

## Rework Resolution (2026-07-22)
- [x] Addressed `cef8aa0f606a`: preserve and replay the activating `tableHandleState` as each asynchronous table overlay mounts.
- [x] Addressed `3943223d24df`: defer `DragContextMenu` only above its `768px` mobile breakpoint.
- [x] Addressed `cd936f2d4cd5`: retain `tableHandleState` capture after selection activation and replay the buffered state once every asynchronous table overlay has mounted.
- [x] Addressed `af708f90c69d`: replace the remaining `../../ui` barrel import in `EditorContentArea.vue` with direct control imports so the drag context menu remains reachable only through its asynchronous loader.

## Completion Criteria
- [ ] Initial editor creation does not synchronously import or mount `MobileToolbar`, `DragContextMenu`, `TableHandle`, `TableSelectionOverlay`, or `TableExtendRowColumnButtons`.
- [ ] Each surface loads at its first relevant interaction and has the same visible behavior thereafter.
- [ ] Feature flags still disable their respective surfaces without causing background loaders or stale editor event listeners.
- [ ] The editor package typechecks and builds successfully, with no test or documentation changes.
