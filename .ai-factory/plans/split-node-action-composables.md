<!-- handoff:task:83be5bd1-5071-49fb-ab09-b7dcb8cfc6af -->
# Split Node Action Composables

**Created:** 2026-07-14  
**Branch:** `main`  
**Type:** Refactor

## Settings

- [ ] **Testing:** No — do not add, modify, or run tests for this handoff.
- [ ] **Logging:** Verbose implementation diagnostics; preserve all existing runtime `console.warn` and `console.error` behavior exactly, but add no new runtime logging for this extraction-only refactor.
- [ ] **Documentation:** No — do not update user-facing or project documentation.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** Skipped for this autonomous fast plan.

## Scope and Compatibility Contract

- [x] Split the nine cohesive actions currently implemented in `src/editor/composables/useNodeActions.ts`: duplicate, clipboard copy, anchor-link copy, formatting reset, node deletion, image download, TOC-title toggle, table fit-to-width, and table clear-all.
- [x] Keep `src/editor/composables/useNodeActions.ts` as the public compatibility facade. Existing imports in `DragContextMenu.vue`, `MobileToolbar.vue`, `DeleteNodeButton.vue`, `ImageDownloadButton.vue`, `useMoveNode.ts`, and current test files must continue to resolve without consumer rewrites.
- [x] Preserve every exported action shape, label, icon, shortcut constant, default argument, boolean return value, reactive selection dependency, and browser/ProseMirror fallback path.
- [x] Preserve the current `useAnchorNavigation()`-based anchor URL behavior already present in the working tree; do not reintroduce direct reads of `window.location.href`.

## Tasks

### Phase 1: Establish Shared Action Boundaries

- [x] **Task 1: Extract the shared selected-block helper.** Move `getAnchorNodeAndPos` and only its direct ProseMirror position dependencies into a narrowly named internal helper module, such as `src/editor/composables/nodeActionUtils.ts`. Export the helper from the new module for `useCopyAnchorLink` and re-export it later from the compatibility facade so `src/editor/composables/useMoveNode.ts` keeps its current import path. Keep `allowEmptySelection`, `NodeSelection` handling, position validation, and null behavior byte-for-byte equivalent in behavior. **Files:** create `src/editor/composables/nodeActionUtils.ts`; modify `src/editor/composables/useNodeActions.ts`. **Dependencies:** none. **Logging:** No logs belong in the helper; preserve its current silent null/fallback behavior.

### Phase 2: Extract Core Block Actions

- [x] **Task 2: Move duplication and clipboard-copy actions into focused composables.** Create `src/editor/composables/useDuplicate.ts` and `src/editor/composables/useCopyToClipboard.ts`, moving each action’s exported composable, shortcut constant, icon dependency, capability predicate, and private clipboard/selection helpers with it. Preserve `useEditorSelectionSignal` reactivity, NodeSelection-versus-ancestor insertion, text-selection whole-block copying, formatted `ClipboardItem` use, and `writeText` fallback. **Files:** create `src/editor/composables/useDuplicate.ts`, `src/editor/composables/useCopyToClipboard.ts`; modify `src/editor/composables/useNodeActions.ts`. **Dependencies:** Task 1 only if shared selection utilities are needed; otherwise independent. **Logging:** Add no logs; preserve the current swallowed-error and retry behavior exactly.

- [x] **Task 3: Move formatting-reset and node-delete actions into focused composables.** Create `src/editor/composables/useResetAllFormatting.ts` and `src/editor/composables/useDeleteNode.ts`. Keep `DEFAULT_RESET_PRESERVE_MARKS` with reset formatting, including its default parameter and multi-range mark-removal semantics. Keep the delete action’s dry-run eligibility check, block-node exclusions for table structure, `deleteRange`/NodeSelection fallback, focus chaining, labels, and shortcut constants unchanged. **Files:** create `src/editor/composables/useResetAllFormatting.ts`, `src/editor/composables/useDeleteNode.ts`; modify `src/editor/composables/useNodeActions.ts`. **Dependencies:** Task 1. **Logging:** Add no logs; retain the existing false-return catch paths without changing error visibility.

### Phase 3: Extract Browser-Integrated Actions

- [x] **Task 4: Isolate anchor-link copying and image downloading.** Create `src/editor/composables/useCopyAnchorLink.ts` and `src/editor/composables/useImageDownload.ts`. The anchor module must use `nodeActionUtils`, `getEditorExtension`, and `useAnchorNavigation()` to retain unique-ID attribute detection, `source=copy_link`, base URL injection, hash generation, and the existing copy failure message. The image module must retain extension and node-selection guards, filename/extension derivation, fetch-to-object-URL download, direct-anchor fallback, window-open fallback, cleanup timing, and all existing log messages and levels. **Files:** create `src/editor/composables/useCopyAnchorLink.ts`, `src/editor/composables/useImageDownload.ts`; modify `src/editor/composables/useNodeActions.ts`. **Dependencies:** Task 1. **Logging:** Preserve `Failed to copy node ID to clipboard`, fetch/direct download warnings, and failed image-open error exactly; add no messages.

### Phase 4: Extract Specialized Node Actions

- [x] **Task 5: Move TOC and table actions into dedicated composables.** Create `src/editor/composables/useTocShowTitle.ts`, `src/editor/composables/useTableFitToWidth.ts`, and `src/editor/composables/useTableClearAllContents.ts`. Keep the existing extension checks, selection reactivity, TOC active-state calculation and attribute update, table available-width calculation, minimum-width constraint, colspan-aware `colwidth` update, clear-all call with `resetAttrs: true`, focus behavior, labels, and icons. **Files:** create `src/editor/composables/useTocShowTitle.ts`, `src/editor/composables/useTableFitToWidth.ts`, `src/editor/composables/useTableClearAllContents.ts`; modify `src/editor/composables/useNodeActions.ts`. **Dependencies:** none beyond the existing table/selection utilities. **Logging:** Preserve the table auto-width `console.error` message and all existing helper logging; do not introduce logs in the TOC or clear-all modules.

### Phase 5: Rebuild the Stable Public Surface

- [x] **Task 6: Convert `useNodeActions.ts` into an explicit compatibility facade.** Replace its implementation body with value and type re-exports from the focused modules, including every existing shortcut/default constant and `getAnchorNodeAndPos`. Verify each current consumer continues importing from `../../composables/useNodeActions` or `./useNodeActions` without source changes; do not introduce a broad composables barrel as part of this scoped refactor. Ensure no circular imports are introduced between the facade, extracted modules, `useMoveNode.ts`, or `useAnchorNavigation.ts`. **Files:** modify `src/editor/composables/useNodeActions.ts`; inspect `src/editor/composables/useMoveNode.ts`, `src/editor/components/ui/DragContextMenu.vue`, `src/editor/components/ui/MobileToolbar.vue`, `src/editor/components/ui/DeleteNodeButton.vue`, and `src/editor/components/ui/ImageDownloadButton.vue` without modifying them unless module resolution proves an unchanged import impossible. **Dependencies:** Tasks 1-5. **Logging:** The facade must be log-free; runtime logs remain solely in the extracted action that already owns them.

### Phase 6: Non-Test Validation and Review

- [x] **Task 7: Validate the extraction without test execution.** Run `npm run typecheck` and `npm run lint`; do not run or change test files because this handoff explicitly disables testing. Resolve only extraction-caused type, lint, import/export, and circular-dependency issues. Review the final diff to confirm the existing public import path, exports, labels/icons/shortcuts, reactive capabilities, browser fallbacks, and error text are unchanged, and that unrelated workspace modifications are not included. **Files:** all files created or modified by Tasks 1-6; inspect `test/editor/composables/node-actions.test.ts`, `test/editor/composables/node-actions-branches.test.ts`, and `test/editor/components/mobile-toolbar.integration.test.ts` as behavioral contract references only. **Dependencies:** Task 6. **Logging:** Verify no runtime logging is added, removed, renamed, or assigned a different severity during relocation.

## Commit Plan

1. `refactor(editor): split core node action composables` — Tasks 1-3.
2. `refactor(editor): extract specialized node actions` — Tasks 4-6.
3. `chore(editor): validate node action composable split` — Task 7, only if repository conventions permit committing validation-only metadata; otherwise include validation in the preceding refactor commit.

## Completion Criteria

- [x] `useNodeActions.ts` is a thin re-export facade, while each action owns its implementation and private helpers.
- [x] All pre-existing exports remain available from `src/editor/composables/useNodeActions.ts` with the same runtime behavior.
- [x] `useMoveNode.ts` and UI consumers compile without required import-path changes.
- [x] `npm run typecheck` and `npm run lint` pass, with no test commands run and no documentation changes made.
