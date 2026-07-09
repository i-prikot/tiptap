<!-- handoff:task:78bb9d5a-977a-4aa0-9533-7d45643e038d -->
# Fix noImplicitAny Compilation Errors

- [x] **Created:** 2026-07-09
- [x] **Mode:** fast
- [x] **Branch:** main
- [x] **Plan file:** `.ai-factory/plans/fix-noimplicitany-compilation-errors.md`
- [x] **Task:** Resolve all TypeScript compilation errors that appear after enabling `noImplicitAny`, adding explicit types where needed without weakening strictness.

## Settings

- [x] **Testing:** no — user requested `tests:false`; do not add or modify automated tests for this task.
- [x] **Docs:** no — user requested `docs:false`; do not add documentation-only tasks.
- [x] **Logging:** verbose for implementation diagnostics, but no runtime logging should be added solely to fix type errors.
- [x] **Strictness:** keep `strict`/`noImplicitAny` enabled; do not disable compiler checks, add blanket `any`, or silence errors with `@ts-ignore`.

## Roadmap Linkage

- [x] **Milestone:** none
- [x] **Rationale:** skipped for this fast handoff plan; this is a compile-hardening maintenance task.

## Current Findings

- [x] `tsconfig.json` already sets `strict: true`; `./node_modules/.bin/tsc --showConfig` reports `noImplicitAny: true`.
- [x] A bounded `./node_modules/.bin/vue-tsc --noEmit --pretty false --noErrorTruncation` run completed successfully during planning, so implementation must first reproduce the reported failure in the current handoff environment before editing.
- [x] Existing explicit `any` hotspots are concentrated around command-chain extensions, suggestion options, ProseMirror transaction metadata, style attrs, and JSON-like document content; they did not produce implicit-any diagnostics in this run.
- [x] Implementation reran strict diagnostics in the handoff environment on 2026-07-09; no TypeScript diagnostics were produced, so no source edits were required.

## Constraints

- [x] Keep all changes inside `/home/www/tiptap`.
- [x] Prefer precise library types from Vue, Tiptap, ProseMirror, Yjs, and local interfaces over broad `any`.
- [x] Use `unknown`, discriminated unions, generics, or narrow local structural types when upstream libraries do not expose a convenient type.
- [x] Preserve runtime behavior exactly; this task is type-only unless a tiny refactor is required to express safe types.
- [x] Do not introduce test tasks or documentation tasks.

## Tasks

### Phase 1 — Reproduce And Classify Diagnostics

- [x] **Run compiler diagnostics with noImplicitAny explicitly verified.**
  - [x] Files/commands: `tsconfig.json`, `npm run typecheck`, `./node_modules/.bin/vue-tsc --noEmit --pretty false --noErrorTruncation`.
  - [x] Deliverable: no `TS7006`, `TS7031`, `TS7053`, or related implicit-any diagnostics reproduced in this handoff environment.
  - [x] Logging requirements: kept verbose terminal diagnostics while working; did not add application runtime logs.
  - [x] Dependency notes: inspected the current branch and confirmed only one `tsconfig.json` exists before making code changes.

### Phase 2 — Type Callback And Event Boundaries

- [x] **Add explicit types to Vue callback parameters and DOM handlers.**
  - [x] Files to inspect/change: `src/editor/components/**/*.vue`, especially watcher/computed callbacks and event handlers in `src/editor/components/notion/`, `src/editor/components/primitives/`, `src/editor/components/table/`, and `src/editor/components/ui/` (no diagnostics required source edits).
  - [x] Deliverable: no affected Vue callback or DOM handler diagnostics were present, so no component edits were required.
  - [x] Logging requirements: logged only compiler diagnostics in the terminal; did not add console logging to Vue components.
  - [x] Dependency notes: Phase 1 produced zero diagnostics, so no callback boundaries were edited.

- [x] **Type Tiptap command/action callbacks without command-chain casts where possible.**
  - [x] Files to inspect/change: `src/editor/components/notion/EditorContentArea.vue`, `src/editor/components/ui/slash-menu-items.ts`, `src/editor/components/ui/EmojiDropdownMenu.vue`, `src/editor/extensions/tiptap-command-types.d.ts` (no diagnostics required source edits).
  - [x] Deliverable: no affected command/action callback diagnostics were present, and no new casts were introduced.
  - [x] Logging requirements: kept compiler diagnostics for command call sites; no runtime logs were added.
  - [x] Dependency notes: no module augmentation changes were needed because diagnostics did not reproduce.

### Phase 3 — Type ProseMirror, Tiptap, And Suggestion Data

- [x] **Add explicit ProseMirror/Tiptap types at plugin and transaction boundaries.**
  - [x] Files to inspect/change: `src/editor/extensions/table-handle.ts`, `src/editor/extensions/ui-state.ts`, `src/editor/extensions/triple-click-block-selection.ts`, `src/editor/components/table/TableSelectionOverlay.vue`, `src/editor/utils/table-actions.ts`, `src/editor/utils/table-utils.ts`, `src/editor/utils/tiptap-utils.ts` (no diagnostics required source edits).
  - [x] Deliverable: no affected plugin or transaction boundary diagnostics were present, so no source edits were required.
  - [x] Logging requirements: recorded diagnostic result in terminal notes; did not add runtime logging to editor plugins.
  - [x] Dependency notes: editor event names and metadata keys were untouched.

- [x] **Type suggestion menu state, items, and extension option access.**
  - [x] Files to inspect/change: `src/editor/utils/suggestion/suggestion.ts`, `src/editor/components/ui/SuggestionMenu.vue`, `src/editor/components/ui/slash-menu-items.ts`, `src/editor/components/ui/MentionDropdownMenu.vue`, `src/editor/components/ui/EmojiDropdownMenu.vue` (no diagnostics required source edits).
  - [x] Deliverable: no affected suggestion menu diagnostics were present, so no source edits were required.
  - [x] Logging requirements: kept verbose compiler output locally; no user-facing or runtime logging changes.
  - [x] Dependency notes: Phase 1 produced zero diagnostics, so no suggestion typings were changed.

### Phase 4 — Replace Unsafe JSON-Like Any Shapes

- [x] **Introduce narrow reusable JSON/document attribute types where diagnostics require them.**
  - [x] Files to inspect/change: `src/editor/utils/selection-utils.ts`, `src/editor/utils/tiptap-utils.ts`, `src/editor/content/default-content.ts`, affected component attr readers such as `src/editor/components/ui/ColorTextPopover.vue` (no diagnostics required source edits).
  - [x] Deliverable: no JSON-like implicit-any diagnostics were present, so no broad rewrites were made.
  - [x] Logging requirements: documented compiler diagnostic result in terminal output; did not add runtime logs.
  - [x] Dependency notes: avoided unrelated explicit-`any` rewrites because they were not needed for an implicit-any fix.

### Phase 5 — Validate Strict Compilation

- [x] **Run final strict typecheck and remove temporary artifacts.**
  - [x] Files/commands: `npm run typecheck`, `./node_modules/.bin/vue-tsc --noEmit --pretty false --noErrorTruncation`.
  - [x] Deliverable: `vue-tsc` passes with `strict` and `noImplicitAny` enabled, and no compiler options are weakened.
  - [x] Logging requirements: final compiler commands completed successfully; no runtime logging changes.
  - [x] Dependency notes: no non-implicit-any errors appeared.

## Acceptance Criteria

- [x] `npm run typecheck` completes successfully.
- [x] `tsconfig.json` keeps `strict: true` and does not set `noImplicitAny: false`.
- [x] No new `@ts-ignore`, `@ts-expect-error`, or blanket `any` casts are introduced to hide diagnostics.
- [x] No formerly implicit parameters/destructured bindings were detected in this handoff environment.
- [x] Runtime editor behavior remains unchanged.

## Commit Plan

- [x] Checkpoint 1 after Phases 1-3: skipped because no source changes were required.
- [x] Checkpoint 2 after Phases 4-5: skipped because no source changes were required.
