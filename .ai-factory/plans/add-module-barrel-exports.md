<!-- handoff:task:ca8e1102-f09c-4de8-a5de-d7ce0100e914 -->
# Implementation Plan: Add Module Barrel Exports

Branch: `main`
Created: 2026-07-14

## Settings
- [x] Testing: no — requested scope excludes test changes and test execution.
- [x] Logging: no new runtime logs — this is a static export/import refactor with no runtime behavior to instrument.
- [x] Docs: no — requested scope excludes documentation changes.

## Roadmap Linkage
Milestone: "none"
Rationale: "Autonomous handoff defaults to no roadmap linkage; this internal module-boundary refactor does not update roadmap artifacts."

## Scope and Import Contract
- [x] Add internal barrel entry points at `src/editor/composables/index.ts`, `src/editor/components/primitives/index.ts`, and `src/editor/components/ui/index.ts`.
- [x] Preserve the existing public package surface in `src/editor/index.ts`; it may consume the UI barrel for its current named exports, but it must not expose additional controls, primitives, composables, or internal contexts.
- [x] Re-export each module's existing public symbols: use explicit named aliases for Vue default exports and preserve value/type exports from TypeScript helper modules, including the `composables/blocks/*` and `ui/slash-menu-items.ts` APIs.
- [x] Standardize only imports that cross one of the three new module boundaries to `@/editor/composables`, `@/editor/components/primitives`, or `@/editor/components/ui`. Keep same-module sibling imports (including primitive context modules and UI sibling components) relative so the barrels do not introduce circular initialization dependencies.
- [x] Do not modify test imports or add tests. Do not change unrelated aliases, runtime behavior, component APIs, or editor feature exports.

## Tasks

### Phase 1: Define Barrel Boundaries
- [x] **Task 1: Create complete module barrel files.**
  - [x] Files: `src/editor/composables/index.ts`, `src/editor/components/primitives/index.ts`, `src/editor/components/ui/index.ts`.
  - [x] Re-export all existing composable and block-conversion values/types from the composables barrel; expose every primitive and UI Vue component as a named export from its default export; forward public helper/type exports from primitive context modules and `ui/slash-menu-items.ts` without changing their source declarations.
  - [x] Keep export names stable and collision-free, use `export type` where TypeScript requires it, and do not add side-effect imports or runtime wrappers.
  - [x] Logging: none — no executable behavior is added; retain existing error handling and logging unchanged.

### Phase 2: Migrate Cross-Module Consumers
- [x] **Task 2: Replace eligible direct file imports with alias-backed barrel imports.** (depends on Task 1)
  - [x] Files: `src/editor/index.ts`; source consumers under `src/editor/components/notion/`, `src/editor/components/table/`, `src/editor/components/ui/`, `src/editor/components/primitives/`, `src/editor/nodes/`, and any other `src/editor/**` file that imports one of the three target module trees from outside that tree.
  - [x] Consolidate imports by module boundary: import composable values/types from `@/editor/composables`, primitive components from `@/editor/components/primitives`, and UI controls/helpers from `@/editor/components/ui`; preserve `type`-only specifiers and component local names.
  - [x] Update `src/editor/index.ts` to re-export only its already-public UI controls from the UI barrel, leaving the `NotionEditor` and `public-api` exports unchanged.
  - [x] Retain direct relative imports for files within their own barrel directory (for example, `ui`-to-`ui` and `primitives`-to-`primitives` imports) and for private implementation details not intentionally part of the barrel contract.
  - [x] Logging: none — imports are compile-time wiring only; do not add logging, telemetry, or error-boundary changes.

### Phase 3: Static Verification
- [x] **Task 3: Verify barrel integrity and alias migration without tests.** (depends on Task 2)
  - [x] Files: inspect `src/editor/composables/index.ts`, `src/editor/components/primitives/index.ts`, `src/editor/components/ui/index.ts`, `src/editor/index.ts`, and every import migrated in Task 2.
  - [x] Confirm that every named barrel export resolves, no duplicate export diagnostics occur, cross-module consumers use the `@/editor/...` entry points, and same-module imports remain direct where required to avoid cycles.
  - [x] Run `npm run typecheck` and `npm run lint`; do not run `npm test` and do not add or edit test files, per the requested scope.
  - [x] Logging: none — validation produces command output only and introduces no runtime logs.

## Completion Criteria
- [x] The three requested `index.ts` files exist and provide stable named exports for their respective module contents.
- [x] Eligible production imports use the configured `@/*` alias through the new barrels, while internal sibling imports do not create barrel cycles.
- [x] `src/editor/index.ts` preserves its existing public export set.
- [x] Type checking and linting pass; no tests or documentation changes are made.

## Suggested Commit
- [ ] `refactor: add editor module barrel exports`
