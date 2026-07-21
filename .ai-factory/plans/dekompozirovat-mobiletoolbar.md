<!-- handoff:task:b1a912c3-c371-40c4-a3df-e888a9c43667 -->
# Implementation Plan: Decompose MobileToolbar

Branch: `main` (fast-plan mode; no branch changes)
Created: 2026-07-20

## Settings
- [ ] Testing: no
- [ ] Logging: verbose — do not add runtime logging to this presentational refactor; preserve the current no-`console` behavior and make any future diagnostics stay within the owning view.
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff defaults.

## Scope and Preservation Rules
- [x] Keep the public `MobileToolbar` API unchanged: it remains exported from `packages/editor/src/components/ui/index.ts` and continues accepting the optional `editor` prop.
- [x] Preserve the existing mobile-only/editable-only rendering guard, overlay teleport target, cursor-visibility positioning, and reset to `main` when the viewport leaves the mobile breakpoint.
- [x] Preserve every current main-view control, including node actions, “Turn into”, marks, highlight/link availability, image controls, alignment, indentation, and node movement.
- [x] Do not add or modify automated tests or documentation for this task. Existing behavior is protected through unchanged component contracts and implementation review.

## Tasks

### Phase 1: Extract the Main View
- [x] **Task 1: Create `packages/editor/src/components/ui/MobileToolbarMain.vue` for the `main` view.** Move the current main-view template and all state/composables used exclusively by it from `MobileToolbar.vue`: selection/text availability, node display name, block-conversion items, reset/duplicate/copy/delete actions, and the local “more” menu state. Accept the normalized editor instance through an `editor` prop; emit explicit navigation events for opening the highlighter and link views instead of owning `viewId`. Preserve button ordering, disabled/active states, menu placement, and all existing command handlers. **Logging:** add no console or application logs; keep the component silent like the current toolbar and keep future diagnostics local to this view. **Depends on:** none.

### Phase 2: Extract the Sub-Views
- [x] **Task 2: Create `packages/editor/src/components/ui/MobileToolbarHighlighter.vue` for the `highlighter` view.** Encapsulate the back affordance (arrow plus highlighter icon), separator, and `ColorHighlightPopoverContent`. Accept `editor` as a prop and emit a single explicit event for returning to the main view. Preserve the exact toolbar primitive structure so the content retains its current layout and interaction behavior. **Logging:** add no runtime logs; preserve current error handling in the delegated color-highlight composables. **Depends on:** none.
- [x] **Task 3: Create `packages/editor/src/components/ui/MobileToolbarLink.vue` for the `link` view.** Encapsulate the back affordance (arrow plus link icon), separator, and `LinkContent`. Accept `editor` as a prop; map both the back button and `LinkContent`’s successful `set-link` event to an explicit return-to-main emit. Preserve URL apply/open/remove behavior by delegating unchanged to `LinkContent`. **Logging:** add no runtime logs; preserve current error handling in the delegated link composables. **Depends on:** none.

### Phase 3: Recompose the Stateful Shell
- [x] **Task 4: Reduce `packages/editor/src/components/ui/MobileToolbar.vue` to the responsive overlay shell and view router.** Retain only editor normalization, teleport target, breakpoint guard, measurement/cursor-positioning state, and the typed `main | highlighter | link` view state. Render `MobileToolbarMain`, `MobileToolbarHighlighter`, or `MobileToolbarLink` and wire their navigation emits to the parent view state; reset that state to `main` when leaving the mobile breakpoint. Remove now-owned imports, composables, and template branches from the parent without changing `packages/editor/src/components/ui/index.ts` or `packages/editor/src/components/notion/EditorContentArea.vue`. Review the extracted markup against the pre-refactor behavior to confirm no control, separator, condition, or command binding was lost. **Logging:** keep the shell free of console/application logs; it only coordinates UI state and delegates command failures to existing composables. **Depends on:** Tasks 1–3.

## Completion Criteria
- [x] `MobileToolbar.vue` contains only shared shell concerns and the three-view router; main, highlighter, and link markup live in their dedicated components.
- [x] Navigating to highlighter/link and returning through back, applying a link, or leaving the mobile breakpoint always results in the same `main` state as before.
- [x] The public `MobileToolbar` export and integration in `EditorContentArea` remain unchanged, and no tests or documentation are added as requested.
