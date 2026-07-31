<!-- handoff:task:3abdeba6-dbf9-4991-b70d-9f813d49c671 -->
# Implementation Plan: Port remaining global Tiptap UI hotkeys

Branch: `main` (autonomous Handoff; do not create or switch branches)
Created: 2026-07-28

## Settings
- [x] Testing: yes — the July 28, 2026 rework request overrides the original handoff constraint and requires focused hotkey coverage.
- [ ] Logging: verbose development diagnostics, redacted and action-oriented.
- [ ] Docs: no — no documentation or migration-status update is part of this handoff.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped for autonomous fast-mode planning, although the scope corresponds to the outstanding technical-debt item in `.ai-factory/ROADMAP.md`.

## Scope and Constraints
- [ ] Port the React `react-hotkeys-hook` behavior into the Vue package without adding a runtime keyboard-shortcut dependency or changing the published API.
- [ ] Preserve the current composables as the command source of truth: the hotkeys must invoke the same action functions, capability checks, async/deferred mark behavior, callbacks, and selection updates as button clicks.
- [ ] Support `Mod` as platform-appropriate Meta/Ctrl; honor exact `Shift` combinations for `H`, `T`, `I`, `ArrowUp`, and `ArrowDown`, plus unmodified `Backspace`.
- [ ] Match the original interaction gates: do not react while composition is in progress; do not steal native input when the target editor/action is unavailable; preserve the original mobile/contenteditable limitation; and clean up listeners when an editor or component unmounts.
- [ ] Keep hotkeys isolated to the focused editor host so multiple mounted `.tinyfy-editor` instances cannot execute the same command from one keypress. Inputs and controls belonging to that host retain the original form-control support.
- [x] Do not alter `MIGRATION_STATUS.md`, roadmap artifacts, or package manifests. The July 28, 2026 rework explicitly permits the focused hotkey test file required by review.

## Tasks

### Phase 1: Native Hotkey Infrastructure
- [x] **Task 1: Create an internal Vue lifecycle bridge for editor hotkeys.** Add `packages/editor/src/composables/useEditorHotkeys.ts` to register and dispose native keyboard listeners for a reactive Tiptap editor and command descriptors. Normalize `mod` across macOS/other platforms, identify the listed shifted letters, arrows, and Backspace exactly, reject composing/default-prevented events, and expose per-command reactive enable predicates. Scope document-level handling to the focused editor host (including its own form controls) so separate editor instances cannot collide; reproduce the original desktop/mobile contenteditable eligibility rather than globally overriding browser behavior. Prevent the browser default only for an enabled command that this bridge dispatches, and leave unsupported or unavailable shortcuts untouched. **Files:** create `packages/editor/src/composables/useEditorHotkeys.ts`; modify `packages/editor/src/composables/index.ts` only if the internal helper needs the established composable barrel. **Dependencies:** none. **Logging:** use development-gated `DEBUG` diagnostics for listener attach/detach and dispatched shortcut outcome (`shortcut`, `executed` only); emit no document content, selection data, raw keyboard payload, or production `INFO` logs; unexpected listener/action failures use existing command diagnostics where available rather than leaking editor state.

### Phase 2: Color and Image Commands
- [x] **Task 2: Bind `mod+shift+H`, `mod+shift+T`, and `mod+shift+I` to their existing actions.** Integrate the shared bridge into `useColorHighlight`, `useColorText`, and `useImageUploadButton` so the hotkeys call the same configured color/highlight or image-upload command as their UI controls only while the existing visibility and capability refs allow it. Preserve `useColorControl` deferred mark application and callbacks exactly. Move/export the image-upload shortcut constant from `ImageUploadButton.vue` into `useImageUploadButton.ts`, add the existing-style success callback needed to propagate keyboard insertion to the component’s `inserted` emit, and update `ImageUploadButton.vue` to consume that shared constant/callback rather than maintaining a duplicate click-only path. **Files:** modify `packages/editor/src/composables/useColorHighlight.ts`, `packages/editor/src/composables/useColorText.ts`, `packages/editor/src/composables/useImageUploadButton.ts`, and `packages/editor/src/components/ui/image/ImageUploadButton.vue`. **Dependencies:** Task 1. **Logging:** retain `useColorControl` and `useImageUploadButton` development diagnostics; record only redacted `DEBUG` command attempts/completions through the shared bridge, preserve current graceful false returns, and add no clipboard, document, color-label, or image-upload payload logging.

### Phase 3: Node Movement and Deletion
- [x] **Task 3: Bind block movement and destructive deletion shortcuts without changing command semantics.** Wire `mod+shift+ArrowUp` and `mod+shift+ArrowDown` in `useMoveNode` to their direction-specific `handleMoveNode` path, preserving current sibling-boundary checks and post-move selection placement. Wire unmodified Backspace in `useDeleteNode` to `handleDeleteNode` only when a deletable `NodeSelection` is active; retain cursor-based deletion for explicit button/menu actions, block-node exclusions for table rows/cells/headers, and normal browser Backspace behavior for text cursors or whenever deletion is unavailable. Do not duplicate shortcut listeners in button components; commands remain owned by their composables and their existing click paths stay intact. **Files:** modify `packages/editor/src/composables/useMoveNode.ts` and `packages/editor/src/composables/useDeleteNode.ts`. **Dependencies:** Task 1. **Logging:** preserve `useMoveNode`’s existing error logger and `useDeleteNode`’s silent false-return behavior; the new hook may emit redacted development `DEBUG` dispatch results but must not log node JSON, positions, selections, or Backspace event data.

  - Rework (2026-07-28): capture-phase Backspace now dispatches only for an active `NodeSelection`, preventing interception of ordinary text-cursor deletion.

### Phase 4: Non-Test Validation
- [ ] **Task 4: Validate the integrated hotkey contract without adding tests.** Run `npm run typecheck` and the editor workspace lint command after implementation. Manually verify in a desktop editor that H/T/I, both shifted arrows, and eligible Backspace execute their matching command once; unavailable commands leave the browser/editor’s normal key behavior intact; IME composition and mobile contenteditable restrictions are respected; and with two mounted editor hosts only the focused host responds. Confirm unmounting an editor removes its listeners and that no new dependency, public export, documentation, or test artifact was introduced. **Files:** no source changes expected. **Dependencies:** Tasks 1–3. **Logging:** inspect development diagnostics only for redacted shortcut names and boolean outcomes; treat any document content, selection coordinates, uploaded file metadata, or duplicate listener dispatch as a release blocker.
  - Validation status: workspace typecheck passed. The full editor lint and a 120-second lint of `useDeleteNode.ts` both stalled without diagnostics, so lint completion remains unverified; browser interaction verification is blocked because no Playwright browser is installed in this environment.

### Rework: Review Gate Completion
- [x] **Task 5: Restore delete-event parity and cover the hotkey bridge.** Thread an optional success callback through `useDeleteNode` and pass `DeleteNodeButton`’s `deleted` emitter so successful Backspace deletion reports the same event as clicking. Add focused `useEditorHotkeys` tests for dispatch and default prevention, editor-host isolation, IME/mobile gates, unmount cleanup, and NodeSelection-only Backspace. **Files:** modify `packages/editor/src/composables/useDeleteNode.ts` and `packages/editor/src/components/ui/formatting/DeleteNodeButton.vue`; add `test/editor/composables/editor-hotkeys.test.ts`. **Validation:** RED: `npm test -- --run test/editor/composables/editor-hotkeys.test.ts` failed because keyboard deletion did not invoke `onDeleted`; GREEN: the same command passes 6 tests. `npm run typecheck` passes; targeted ESLint passes with two `vue/one-component-per-file` warnings in the test harness.

## Completion Criteria
- [ ] Every shortcut listed as outstanding in `.ai-factory/MIGRATION_STATUS.md` is operational through the corresponding existing Vue composable: highlight, text color, image upload, move up, move down, and delete node.
- [ ] Keyboard execution has the same capability and success semantics as clicking the associated control, with no duplicate action from repeated component mounts or multiple editor instances.
- [ ] Normal text editing, unavailable commands, IME composition, and restricted mobile contenteditable paths are not intercepted.
- [ ] `npm run typecheck` and the editor workspace lint command complete successfully; no test or documentation changes are made under this handoff’s explicit settings.
