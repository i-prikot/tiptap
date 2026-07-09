<!-- handoff:task:ed99b437-c34a-46b1-be99-3f1612b5a7cb -->
# Implementation Plan: Remove any from slash menu items

Branch: main
Created: 2026-07-09

## Settings
- [ ] Testing: no
- [ ] Logging: verbose (validation output only; no app runtime logs for this type-only cleanup)
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 1. TypeScript: строгость и типы — Устранить все использования `any` в `slash-menu-items.ts` (4 шт.)"
Rationale: This task directly completes the roadmap item for removing the four explicit `any` casts from the slash menu item module.

## Scope
- [ ] Target file: `src/editor/components/ui/slash-menu-items.ts`
- [ ] Related type file: `src/editor/extensions/tiptap-command-types.d.ts`
- [ ] Consumer check: `src/editor/components/ui/SlashDropdownMenu.vue`
- [ ] Current issue: four explicit `as any` casts in `slash-menu-items.ts` around AI chain commands and `insertTable`.
- [ ] Out of scope: automated tests, documentation changes, broad refactors, and removing unrelated `any` usages in other files.

## Implementation Notes
- [ ] Prefer Tiptap module augmentation over local unsafe casts when commands are real editor commands.
- [ ] Keep `slash-menu-items.ts` as the source of slash item metadata and behavior; avoid moving files for this focused cleanup.
- [ ] Use explicit generic aliases for slash menu suggestion items so callbacks, metadata, and `customItems` remain strongly typed.
- [ ] Do not add runtime logging for this type-only cleanup; if an implementation step surfaces unexpected missing commands, use existing validation errors rather than console output.

## Tasks

### Phase 1: Command Type Augmentation
- [x] Task 1: Add precise Tiptap command declarations in `src/editor/extensions/tiptap-command-types.d.ts` for the slash menu commands currently hidden behind casts: `aiGenerationShow()`, `aiTextPrompt({ stream, format, text })`, and `insertTable({ rows, cols, withHeaderRow })` if not already provided by installed Tiptap types. Logging requirements: no runtime logging; document any compile-time-only assumptions in type names and option interfaces, not comments.

### Phase 2: Slash Menu Item Types
- [x] Task 2: Introduce typed aliases/interfaces in `src/editor/components/ui/slash-menu-items.ts` for slash menu suggestion items, select callback props, action args, metadata, AI prompt options, and table insertion options as needed. Update `SlashMenuConfig.customItems`, `getSlashMenuItems`, local `items`, and grouped return data to use the slash-specific item type instead of bare `SuggestionItem` where it improves inference. Logging requirements: no runtime logging; preserve existing behavior and use TypeScript compile errors as the feedback mechanism.

### Phase 3: Remove Explicit any Casts
- [x] Task 3: Replace the four `as any` chain casts in `src/editor/components/ui/slash-menu-items.ts` with typed command chains backed by the command augmentation from Task 1. Ensure `continue_writing`, `ai_ask_button`, and `table` actions still call the same commands with the same arguments and ordering. Logging requirements: no runtime logging; keep action side effects unchanged.

### Phase 4: Consumer Type Alignment
- [x] Task 4: Check `src/editor/components/ui/SlashDropdownMenu.vue` against the refined slash menu item type. If the exported item type changes, update imports and `GroupedEntries` so `filterSuggestionItems`, `groupItems`, and `onSelect` keep their current behavior without widening back to `any`. Logging requirements: no runtime logging; do not add UI diagnostics for a type-only change.

### Phase 5: Validation
- [x] Task 5: Run focused validation commands after implementation: `grep -n "\\bany\\b" src/editor/components/ui/slash-menu-items.ts`, `npm run typecheck`, and optionally `npm run lint` if typecheck passes. The task is complete only when the target file has zero `any` occurrences and the changed types compile. Logging requirements: capture command output in the implementation summary; do not add application logging.

## Acceptance Criteria
- [x] `src/editor/components/ui/slash-menu-items.ts` contains zero `any` usages.
- [x] The slash menu keeps the same runtime behavior for AI continue, AI ask, table insertion, and existing menu item selection.
- [x] Slash menu item definitions and callbacks have precise TypeScript types, including `customItems` and generated menu items.
- [x] Tiptap command augmentation lives in the existing command type declaration file rather than as inline unsafe casts.
- [x] No tests or docs are added for this task.
