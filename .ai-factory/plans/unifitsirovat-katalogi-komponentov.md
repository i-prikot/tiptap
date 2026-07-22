<!-- handoff:task:81e63386-28be-484d-bff0-660a00d0e80b -->
# Implementation Plan: Standardize Component Catalogs

Branch: `main`
Created: 2026-07-21

## Settings
- [ ] Testing: no — do not add coverage or alter assertions; update existing test import paths only where a relocated source module would otherwise fail to resolve.
- [ ] Logging: verbose implementation progress; do not introduce runtime logging for this path-only refactor.
- [ ] Docs: no — the required `ARCHITECTURE.md` change is part of the feature contract, not a separate documentation checkpoint.

## Roadmap Linkage
Milestone: "Этап 6. Vue 3: лучшие практики"
Rationale: Implements the remaining roadmap item that requires shared structure rules for `notion/`, `ui/`, `table/`, and `primitives/`.

## Target Catalog Contract

Apply the following contract consistently under `packages/editor/src/components/`:

- [ ] Each catalog has a root `index.ts` as its only public entry point. `packages/editor/src/index.ts` exports only supported package API from these catalog barrels, never from a feature's private file path.
- [ ] Each cohesive feature uses a dedicated kebab-case subdirectory. Place its Vue views, local types, constants, context/signal files, and data-only helpers beside one another; expose intended members with that feature's `index.ts`.
- [ ] A catalog root contains only feature directories and its root barrel. Do not leave arbitrary `.vue`, `*-context.ts`, `*-signals.ts`, `public-api.ts`, or data modules at catalog root.
- [ ] Import sibling files with relative paths only within one feature. For a different feature or catalog, import its exported member through the relevant feature or catalog barrel; do not reach into another feature's private files.
- [ ] Keep behavior in `composables/`, schema/editor behavior in `extensions/` or `nodes/`, and pure code in `utils/`. Catalog-local support files may describe only the component feature and must not become a second home for reusable behavior.
- [ ] Preserve component names, props, emits, CSS class names, stylesheets, and package-level exports. This task changes ownership and import paths, not user-visible behavior.

## Commit Plan
- [ ] **Commit 1** (after tasks 1–3): `refactor(editor): standardize component feature modules`
- [ ] **Commit 2** (after tasks 4–5): `refactor(editor): align component catalog exports`

## Tasks

### Phase 1: Define the contract and move editor-shell modules

- [x] **Task 1: Record the component-catalog rules and migration map in the architecture.** Update `.ai-factory/ARCHITECTURE.md` sections covering directory structure, layer responsibilities, component tree, and dependency direction with the Target Catalog Contract above. Add the concrete destination map: `notion/notion-editor/` owns `NotionEditor.vue`, `NotionEditorContent.vue`, `EditorProvider.vue`, `EditorContentArea.vue`, `editor-lifecycle-signals.ts`, and the current public API types; `notion/collaboration/`, `notion/toc/`, and `notion/feedback/` own `CollabUsers.vue`, `TocSidebar.vue`, and `LoadingSpinner.vue`; `ui/` is grouped into color, image, link, mobile-toolbar, drag-context-menu, emoji-menu, mention-menu, slash-menu, suggestion, turn-into, formatting, and toolbar features; `table/` owns table-handle, table-cell-handle, table-selection, table-extend, and table-align features; every primitive is one named feature module. State that `TableAlignMenu.vue` belongs to `table/`, not `ui/`. **Files:** `.ai-factory/ARCHITECTURE.md`. **Logging:** add no runtime logs; at verbose implementation level, record the finalized destination map and each rule before any move so subsequent import changes are auditable. **Dependencies:** none.

- [x] **Task 2: Convert `notion/` into feature modules and a single barrel.** Move the editor shell and its local public types into `packages/editor/src/components/notion/notion-editor/`; move collaboration, TOC, and feedback views into the dedicated feature folders defined in Task 1. Replace `packages/editor/src/components/notion/public-api.ts` with feature-local exports re-exported through a new `packages/editor/src/components/notion/index.ts`. Update internal relative imports, imports from `packages/editor/src/composables/useAi.ts`, `useAnchorNavigation.ts`, and `useCollab.ts`, plus package exports in `packages/editor/src/index.ts`, while retaining every exported symbol and runtime behavior. **Files:** `packages/editor/src/components/notion/**`, `packages/editor/src/composables/useAi.ts`, `packages/editor/src/composables/useAnchorNavigation.ts`, `packages/editor/src/composables/useCollab.ts`, `packages/editor/src/index.ts`. **Logging:** add no runtime logs; preserve existing lifecycle/error logging and report each moved notion feature plus its updated barrel consumer at verbose implementation level. **Dependencies:** Task 1.

- [x] **Task 3: Group `ui/` and `table/` by editor feature, including semantic table ownership.** Create feature folders and feature barrels for each existing UI family: color (`Color*`), image (`Image*`), link (`Link*`), mobile toolbar (`MobileToolbar*`), drag context menu (`DragContextMenu*`), emoji menu (`Emoji*`), mention menu (`Mention*`), slash menu (`Slash*` and `slash-menu-items.ts`), suggestion (`SuggestionMenu.vue` and `FloatingElement.vue`), turn-into (`TurnIntoDropdown*`), formatting controls (`MarkButton.vue`, `TextAlignButton.vue`, `IndentButton.vue`, `UndoRedoButton.vue`, `DeleteNodeButton.vue`, `MoveNodeButton.vue`), and toolbar (`NotionToolbarFloating.vue`). Create `table/` feature modules for the table handle family (`TableHandle*`), cell-handle menu, selection overlay, extend controls, and alignment; move `ui/TableAlignMenu.vue` into the table alignment module. Add `packages/editor/src/components/table/index.ts` and rebuild `packages/editor/src/components/ui/index.ts` from feature exports so cross-catalog callers do not use private paths. **Files:** `packages/editor/src/components/ui/**`, `packages/editor/src/components/table/**`, `packages/editor/src/components/notion/**` consumers of table UI. **Logging:** add no runtime logs; preserve current command and editor-event logging, and emit verbose implementation progress for every moved family and the `TableAlignMenu` ownership transfer. **Dependencies:** Tasks 1–2.

<!-- Commit checkpoint: tasks 1–3 -->

### Phase 2: Normalize primitives and consumers

- [x] **Task 4: Apply the same feature-module shape to `primitives/` and update all consumers.** Move the root primitives (`Badge`, `Button`, `ButtonGroup`, `EditorOverlayTeleport`, `FloatingPositioningWrapper`, `Separator`, `Spacer`, and `Tooltip`) into named kebab-case modules, retaining and normalizing the existing avatar, card, dropdown-menu, input, menu, popover, and toolbar groups. Give every primitive feature an `index.ts`, make `packages/editor/src/components/primitives/index.ts` its sole catalog barrel, and adjust relative imports within primitives. Then update all direct consumers in `packages/editor/src/components/**`, `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue`, `packages/editor/src/index.ts`, and playground sources to use the new module/barrel paths. Update affected test-file imports and `import.meta.glob` patterns only to follow relocated production modules; do not add cases, change assertions, or expand coverage. **Files:** `packages/editor/src/components/primitives/**`, `packages/editor/src/components/**`, `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue`, `packages/editor/src/index.ts`, `apps/playground/src/**`, affected existing files under `test/editor/components/**` and `test/playground/**`. **Logging:** add no runtime logs; preserve overlay and positioning behavior, and report every consumer category whose import paths were rewritten at verbose implementation level. **Dependencies:** Task 3.

- [x] **Task 5: Remove stale paths and validate the structural migration without new tests.** Search `packages/editor/src`, `apps/playground/src`, and existing tests for deleted flat catalog paths, obsolete `public-api.ts` imports, and direct cross-feature private imports; replace any remaining occurrences or document intentional same-feature relative imports. Confirm there is one root barrel for each target catalog, no duplicate source module remains at an old path, package exports still expose the pre-migration API, and CSS imports/classes remain unchanged under `packages/editor/src/styles/**`. Run `git diff --check`, `npm run format:check`, `npm run lint`, and `npm run typecheck`; do not run or add test suites because testing is disabled for this plan. **Files:** all files changed by Tasks 2–4; no new test files. **Logging:** add no runtime logs; capture command results and a zero-result stale-path search in verbose implementation output, escalating unresolved import/type errors as blockers. **Dependencies:** Task 4.

<!-- Commit checkpoint: tasks 4–5 -->

## Acceptance Criteria

- [x] `notion/`, `ui/`, `table/`, and `primitives/` follow the same root-barrel plus kebab-case feature-module convention.
- [x] Component-specific support files live beside their owning feature; reusable behavior remains in the established `composables/`, `extensions/`, `nodes/`, and `utils/` layers.
- [x] `TableAlignMenu` is owned by `components/table/`, and all public exports from `packages/editor/src/index.ts` remain available with their existing names.
- [x] No source, playground, or existing test import references a removed component path; no duplicate old-path implementation remains.
- [x] `.ai-factory/ARCHITECTURE.md` documents ownership, public-barrel, co-location, and dependency rules that match the final tree.
- [ ] Validation passes `git diff --check`, `npm run format:check`, `npm run lint`, and `npm run typecheck`; no test additions or test-suite execution are included.
> Validation note: the migration scope passes `git diff --check`, targeted Prettier, lint, and typecheck. The full-repository `git diff --check` and `npm run format:check` remain blocked by pre-existing unrelated whitespace/formatting changes, so this global acceptance criterion stays open.

## Rework (2026-07-21)

- [x] Address blocking finding `048d7cf5db29`: update `test/editor/components/ui/slash-menu-items.test.ts` to import slash-menu items through `components/ui/slash-menu/` instead of the deleted flat module.
