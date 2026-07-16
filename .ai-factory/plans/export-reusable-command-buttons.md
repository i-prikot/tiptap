<!-- handoff:task:e28f12ce-49eb-4573-a118-94b77c8f1765 -->
# Implementation Plan: Export Reusable Command Buttons

Branch: `main`
Created: 2026-07-14

## Settings
- [ ] Testing: no (requested scope excludes test changes and test execution)
- [ ] Logging: verbose review of existing UI state, with no new runtime logs unless an existing command error boundary requires one
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: "Autonomous handoff defaults to no roadmap linkage; the task aligns with the library-boundary milestone but does not update roadmap artifacts."

## Scope and Public Contract
- [ ] Export reusable, self-contained editor command controls from `src/editor/index.ts` as named Vue components. The public set must include `UndoRedoButton` plus the action buttons for marks, alignment, indentation, colors, image actions, node actions, movement, and slash-command insertion.
- [ ] Export complete command wrappers where a standalone trigger is insufficient for a host to execute the command without rebuilding the UI: `ColorHighlightPopover`, `ColorTextPopover`, `LinkPopover`, `TurnIntoDropdown`, and `ImageNodeFloating`.
- [ ] Keep editor-shell-only layout components and presentation-only trigger/content internals private unless they become necessary to fulfill the self-contained public-control contract.
- [ ] Every exported command control must accept `editor?: Editor | null`; it must use that instance when supplied and preserve the current injected-editor fallback for existing in-editor usage.
- [ ] Do not add runtime telemetry or log editor document/selection data. Disabled/hidden state and existing component events remain the observable UI contract.

## Tasks

### Phase 1: Define the package command-control surface
- [x] **Task 1: Export the reusable command controls from the package entry point.** Update `src/editor/index.ts` with named default-component exports for the complete reusable command set: `UndoRedoButton`, `MarkButton`, `TextAlignButton`, `IndentButton`, `ColorTextButton`, `ColorHighlightButton`, `DeleteNodeButton`, `ImageAlignButton`, `ImageCaptionButton`, `ImageDownloadButton`, `ImageUploadButton`, `MoveNodeButton`, and `SlashCommandTriggerButton`; also export the complete popover/dropdown/image command wrappers identified in the public contract. Re-export public component prop types that are already deliberately declared (for example `ImageUploadButtonProps`) when doing so avoids forcing hosts to deep-import implementation files. Preserve the existing `NotionEditor` and public type exports unchanged.
  - [ ] **Expected behavior:** a host can import each documented command control from the package entry and render it with an editor instance, without importing from `components/ui`.
  - [ ] **Files:** `src/editor/index.ts`, and only component files whose public prop types need explicit export support.
  - [ ] **Logging:** add no runtime logs; verify exports do not expose implementation-only state or document content.

### Phase 2: Make editor ownership explicit through command controls
- [x] **Task 2: Normalize the `editor` prop contract for every exported command control and its command-bearing descendants.** Audit the exported set and give any missing control an optional `Editor | null` prop. Resolve each control with `useTiptapEditor(computed(() => props.editor))` (or the established equivalent) so explicit input wins and dependency injection remains the fallback. In particular, update the editor-less command triggers only if they are part of the public contract, and ensure complete wrappers retain their usable behavior when mounted outside `EditorProvider` with a supplied editor.
  - [ ] **Expected behavior:** all public command controls support `:editor="editor"`; no component silently requires a provider when that prop is supplied.
  - [ ] **Files:** affected files under `src/editor/components/ui/`, including `ColorHighlightPopoverButton.vue`, `LinkButton.vue`, and any exported command wrapper missing the prop.
  - [ ] **Logging:** add no runtime logs or editor-content logging; retain existing disabled/unavailable UI behavior for absent, read-only, or incapable editors.

- [x] **Task 3: Forward explicit editor instances through composed controls and existing toolbar integrations.** Pass the resolved editor through all nested command paths so button actions use the host-provided instance instead of relying on accidental injection. Cover color popover → content → color buttons, text-color popover → content → color buttons, image floating controls → image action buttons, and the floating/mobile toolbar command children. Give `NotionToolbarFloating.vue` and `MobileToolbar.vue` the same optional-editor contract, then pass the content-area editor into them from `src/editor/components/notion/EditorContentArea.vue` while preserving current feature-flag and provider behavior.
  - [ ] **Expected behavior:** nested actions in color, image, floating, and mobile controls execute against the exact editor prop supplied at their outer boundary; existing `NotionEditor` behavior remains unchanged when no prop is supplied.
  - [ ] **Files:** `src/editor/components/ui/ColorHighlightPopover.vue`, `src/editor/components/ui/ColorHighlightPopoverContent.vue`, `src/editor/components/ui/ColorTextPopover.vue`, `src/editor/components/ui/ColorTextPopoverContent.vue`, `src/editor/components/ui/ImageNodeFloating.vue`, `src/editor/components/ui/NotionToolbarFloating.vue`, `src/editor/components/ui/MobileToolbar.vue`, `src/editor/components/notion/EditorContentArea.vue`, plus directly affected nested command controls.
  - [ ] **Logging:** add no runtime logs; preserve existing event emissions and accessibility/disabled attributes as the command-state signal.

### Phase 3: Exercise the public boundary and validate types
- [x] **Task 4: Replace the playground’s deep `UndoRedoButton` import with the public entry-point import, then type-check the package surface.** Update `src/playground/components/NotionEditorHeader.vue` to consume `UndoRedoButton` from the editor public API and keep passing its existing editor prop. Run `npm run typecheck`; if it passes, run `npm run build` to verify Vite can bundle the revised public entry. Do not add or run unit/integration tests under this task’s requested testing scope.
  - [ ] **Expected behavior:** the local host example compiles using the same public import path intended for external consumers, and public component exports have no TypeScript or build-time resolution errors.
  - [ ] **Files:** `src/playground/components/NotionEditorHeader.vue`; validation covers `src/editor/index.ts` and the changed command components.
  - [ ] **Logging:** report validation command outcomes in the implementation handoff only; add no application runtime logs.

## Validation
- [x] Confirm every named public command export declares or inherits an `editor?: Editor | null` input and accepts an explicit editor outside the provider context.
- [x] Confirm all nested command buttons receive the resolved editor from their parent wrappers/toolbars.
- [x] Run `npm run typecheck` and `npm run build` after implementation.
- [x] Do not add, modify, or run tests; do not create documentation changes.
- [x] Rework (2026-07-14): restored `src/editor/components/notion/EditorContentArea.vue` to non-executable file mode (`100644`) for review finding `c31618f6e524`.
