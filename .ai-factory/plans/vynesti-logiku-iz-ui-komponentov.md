<!-- handoff:task:1057cf88-31bb-4374-bab6-737044429c07 -->
# План реализации: вынести логику из UI-компонентов

Branch: `main`
Created: 2026-07-21

## Settings
- [ ] Testing: no — explicitly disabled for this task. Do not add or modify test tasks; use static validation only.
- [ ] Logging: verbose — side-effect composables use development-gated diagnostics for lifecycle and command outcomes; do not log editor document content or user data.
- [ ] Docs: no — no documentation checkpoint; implementation should emit the standard docs warning only.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff defaults; the source task corresponds to the existing Vue 3 best-practices backlog item.

## Scope and migration rule

Audit all 43 SFCs in `packages/editor/src/components/ui/`. A component may retain only template wiring, typed props/emits, UI-local element refs, and calls to composables. Move editor command execution, availability/visibility calculations, menu-item construction, subscriptions, DOM listeners, plugin registration, and positioning lifecycle into `packages/editor/src/composables/`.

Preserve every public prop, emit, slot contract, CSS selector, keyboard behavior, and editor command result. Reuse existing composables before adding a new one; keep pure non-Vue helpers in `packages/editor/src/utils/` rather than coupling them to a component.

High-risk migration targets established by the audit:
- [ ] Direct editor commands/capabilities: `ColorMenu.vue`, `DragContextMenu.vue`, `EmojiDropdownMenu.vue`, `MentionDropdownMenu.vue`, `ImageAlignButton.vue`, `ImageCaptionButton.vue`, `ImageUploadButton.vue`, `IndentButton.vue`, and `UndoRedoButton.vue`.
- [ ] Subscriptions, DOM listeners, or plugin lifecycle: `FloatingElement.vue`, `SuggestionMenu.vue`, `UndoRedoButton.vue`, `DragContextMenu.vue`, `NotionToolbarFloating.vue`, `MobileToolbar.vue`, `TurnIntoDropdown.vue`, and suggestion item components.
- [ ] Domain-derived menu state: `ColorMenu.vue`, `ColorTextPopoverContent.vue`, `ColorHighlightPopoverContent.vue`, `DragContextMenu.vue`, `MobileToolbarMain.vue`, and `TurnIntoDropdownContent.vue`.

## Commit Plan
- [ ] **Commit 1** (after tasks 1–2): `refactor(editor): extract ui command and menu composables`
- [ ] **Commit 2** (after tasks 3–4): `refactor(editor): extract floating and toolbar controller composables`
- [ ] **Commit 3** (after tasks 5–7): `refactor(editor): make ui components composable-driven`

## Tasks

### Phase 1: Command and menu composables

- [x] **Task 1: Extract editor action state and execution from leaf controls.** Create focused composables for undo/redo, indent/outdent, image alignment/caption/upload insertion, and any remaining direct command logic under `packages/editor/src/composables/`; export them from `packages/editor/src/composables/index.ts`. Refactor `packages/editor/src/components/ui/UndoRedoButton.vue`, `packages/editor/src/components/ui/IndentButton.vue`, `packages/editor/src/components/ui/ImageAlignButton.vue`, `packages/editor/src/components/ui/ImageCaptionButton.vue`, and `packages/editor/src/components/ui/ImageUploadButton.vue` so they only render composable state and forward click/input events. Preserve the existing `useImageUpload` ownership for upload-node lifecycle rather than duplicating it. **Logging:** add development-gated `DEBUG` diagnostics only at command attempts/results and subscription setup/teardown; preserve existing image-upload `DEBUG`/`ERROR` behavior, omit document content and file payloads. **Dependencies:** none.
  - [x] **Rework (2026-07-21):** Route unexpected upload diagnostics through the development-gated helper, omit `fileName` from upload metadata, and replace raw command exceptions with fixed failure categories.

- [ ] **Task 2: Centralize color and turn-into menu construction.** Extend existing `useColorControl`, `useColorText`, `useColorHighlight`, `useRecentColors`, `useTurnInto`, and block-conversion composables where possible; otherwise add small UI-domain composables for color menu items and turn-into item models. Move command availability, recent-color ordering, reset actions, and `TurnIntoMenuItem` mapping out of `packages/editor/src/components/ui/ColorMenu.vue`, `packages/editor/src/components/ui/ColorTextPopoverContent.vue`, `packages/editor/src/components/ui/ColorHighlightPopoverContent.vue`, `packages/editor/src/components/ui/DragContextMenu.vue`, and `packages/editor/src/components/ui/TurnIntoDropdownContent.vue`. Keep colors, labels, icons, and callbacks reactive and behaviorally identical. **Logging:** development-gated `DEBUG` for palette/action selection and rejected editor commands; no logs for ordinary computed recomputation and no color/document content beyond existing safe identifiers. **Dependencies:** task 1 establishes the convention for command composables.

### Phase 2: Lifecycle and container controllers

- [ ] **Task 3: Move floating-element and suggestion-plugin lifecycle into composables.** Create `useFloatingElement` and `useSuggestionMenu` (or project-consistent equivalents) in `packages/editor/src/composables/`, and export them through the barrel. Transfer `@floating-ui/vue` setup, virtual references, editor event listeners, Escape/outside-pointer handling, suggestion plugin registration/unregistration, menu navigation coordination, and all `watch`/unmount cleanup from `packages/editor/src/components/ui/FloatingElement.vue` and `packages/editor/src/components/ui/SuggestionMenu.vue`. Keep these SFCs responsible only for teleport markup, styles, slots, and composable event forwarding. **Logging:** development-gated `DEBUG` at open/close, plugin register/unregister, and listener setup/cleanup; `WARN` for unexpected destroyed-editor or invalid-reference conditions, without document or query text. **Dependencies:** none; coordinate exported types with task 2 if suggestion menu items reuse its menu-model conventions.

- [ ] **Task 4: Extract drag, floating-toolbar, and mobile-toolbar controllers.** Consolidate selection-derived visibility, toolbar mode transitions, drag-menu open state, contextual action models, and event/listener cleanup into composables that build on `useUiEditorState`, `useEditorSelectionSignal`, `useFloatingToolbarVisibility`, `useDragContextMenuItems`, and the action/menu composables created earlier. Refactor `packages/editor/src/components/ui/DragContextMenu.vue`, `packages/editor/src/components/ui/NotionToolbarFloating.vue`, `packages/editor/src/components/ui/MobileToolbar.vue`, `packages/editor/src/components/ui/MobileToolbarMain.vue`, `packages/editor/src/components/ui/MobileToolbarHighlighter.vue`, `packages/editor/src/components/ui/MobileToolbarLink.vue`, and `packages/editor/src/components/ui/TurnIntoDropdown.vue` to template-only adapters. **Logging:** development-gated `DEBUG` for toolbar mode/open-state transitions and listener lifecycle; no logging for every selection transaction, and no user-selected text. **Dependencies:** tasks 1–3.

### Phase 3: Complete the UI audit and integrate

- [ ] **Task 5: Make remaining UI components composable-driven or explicitly presentation-only.** Audit and refactor the remaining UI SFCs in `packages/editor/src/components/ui/`: `ColorHighlightButton.vue`, `ColorHighlightPopover.vue`, `ColorHighlightPopoverButton.vue`, `ColorPopoverPanel.vue`, `ColorPopoverShell.vue`, `ColorTextButton.vue`, `ColorTextPopover.vue`, `DeleteNodeButton.vue`, `DragContextMenuTurnInto.vue`, `EmojiDropdownMenu.vue`, `EmojiMenuItem.vue`, `ImageDownloadButton.vue`, `ImageNodeFloating.vue`, `LinkButton.vue`, `LinkContent.vue`, `LinkPopover.vue`, `MarkButton.vue`, `MentionDropdownMenu.vue`, `MentionMenuItem.vue`, `MoveNodeButton.vue`, `SlashCommandTriggerButton.vue`, `SlashDropdownMenu.vue`, `SlashMenuItem.vue`, `TableAlignMenu.vue`, and `TextAlignButton.vue`. Reuse existing hooks such as `useMark`, `useTextAlign`, `useLinkPopover`, `useMenuNavigation`, `useTableAlignCell`, `useDeleteNode`, `useMoveNode`, and `useImageDownload`; move any remaining business state or side effects into a narrowly named composable and leave presentation-only components unchanged except for simplified bindings. **Logging:** preserve diagnostics supplied by reused composables; any new side-effect hook gets development-gated `DEBUG` for lifecycle/action outcome and `ERROR` only for exceptional failures. **Dependencies:** tasks 1–4.

- [ ] **Task 6: Normalize composable public APIs and remove component-level duplication.** Review all composables added or changed by tasks 1–5 for consistent `ComputedRef` inputs, typed return values, cleanup via `onScopeDispose`/`onBeforeUnmount` as appropriate, and direct imports through `packages/editor/src/composables/index.ts`. Remove dead local helpers, duplicate editor capability checks, and stale subscriptions from the affected UI components; retain pure reusable helpers in `packages/editor/src/utils/`. Confirm that no SFC in `packages/editor/src/components/ui/` directly invokes editor commands, registers an editor plugin, or owns a subscription/DOM-listener lifecycle. **Logging:** verify all new diagnostics are gated by `import.meta.env.DEV`, use stable composable prefixes, redact document/query/file content, and do not add production-noisy logs. **Dependencies:** tasks 1–5.

### Phase 4: Static validation

- [ ] **Task 7: Validate the refactor without adding tests.** Run `npm run lint --workspace=@i-prikot/editor` and `npm run typecheck --workspace=@i-prikot/editor`; fix only errors introduced by this refactor. Manually exercise the affected editor flows in the playground: floating selection toolbar, drag context menu, color/highlight palettes, turn-into actions, slash/emoji/mention suggestions, mobile toolbar navigation, image controls, indentation, and undo/redo; verify listener/plugin cleanup by mounting and unmounting the editor repeatedly. **Logging:** during manual verification, confirm development diagnostics appear only at lifecycle/action boundaries and that production behavior remains silent except for actual errors. **Dependencies:** task 6.

## Rework — 2026-07-21

- [x] Restored the `imageUpload` extension guard in `useImageUploadButton` visibility logic so `hideWhenUnavailable` hides the control when the extension is absent, including inside code blocks. Verified with `npm run lint --workspace=@i-prikot/editor` and `npm run typecheck --workspace=@i-prikot/editor`.

- [x] Preserved undo/redo control visibility without an editor: `hideWhenUnavailable: false` now renders a disabled control, while `true` hides it. Added `test/editor/composables/undo-redo.test.ts`; verified with its focused Vitest run, editor lint, and editor typecheck.

- [x] Added behavioral composable coverage for the Task 1 extraction: `test/editor/composables/image-command-controls.test.ts` covers `useIndent`, `useImageAlign`, `useImageCaption`, and `useImageUploadButton` command/visibility contracts; `test/editor/composables/image-upload.test.ts` covers `useImageUpload` upload progress, safe-URL validation, callbacks, and replacement-chain contract. **RED/GREEN evidence:** the initial focused Vitest run exposed incomplete selection/document-order assumptions while defining the behavioral contracts; the final single-thread focused run passed all 6 tests. Also verified with focused ESLint and `npm run typecheck --workspace=@i-prikot/editor`.
