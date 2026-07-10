<!-- handoff:task:cec71e2b-e568-42c1-a033-9c0c2a3c6cc4 -->
# Implementation Plan: Consolidate Tiptap Type Augmentations

Branch: main
Created: 2026-07-10

## Settings
- [ ] Testing: no
- [ ] Logging: verbose for implementation notes; no new runtime logging unless consolidation exposes an existing runtime failure
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Handoff fast mode is non-interactive and defaults to no roadmap linkage; this task still matches the unchecked roadmap item for consolidating `tiptap-command-types.d.ts` augmentations.

## Scope
- [ ] Consolidate all project-owned `@tiptap/core` module augmentations into one clear declaration file.
- [ ] Preserve existing command, storage, and editor-event type coverage without changing runtime extension behavior.
- [ ] Update type imports that currently point at `src/editor/extensions/tiptap-command-types.d.ts`.
- [ ] Do not add tests or documentation changes for this task.

## Current Findings
- [ ] Canonical-but-incomplete declaration file: `src/editor/extensions/tiptap-command-types.d.ts`.
- [ ] Additional scattered `declare module '@tiptap/core'` blocks exist in:
  - [ ] `src/editor/extensions/indent.ts`
  - [ ] `src/editor/extensions/node-alignment.ts`
  - [ ] `src/editor/extensions/node-background.ts`
  - [ ] `src/editor/extensions/table-handle.ts`
- [ ] Runtime command implementations already live in their extensions and should stay there.
- [ ] Consumers import exported helper types from the current declaration file in:
  - [ ] `src/editor/components/ui/slash-menu-items.ts`
  - [ ] `src/editor/components/ui/EmojiDropdownMenu.vue`

## Tasks

### Phase 1: Audit Existing Augmentations
- [x] Task 1: Inventory every project-owned Tiptap augmentation signature before moving declarations.
  - [x] Deliverable: A complete implementation checklist covering `Commands`, `Storage`, and `EditorEvents` signatures from `src/editor/extensions/tiptap-command-types.d.ts`, `src/editor/extensions/indent.ts`, `src/editor/extensions/node-alignment.ts`, `src/editor/extensions/node-background.ts`, and `src/editor/extensions/table-handle.ts`.
  - [x] Expected behavior: No existing command chain call, storage access, or `tableHandleState` event subscription loses type coverage after consolidation.
  - [x] Files to inspect: `src/editor/extensions/tiptap-command-types.d.ts`, `src/editor/extensions/indent.ts`, `src/editor/extensions/node-alignment.ts`, `src/editor/extensions/node-background.ts`, `src/editor/extensions/table-handle.ts`, `src/editor/extensions/ui-state.ts`, `src/editor/components/ui/slash-menu-items.ts`, `src/editor/components/ui/EmojiDropdownMenu.vue`.
  - [x] Logging requirements: No runtime logging; use verbose implementation notes while comparing signatures, and treat TypeScript diagnostics as the source of truth for missed declarations.

### Phase 2: Create The Single Declaration Location
- [x] Task 2: Create `src/editor/types/tiptap-augmentations.d.ts` as the single source for Tiptap module augmentations.
  - [x] Deliverable: Move or recreate all augmentation declarations in `src/editor/types/tiptap-augmentations.d.ts`, including app-specific command groups `tableHandleExtension`, `uiState`, `aiTextPrompt`, `ai`, `emoji`, `indent`, `nodeAlignment`, and `nodeBackground`; storage entries `uiState` and `emoji`; and `EditorEvents.tableHandleState`.
  - [x] Expected behavior: `editor.commands`, `editor.chain()`, `editor.storage`, and `editor.on('tableHandleState', ...)` keep their existing inferred types without requiring local `any` casts.
  - [x] Files to change/create: `src/editor/types/tiptap-augmentations.d.ts`; optionally `src/editor/types/index.ts` if exported helper types should be re-exported from the shared types barrel.
  - [x] Dependency notes: Depends on Task 1 so every scattered signature is copied exactly once.
  - [x] Logging requirements: No runtime logging; keep the declaration file type-only, avoid side-effect imports beyond `import '@tiptap/core'`, and use explicit exported type names for compile-time assumptions such as `AiTextPromptOptions`, `EditorEmojiItem`, and `EditorEmojiStorage`.

### Phase 3: Remove Scattered Declarations And Update Imports
- [x] Task 3: Remove duplicate module augmentations from extension implementation files and migrate type imports to the new location.
  - [x] Deliverable: Delete `declare module '@tiptap/core'` blocks from `src/editor/extensions/indent.ts`, `src/editor/extensions/node-alignment.ts`, `src/editor/extensions/node-background.ts`, and `src/editor/extensions/table-handle.ts`; delete or empty the obsolete `src/editor/extensions/tiptap-command-types.d.ts`; update imports in `src/editor/components/ui/slash-menu-items.ts` and `src/editor/components/ui/EmojiDropdownMenu.vue` to use `src/editor/types/tiptap-augmentations` or the shared types barrel.
  - [x] Expected behavior: Runtime extension files contain implementations only, while all ambient Tiptap declarations live in the single canonical type file.
  - [x] Files to change: `src/editor/extensions/indent.ts`, `src/editor/extensions/node-alignment.ts`, `src/editor/extensions/node-background.ts`, `src/editor/extensions/table-handle.ts`, `src/editor/extensions/tiptap-command-types.d.ts`, `src/editor/components/ui/slash-menu-items.ts`, `src/editor/components/ui/EmojiDropdownMenu.vue`, optionally `src/editor/types/index.ts`.
  - [x] Dependency notes: Depends on Task 2 so consumers always have a replacement import path before the old declaration file is removed.
  - [x] Logging requirements: No runtime logging; if any command signature mismatch is discovered, fix the centralized declaration instead of adding temporary casts or console output.

### Phase 4: Validate Type Visibility
- [x] Task 4: Validate that the consolidated declaration file is included by TypeScript and no command typings regress.
  - [x] Deliverable: Run `npm run typecheck` and inspect any diagnostics related to Tiptap command chains, editor storage, emoji storage, AI command options, indentation commands, node alignment/background commands, or `tableHandleState` events.
  - [x] Expected behavior: Typecheck passes without restoring duplicate declarations or adding `any` casts; `tsconfig.json` already includes `src/**/*.ts`, which should include `.d.ts` files under `src/editor/types`.
  - [x] Files to inspect/change if diagnostics appear: `tsconfig.json`, `src/editor/types/tiptap-augmentations.d.ts`, and the call sites listed in Tasks 1-3.
  - [x] Dependency notes: Depends on Tasks 2 and 3.
  - [x] Logging requirements: No runtime logging; capture failing TypeScript diagnostic names/locations in implementation notes, then resolve them in declarations or import paths.

## Acceptance Criteria
- [x] Exactly one project-owned `declare module '@tiptap/core'` location remains for app-specific Tiptap augmentations.
- [x] App-specific Tiptap command groups remain typed: table handles, UI state, AI prompt/accept, emoji, indent, node alignment, and node background.
- [x] Tiptap storage remains typed for `uiState` and `emoji`.
- [x] `tableHandleState` remains typed through `EditorEvents`.
- [x] Existing component imports no longer reference `src/editor/extensions/tiptap-command-types.d.ts`.
- [x] No new tests or documentation files are added.
- [x] `npm run typecheck` passes.

## Implementation Notes
- [x] Prefer `src/editor/types/tiptap-augmentations.d.ts` because `src/editor/types/` already holds shared editor types and is a clearer location than implementation-focused `src/editor/extensions/`.
- [x] Keep runtime code unchanged except for removing ambient declarations from extension files.
- [x] Use type-only imports in the declaration file for `UiEditorState`, `TableHandleState`, `EmojiItem`, and `EmojiStorage`.
- [x] If deleting `src/editor/extensions/tiptap-command-types.d.ts` creates stale imports, update consumers in the same change set rather than leaving a compatibility shim.
