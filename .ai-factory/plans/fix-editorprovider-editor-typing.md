<!-- handoff:task:a858ab58-5a70-4b8d-ad8b-c0a328e2f587 -->
# Implementation Plan: Fix EditorProvider Editor Typing

Branch: main
Created: 2026-07-10

## Settings
- [x] Testing: no
- [x] Logging: verbose
- [x] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped because this autonomous Handoff fast plan was requested with no interactive questions.

## Context
- [x] Current unsafe cast: `provideTiptapEditor(editor as never)` in `src/editor/components/notion/EditorProvider.vue:218`.
- [x] Installed Tiptap Vue type: `useEditor()` returns `ShallowRef<Editor | undefined>` from `node_modules/@tiptap/vue-3/dist/index.d.ts`.
- [x] Current provider contract: `provideTiptapEditor(editor: ShallowRef<Editor | null>)` in `src/editor/composables/useTiptapEditor.ts:15`.
- [x] Root cause: context typing only accepts `null` as the empty editor state, while Tiptap Vue uses `undefined` before initialization.

## Tasks

### Phase 1: Type Contract
- [x] Task 1: Update `src/editor/composables/useTiptapEditor.ts` so the provided editor context accepts the real `useEditor()` ref shape without casts.
  - [x] Deliverable: replace the narrow `ShallowRef<Editor | null>` provider contract with a readable alias such as `Readonly<Ref<MaybeEditor>>`, where `MaybeEditor` already includes `Editor | null | undefined`.
  - [x] Expected behavior: `provideTiptapEditor(editor)` accepts the `ShallowRef<Editor | undefined>` returned by `useEditor()` and still supports existing injected consumers.
  - [x] Logging requirements: do not add runtime logging; this is a type-only dependency-injection contract change with no runtime branch to instrument.
  - [x] Dependency notes: complete before changing `EditorProvider.vue`, because the component call site depends on this contract.

### Phase 2: Provider Call Site
- [x] Task 2: Replace the unsafe cast in `src/editor/components/notion/EditorProvider.vue` with the correctly typed provider call.
  - [x] Deliverable: change `provideTiptapEditor(editor as never)` to `provideTiptapEditor(editor)` after Task 1 makes the signature compatible.
  - [x] Expected behavior: the editor instance is provided to descendants exactly as before, preserving the loading state where `editor.value` is initially `undefined`.
  - [x] Logging requirements: do not add runtime logging; preserving existing editor lifecycle behavior is required, and no new observable event is introduced.
  - [x] Dependency notes: depends on Task 1.

### Phase 3: Consumer Compatibility
- [x] Task 3: Verify `useTiptapEditor()` continues to return `ComputedRef<Editor | null>` for all consumers under `src/editor/components/**`.
  - [x] Deliverable: keep the composable fallback behavior where explicit editors take priority, injected `undefined`/`null` becomes `null`, and consumer code does not need changes.
  - [x] Expected behavior: callers using `useTiptapEditor()`, `useTiptapEditor(computed(() => props.editor))`, and direct editor props retain the same public return type.
  - [x] Logging requirements: do not add runtime logging; this task only confirms computed normalization and type compatibility.
  - [x] Dependency notes: depends on Task 1 and should be reviewed before final validation.

### Phase 4: Validation
- [x] Task 4: Run type-focused validation for the typing fix without adding tests.
  - [x] Deliverable: run `npm run typecheck` and address only failures caused by the changed provider typing.
  - [x] Expected behavior: TypeScript accepts `provideTiptapEditor(editor)` without `as never`, and no unrelated files are refactored.
  - [x] Logging requirements: no runtime logging changes; if validation fails, report compiler diagnostics with file paths and line numbers.
  - [x] Dependency notes: depends on Tasks 1-3.

## Implementation Notes
- [x] Prefer importing Vue’s generic `Ref` type instead of widening to `any` or reintroducing casts.
- [x] Keep the injection value readonly from the composable’s perspective because consumers only read `contextEditor.value`.
- [x] Preserve `MaybeEditor = Editor | null | undefined`; it already models explicit editor props and the Tiptap initialization gap.
- [x] Do not add documentation updates or automated test files for this task.
