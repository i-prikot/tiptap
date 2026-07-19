<!-- handoff:task:bfdf7a86-62e8-4549-9405-4a2de2b74125 -->
# Configure TypeScript Project References

**Branch:** `main`  
**Created:** 2026-07-17  
**Task type:** configuration refactor

## Goal

Make the npm-workspaces monorepo use one explicit TypeScript solution contract: shared compiler settings live in `tsconfig.base.json`, project references model the package dependency graph, and internal package names resolve to source during local development without exposing private source paths.

## Current Baseline

- [ ] `tsconfig.base.json` already provides strict shared compiler options and source aliases for `@i-prikot/editor-schema` and `@i-prikot/editor`.
- [ ] The root `tsconfig.json` already lists `schema`, `editor`, `renderer`, and `playground` as solution projects.
- [ ] Package references currently follow `schema → editor`, `schema → renderer`, and `schema/editor → playground`; however, the shared alias table does not cover the public `@i-prikot/renderer` entry point.
- [ ] Vite uses separate source aliases for runtime development. Keep those aliases aligned with TypeScript rather than adding a wildcard path mapping or a new alias-resolution plugin.

## Settings

- [x] **Testing:** no automated test tasks (explicit task setting).
- [x] **Validation:** run TypeScript/Vue TypeScript solution-build and affected workspace build/typecheck commands only; this is configuration validation, not a test task.
- [x] **Logging:** verbose diagnostic output for validation commands; no runtime logging changes are required because this task changes build metadata only.
- [x] **Documentation:** no documentation changes or documentation checkpoint.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** skipped in autonomous Handoff fast mode.

## Tasks

### Phase 1 — Establish the TypeScript solution contract

- [x] **1. Centralize shared compiler options and public workspace aliases.**  
  **Files:** `tsconfig.base.json`.  
  Keep language target, strictness, bundler resolution, standard libraries, and `baseUrl` in the base config. Define exact source aliases for every public internal package entry point: `@i-prikot/editor-schema`, `@i-prikot/editor`, and `@i-prikot/renderer`. Do not introduce `@i-prikot/*` or package wildcard mappings, so package-private modules remain inaccessible across workspace boundaries; keep the CSS subpath as a Vite-only runtime alias.  
  **Expected behavior:** dependent packages resolve their public workspace imports to current source during development while retaining package-boundary discipline.  
  **Logging:** no application logging; run subsequent validation commands with verbose compiler diagnostics.

- [x] **2. Reconcile root and leaf project references with the package graph.**  
  **Files:** `tsconfig.json`, `packages/schema/tsconfig.json`, `packages/editor/tsconfig.json`, `packages/renderer/tsconfig.json`, `apps/playground/tsconfig.json`.  
  Make the root config a solution-only project with an empty file set and references in dependency-safe order. Preserve `schema` as the composite leaf; make `editor` and `renderer` composite projects referencing `schema`; keep `playground` composite/no-emit and directly reference both packages it imports. Ensure declaration output, `rootDir`, and `outDir` remain package-local and inherited compiler options come only from `tsconfig.base.json`.  
  **Expected behavior:** `tsc --build`/`vue-tsc --build` can discover and schedule the complete dependency graph, rebuilding a changed upstream package before dependents.  
  **Logging:** no application logging; use `--verbose` during build-mode validation to expose project scheduling and incremental decisions.

### Phase 2 — Use the solution graph in workspace workflows

- [x] **3. Simplify workspace type-check orchestration around the root solution and preserve bundling responsibilities.**  
  **Files:** `package.json`, `apps/playground/vite.config.ts`, `packages/editor/vite.config.ts`, `vitest.config.ts` (only if an alias must change to match the finalized TypeScript package entry points).  
  Replace hand-maintained, partially duplicated root typecheck sequencing with the root `vue-tsc --build` solution command. Keep package `build` scripts responsible for their own declaration generation and Vite bundling, and retain existing Vite/Vitest source aliases for runtime resolution because TypeScript `paths` do not configure those tools. Update an alias only when it differs from the final exact public-entry-point contract.  
  **Expected behavior:** one root typecheck command validates the referenced graph, while library/app builds still produce their required runtime artifacts and local development resolves workspace sources consistently.  
  **Logging:** keep workspace-identifying `echo` output where build scripts execute; run solution commands with verbose compiler diagnostics and do not add runtime logs.

### Phase 3 — Validate configuration behavior

- [x] **4. Verify clean incremental solution builds and dependent-package resolution.**  
  **Files:** no production-file changes expected; inspect generated ignored `*.tsbuildinfo` files only.  
  From the repository root, run `vue-tsc --build --verbose` (and `tsc --build --verbose` where it remains applicable), then run the root `npm run typecheck` and the affected workspace build commands. Confirm the compiler lists the four projects in dependency order, all imports of the three public `@i-prikot/*` package names resolve, declaration output remains under each package `dist/`, and no generated build metadata is tracked by Git.  
  **Expected behavior:** a first build completes successfully and a second build reports projects as up to date unless an input changed.  
  **Logging:** capture verbose compiler/workspace output as implementation evidence; no application logging changes.

## Acceptance Criteria

- [x] `tsconfig.base.json` is the single source for shared compiler options and exact public internal-package paths.
- [x] `tsconfig.json` and all workspace `tsconfig.json` files form a valid composite project-reference graph matching package dependencies.
- [x] `@i-prikot/editor-schema`, `@i-prikot/editor`, and `@i-prikot/renderer` resolve consistently in TypeScript; existing CSS runtime resolution remains handled by Vite.
- [x] `npm run typecheck` uses the root TypeScript solution rather than manually reproducing dependency ordering.
- [x] A clean `vue-tsc --build --verbose` succeeds, and an unchanged follow-up build is incremental.
- [x] No automated tests or documentation changes are introduced.

## Out of Scope

- [ ] Publishing packages, changing package versions/exports, or adding a new Vite alias plugin.
- [ ] Exposing internal source modules through wildcard TypeScript aliases.
- [ ] Refactoring editor, schema, renderer, or playground application code.
