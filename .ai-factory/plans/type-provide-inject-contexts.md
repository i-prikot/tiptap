<!-- handoff:task:af290d5b-2dcd-4ea0-a649-da3c9cefe983 -->
# Implementation Plan: Type provide inject contexts

Branch: main
Created: 2026-07-10

## Settings
- [x] Testing: no
- [x] Logging: verbose
- [x] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped because this autonomous Handoff fast plan was requested with no interactive questions; related roadmap item is “Проверить и типизировать все `provide/inject` контексты через `InjectionKey<T>`”.

## Scope
- [x] Review every Vue `provide()` / `inject()` context under `src/` and ensure each uses a typed `InjectionKey<T>` rather than string keys, symbols without generics, casts, or implicit `unknown` injection values.
- [x] Keep runtime behavior unchanged; this is a TypeScript-focused dependency-injection audit and normalization task.
- [x] Preserve the existing colocated context-file pattern for primitive components and composable-local provider patterns for editor-level contexts unless an actual typing gap requires extraction.
- [x] Do not add automated tests or documentation updates for this task.

## Current Findings
- [x] Current typed primitive contexts: `src/editor/components/primitives/avatar/avatar-context.ts`, `src/editor/components/primitives/dropdown-menu/dropdown-menu-context.ts`, and `src/editor/components/primitives/menu/menu-context.ts` already export `InjectionKey<T>` constants.
- [x] Current typed editor composables: `src/editor/composables/useAi.ts`, `src/editor/composables/useCollab.ts`, `src/editor/composables/useTiptapEditor.ts`, `src/editor/composables/useToc.ts`, and `src/editor/composables/useUser.ts` already declare `InjectionKey<T>` constants.
- [x] Current provider/consumer call sites are in `Avatar.vue`, `AvatarFallback.vue`, `AvatarImage.vue`, `DropdownMenu.vue`, `DropdownMenuContent.vue`, `DropdownMenuTrigger.vue`, `Menu.vue`, `MenuContent.vue`, and the editor context composables.
- [x] No string-key `provide()` / `inject()` usage was found in the initial scan, so implementation should avoid broad rewrites and focus on closing any missed or newly discovered typing gaps.

## Tasks

### Phase 1: Context Inventory
- [x] Task 1: Build the authoritative inventory of Vue dependency-injection usage under `src/`.
  - [x] Deliverable: Search all `*.ts` and `*.vue` files for `provide(`, `inject(`, and `InjectionKey<`, then classify each context as primitive component context, editor composable context, or non-context mention.
  - [x] Deliverable: Confirm whether every real provider has a matching typed key and every consumer imports or references that same key.
  - [x] Expected behavior: The implementer has a complete list of context keys and call sites before changing code, preventing accidental missed contexts.
  - [x] Files to inspect: `src/editor/components/primitives/**`, `src/editor/composables/**`, and any additional `src/**/*.vue` or `src/**/*.ts` matches.
  - [x] Logging requirements: Do not add runtime logging; this is a static audit. If the audit finds a gap, record it in implementation notes with file paths and line numbers.

### Phase 2: Primitive Context Normalization
- [x] Task 2: Verify and normalize typed primitive component contexts.
  - [x] Deliverable: Ensure `avatarInjectionKey`, `dropdownMenuInjectionKey`, and `menuInjectionKey` remain declared as `InjectionKey<AvatarContext>`, `InjectionKey<DropdownMenuContext>`, and `InjectionKey<MenuContext>` respectively.
  - [x] Deliverable: If any primitive `inject()` consumer needs a missing-provider guard or typed default to avoid unsafe nullable access, add the smallest local type-safe guard that preserves current behavior.
  - [x] Expected behavior: Avatar, dropdown-menu, and menu components keep the same runtime behavior while their injected contexts are inferred from `InjectionKey<T>` with no casts.
  - [x] Files to change if needed: `src/editor/components/primitives/avatar/avatar-context.ts`, `src/editor/components/primitives/avatar/Avatar.vue`, `src/editor/components/primitives/avatar/AvatarFallback.vue`, `src/editor/components/primitives/avatar/AvatarImage.vue`, `src/editor/components/primitives/dropdown-menu/dropdown-menu-context.ts`, `src/editor/components/primitives/dropdown-menu/DropdownMenu.vue`, `src/editor/components/primitives/dropdown-menu/DropdownMenuContent.vue`, `src/editor/components/primitives/dropdown-menu/DropdownMenuTrigger.vue`, `src/editor/components/primitives/menu/menu-context.ts`, `src/editor/components/primitives/menu/Menu.vue`, `src/editor/components/primitives/menu/MenuContent.vue`.
  - [x] Dependency notes: Depends on Task 1 inventory so no primitive context is missed.
  - [x] Logging requirements: Do not add runtime logging; missing-provider handling should use existing error/guard patterns only if the current component already expects a provider boundary.

### Phase 3: Editor Composable Context Normalization
- [x] Task 3: Verify and normalize typed editor-level composable contexts.
  - [x] Deliverable: Ensure AI, collaboration, Tiptap editor, TOC, and user contexts each declare a concrete context type and a matching `InjectionKey<T>` with no `any`, `unknown`, or `as` casts around `provide()` / `inject()`.
  - [x] Deliverable: Export context interfaces only where cross-file reuse requires it; keep injection keys private when they are intentionally encapsulated by `provideX()` / `useX()` composables.
  - [x] Expected behavior: `useAi()`, `useCollab()`, `useTiptapEditor()`, `useToc()`, and `useUser()` return the same public types and throw or fall back exactly as they do now.
  - [x] Files to change if needed: `src/editor/composables/useAi.ts`, `src/editor/composables/useCollab.ts`, `src/editor/composables/useTiptapEditor.ts`, `src/editor/composables/useToc.ts`, `src/editor/composables/useUser.ts`.
  - [x] Dependency notes: Depends on Task 1 inventory; should be done before final scans so composable-local changes are included.
  - [x] Logging requirements: Do not add runtime logging; these are type-contract changes only. Preserve existing `console.error` behavior in token-fetch helpers.

### Phase 4: Unsafe Pattern Removal
- [x] Task 4: Remove any untyped dependency-injection patterns discovered during the audit.
  - [x] Deliverable: Replace any string-key or bare-symbol `provide()` / `inject()` usage with a named `InjectionKey<T>` and a colocated or composable-local context type following existing project style.
  - [x] Deliverable: Remove provider/injector casts such as `as any`, `as unknown as`, or generic `inject<T>(...)` workarounds when a proper `InjectionKey<T>` can express the contract.
  - [x] Expected behavior: TypeScript infers provider values and injected values directly from the key, with no runtime API changes to components or composables.
  - [x] Files to change if needed: any `src/**/*.ts` or `src/**/*.vue` file identified by Task 1 that is not already covered by Tasks 2-3.
  - [x] Dependency notes: Depends on Tasks 1-3 so changes are targeted and do not duplicate existing typed context declarations.
  - [x] Logging requirements: Do not add runtime logging; if a missing-provider error path is introduced, use a concise thrown `Error` consistent with existing `useX()` composables rather than logging.

### Phase 5: Validation
- [x] Task 5: Validate that all Vue provide/inject contexts are strongly typed without adding tests.
  - [x] Deliverable: Run a source scan confirming every real `provide(` and `inject(` call is paired with a typed `InjectionKey<T>` and no string-key context remains under `src/`.
  - [x] Deliverable: Run `npm run typecheck` and address only type errors caused by the context typing changes.
  - [x] Deliverable: Optionally run `npm run lint` if touched files include import ordering, unused imports, or Vue script changes likely to trigger lint rules.
  - [x] Expected behavior: TypeScript passes, no new `any` casts are introduced, and runtime dependency-injection behavior remains unchanged.
  - [x] Dependency notes: Depends on Tasks 1-4.
  - [x] Logging requirements: No runtime logging changes; validation commands may print normal CLI diagnostics only.

## Commit Plan
- [ ] **Commit 1** (after tasks 1-5): `refactor: type vue injection contexts`

## Acceptance Criteria
- [x] Every Vue context under `src/` uses a named `InjectionKey<T>` with a concrete context type.
- [x] No real `provide()` or `inject()` call under `src/` uses a string key, untyped symbol, `any` cast, or `unknown` workaround for context typing.
- [x] Existing provider/consumer behavior for avatar, dropdown-menu, menu, AI, collaboration, Tiptap editor, TOC, and user contexts is preserved.
- [x] Context key placement follows current project conventions: primitive contexts in `*-context.ts`, composable-owned contexts inside their `useX.ts` modules unless reuse requires extraction.
- [x] `npm run typecheck` passes after implementation.
