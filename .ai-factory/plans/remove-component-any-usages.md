<!-- handoff:task:9bcdcf16-7ffe-4dfb-bcb2-443117025627 -->
# Implementation Plan: Remove component any usages

Branch: main
Created: 2026-07-09

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped because this autonomous Handoff fast plan has roadmap linkage disabled by default.

## Scope
- [x] Replace all remaining `any` usages in `src/editor/components/table/TableSelectionOverlay.vue`, `src/editor/components/notion/EditorContentArea.vue`, and `src/editor/components/ui/EmojiDropdownMenu.vue`.
- [x] Prefer explicit, reusable TypeScript types for Tiptap command chains, extension storage, suggestion item payloads, transaction events, and resize metadata.
- [x] Keep runtime behavior unchanged; this is a typing-only refactor except for small helper/type extraction needed to remove casts.
- [x] Do not add tests or documentation in this task.

## Current Findings
- [x] `src/editor/components/notion/EditorContentArea.vue` casts `instance.chain().focus()` to `any` before calling `aiAccept()`.
- [x] `src/editor/components/ui/EmojiDropdownMenu.vue` casts `selectedEditor.chain().focus()` to `any` before calling `setEmoji(...)`, and should also avoid repeated context casts by typing emoji suggestion items.
- [x] `src/editor/components/table/TableSelectionOverlay.vue` types `transaction.getMeta(...)` as returning `any` inside the transaction listener.
- [x] `src/editor/extensions/tiptap-command-types.d.ts` already augments Tiptap commands for app-specific commands, but does not yet include AI accept or emoji command typing.

## Tasks

### Phase 1: Shared Tiptap Types
- [x] Task 1: Extend reusable Tiptap type definitions for command chains and storage.
  - [x] Deliverable: Update `src/editor/extensions/tiptap-command-types.d.ts` with explicit command augmentation for `aiAccept()` and `setEmoji(name: string)` so component command chains no longer require `any` casts.
  - [x] Deliverable: Add a reusable emoji storage type for `Storage.emoji` or an exported interface that matches `editor.extensionStorage.emoji?.emojis`.
  - [x] Expected behavior: Existing calls to `instance.chain().focus().aiAccept().run()` and `selectedEditor.chain().focus().setEmoji(...).run()` type-check without component-local `any` casts.
  - [x] Logging requirements: No new runtime logging; this is a declaration-only change. Preserve existing logging behavior unchanged.

### Phase 2: Component Refactors
- [x] Task 2: Refactor `EditorContentArea.vue` to use typed AI command chains.
  - [x] Deliverable: Replace `(instance.chain().focus() as any).aiAccept().run()` in `src/editor/components/notion/EditorContentArea.vue` with the typed command-chain call.
  - [x] Expected behavior: AI generation acceptance still runs once selection generation finishes with a message, then `resetUiState()` still executes.
  - [x] Dependency notes: Depends on Task 1 command augmentation for `aiAccept()`.
  - [x] Logging requirements: Do not add logs; keep the watcher side-effect behavior identical and avoid logging AI content or editor state.

- [x] Task 3: Refactor `EmojiDropdownMenu.vue` to use typed emoji commands, storage, and suggestion item context.
  - [x] Deliverable: Introduce explicit reusable aliases/interfaces in `src/editor/components/ui/EmojiDropdownMenu.vue` or a shared editor type file for emoji suggestion items, selected emoji context, and emoji storage access.
  - [x] Deliverable: Replace `(selectedEditor.chain().focus() as any).setEmoji((context as EmojiItem).name).run()` with a typed command-chain call and typed `context` handling.
  - [x] Expected behavior: Emoji filtering, sorting, rendering, and selection remain unchanged; selecting an emoji still inserts the emoji by name.
  - [x] Dependency notes: Depends on Task 1 command augmentation for `setEmoji(name: string)` and emoji storage typing.
  - [x] Logging requirements: Do not add logs; avoid logging emoji selections or suggestion queries.

- [x] Task 4: Refactor `TableSelectionOverlay.vue` transaction metadata typing.
  - [x] Deliverable: Replace `transaction: { getMeta(key: unknown): any }` in `src/editor/components/table/TableSelectionOverlay.vue` with explicit reusable types for the transaction listener payload and column-resize plugin metadata.
  - [x] Deliverable: Type metadata fields used by the overlay (`setDragging`, `setHandle`) as optional properties with `unknown`/specific nullable value shapes where the upstream plugin does not expose a public type.
  - [x] Expected behavior: Selection overlay rectangle recomputation, resize tracking, `setDragging` handling, and `setHandle` handling remain unchanged.
  - [x] Dependency notes: Can be implemented independently of command-chain typing.
  - [x] Logging requirements: Preserve the existing `console.warn` in `findAnchorCell`; do not add transaction logging because resize transactions are high-frequency.

### Phase 3: Verification
- [x] Task 5: Verify the targeted `any` removal and TypeScript compatibility.
  - [x] Deliverable: Confirm `grep -RIn "\bany\b" src/editor/components/notion/EditorContentArea.vue src/editor/components/table/TableSelectionOverlay.vue src/editor/components/ui/EmojiDropdownMenu.vue` returns no matches.
  - [x] Deliverable: Run `npm run typecheck` to confirm the new declarations and component refactors compile.
  - [x] Expected behavior: No `any` remains in the three target components, and no type errors are introduced.
  - [x] Dependency notes: Depends on Tasks 1-4.
  - [x] Logging requirements: No runtime logging changes; validation commands may print normal CLI output only.

## Commit Plan
- [ ] **Commit 1** (after tasks 1-5): `refactor: remove component any usages`

## Acceptance Criteria
- [x] `src/editor/components/notion/EditorContentArea.vue` contains no `any` and calls `aiAccept()` through typed Tiptap commands.
- [x] `src/editor/components/ui/EmojiDropdownMenu.vue` contains no `any` and has explicit emoji storage, suggestion context, and command typings.
- [x] `src/editor/components/table/TableSelectionOverlay.vue` contains no `any` and uses explicit transaction/meta payload types.
- [x] Reusable types live in the existing Tiptap declaration file or a clearly named shared type file under `src/editor/`, not as ad-hoc casts in component bodies.
- [x] Runtime behavior, UI rendering, and existing console warnings remain unchanged.
- [x] `npm run typecheck` passes.
