<!-- handoff:task:65e40f8b-dce6-4795-9647-66b784b94cdc -->
# Implementation Plan: Standardize Expensive Event Throttling

Branch: main
Created: 2026-07-22

## Settings
- [x] Testing: focused regression coverage added during rework
- [ ] Logging: verbose for lifecycle diagnostics only; never log individual pointer, scroll, or resize events
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped for autonomous fast planning; this work corresponds to the existing performance backlog item.

## Scope and Decisions
- [x] Keep `mousedown`, `mouseup`, `dragover`, and `drop` synchronous; only repeated, geometry-heavy updates are throttled.
- [x] Use one animation-frame-scale interval (16 ms) with `leading: true` and `trailing: true` so handles and overlays respond immediately and settle on the latest event.
- [x] Every throttled lifecycle must call `cancel()` when its listener or Floating UI subscription is disposed, preventing a stale trailing callback after unmount or plugin destruction.
- [x] `TableHandlePlugin` belongs to `@i-prikot/editor-schema`, whereas the existing helper is editor-local. Move the dependency-free throttle primitive to schema ownership and retain the editor utility as a compatibility re-export so the dependency direction remains schema → editor, never the reverse.
- [x] Do not expand scope to `useCursorVisibility`, `useWindowSize`, or `TocSidebar`: the first two already throttle their expensive work, and the TOC scroll listener only clears a lightweight local state value.

## Tasks

### Phase 1: Establish the Canonical Utility
- [x] Task 1: Move the generic `throttle` implementation and its `ThrottledFunction` contract into `packages/schema/src/utils/throttle.ts`, export it from `packages/schema/src/index.ts`, and change `packages/editor/src/utils/throttle.ts` into a compatibility re-export. Preserve the current leading/trailing defaults and `cancel()` semantics so existing editor composables retain their behavior while schema plugins can use the same primitive without importing the UI package. **Logging:** add no per-invocation logging; if any lifecycle diagnostic is needed during implementation, keep it behind existing development-only facilities and omit pointer/scroll/resize payloads.

### Phase 2: Throttle Table Pointer Processing
- [x] Task 2: Update `packages/schema/src/extensions/table-handle/plugin.ts` to route only `mousemove` through a single 16 ms, leading-and-trailing throttled dispatcher created for each `TableHandleView`. Keep the current `handleMouseMoveNow` geometry, table lookup, selection-state, and emit logic intact; preserve immediate `mouseup` behavior by flushing the latest pointer state through the existing guarded path rather than throttling mouseup itself. On `destroy()`, remove the stable listener and cancel pending work so no stale table state can emit after the ProseMirror view is gone. **Logging:** do not log individual pointer moves or table geometry; retain errors only for invariant failures such as a missing table body.

### Phase 3: Throttle Floating Repositioning Lifecycles
- [x] Task 3: Add a reusable, cleanup-safe adapter in `packages/editor/src/utils/throttle.ts` (or a narrowly scoped adjacent utility if required by Floating UI types) that wraps a Floating UI update callback with the canonical 16 ms throttle and returns a disposer that calls both the Floating UI cleanup and `cancel()`. Apply it to raw `autoUpdate` in `packages/editor/src/utils/suggestion/positioning.ts` and to each `whileElementsMounted: autoUpdate` site in `packages/editor/src/components/primitives/dropdown-menu/DropdownMenuContent.vue`, `packages/editor/src/components/primitives/menu/MenuContent.vue`, `packages/editor/src/components/primitives/popover/Popover.vue`, `packages/editor/src/components/primitives/tooltip/Tooltip.vue`, `packages/editor/src/components/ui/suggestion/FloatingElement.vue`, and `packages/editor/src/components/ui/suggestion/SuggestionMenu.vue`. Preserve each component's middleware, placement, explicit Floating UI options, and immediate initial positioning; only coalesce repeated ancestor scroll/resize/layout updates. **Logging:** emit no position or event logs in these hot paths; diagnostics, if temporarily needed, must be lifecycle-level and removed or disabled before completion.

## Completion Criteria
- [x] The schema package and editor package both use the same throttle implementation without introducing a schema dependency on `@i-prikot/editor`.
- [x] Table handles remain responsive to the first pointer move, settle on the latest move, and never update after plugin destruction.
- [x] Suggestion menus and primitive floating overlays retain their current placement behavior while scroll/resize-triggered recalculation is coalesced and cancelled on teardown.
- [x] Focused regression coverage validates the canonical schema throttle re-export and table-handle freeze/drop trailing-event races.

## Rework: 2026-07-22
- [x] Recheck the table-handle frozen state inside throttled mousemove processing and cancel pending trailing work when handles freeze.
- [x] Cancel pending throttled mousemove work before processing a table drop.
- [x] Add focused regression tests for the canonical schema throttle export and the freeze/drop race conditions.
- [x] Add direct `throttledAutoUpdate` teardown coverage for Floating UI cleanup and trailing-update cancellation.

### TDD Evidence
- **RED:** `npm test -- --run test/editor/utils/throttle.test.ts test/editor/extensions/table-handle.integration.test.ts` failed on July 22, 2026 with the two new race assertions: one stale update emitted after freezing and one stale update emitted after drop.
- **GREEN:** The same command passed with 10 tests after the table-handle guard and cancellation changes.
- **REWORK COVERAGE:** Added direct `throttledAutoUpdate` teardown coverage that asserts the Floating UI disposer runs, the exact throttled callback receives `cancel()`, and the queued trailing update cannot run afterward.
- **FOCUSED GREEN:** On July 22, 2026, `npm test -- --run test/editor/utils/throttle.test.ts` passed: 1 test file and 7 tests passed (83.04 s total duration).
