<!-- handoff:task:eb722fcf-ed3d-4325-a777-e1fa083911a2 -->
# Configure Vitest

## Plan Metadata

- [ ] **Mode:** fast
- [ ] **Created:** 2026-07-10
- [ ] **Branch:** current Handoff branch / current workspace
- [ ] **Project:** Vue 3 + TypeScript + Vite + Tiptap v3 editor
- [ ] **Plan file:** `.ai-factory/plans/nastroit-vitest.md`

## Settings

- [ ] **Testing:** no new test files; this plan only prepares the Vitest infrastructure.
- [ ] **Docs:** no documentation changes; warn-only docs checkpoint.
- [ ] **Logging:** verbose implementation diagnostics while changing tooling; no runtime application logging expected for config-only work.
- [ ] **Package manager:** npm, because `package-lock.json` is present.
- [ ] **DOM environment decision:** use `jsdom` for broader ProseMirror/Tiptap DOM compatibility; do not install `happy-dom` in the same change unless implementation discovers a blocker.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** skipped by autonomous Handoff default. Relevant roadmap context exists under `Этап 2. Тестирование: фундамент`, item `Установить и настроить Vitest`, but no formal linkage was selected.

## Scope

- [x] Install Vitest runtime dependencies needed for a browser-like test environment.
- [x] Add a root `vitest.config.ts` that mirrors the existing Vite/Vue setup.
- [x] Wire the existing placeholder `npm test` script to Vitest without adding watch/coverage scripts.
- [x] Keep this task focused: no Vue Test Utils, no coverage package, no sample tests, no docs.

## Current State

- [ ] `package.json` currently has `"test": "echo \"No automated tests configured yet; skipping test phase.\""`.
- [ ] `vite.config.ts` contains only `@vitejs/plugin-vue`.
- [ ] `tsconfig.json` is strict, includes `types: ["vite/client"]`, and only includes `src/**/*.ts` and `src/**/*.vue`.
- [ ] No existing `*.test.*`, `*.spec.*`, `tests/`, or `src/test*` files were found.
- [ ] `eslint.config.js` explicitly lists `vite.config.ts` in source options, so the new config file may need the same treatment.

## Tasks

### Phase 1 — Dependencies and Scripts

- [x] Install Vitest dependencies in `package.json` and `package-lock.json`.
  - [x] Deliverable: add `vitest` and `jsdom` as dev dependencies via npm so the lockfile remains consistent.
  - [x] Expected behavior: dependency versions are resolved by npm and compatible with the existing Vite 6 / Vue 3 toolchain.
  - [x] Logging: capture npm install output in the terminal; no application logs are required.
  - [x] Dependencies: none.

- [x] Replace the placeholder test script in `package.json`.
  - [x] Deliverable: change `scripts.test` to run Vitest in CI-style mode, for example `vitest run --passWithNoTests`.
  - [x] Expected behavior: `npm test` invokes Vitest and succeeds while the repository intentionally has no tests yet.
  - [x] Logging: rely on Vitest CLI output; no runtime application logs are required.
  - [x] Dependencies: dependency installation must be complete first.

### Phase 2 — Vitest Configuration

- [x] Create `vitest.config.ts` at the repository root.
  - [x] Deliverable: export `defineConfig` from `vitest/config`, register `@vitejs/plugin-vue`, and configure `test.environment` as `jsdom`.
  - [x] Expected behavior: Vue SFC imports can be transformed in tests and browser DOM globals are available for future Tiptap/Vue tests.
  - [x] Logging: no runtime logs; keep configuration minimal and readable.
  - [x] Dependencies: dependency installation must be complete first.

- [x] Configure Vitest defaults for the no-test baseline.
  - [x] Deliverable: set `test.passWithNoTests` in `vitest.config.ts` or keep the equivalent CLI flag in `package.json`, but avoid duplicating both unless needed.
  - [x] Expected behavior: the first infrastructure-only run does not fail solely because no tests exist yet.
  - [x] Logging: Vitest CLI output should clearly state that no tests were found or executed.
  - [x] Dependencies: `vitest.config.ts` must exist.

### Phase 3 — Tooling Integration

- [x] Update `eslint.config.js` to include `vitest.config.ts` in root tooling files.
  - [x] Deliverable: extend the existing `project/source-options` file list from `vite.config.ts` to include `vitest.config.ts`, or replace both with a safe root config glob if consistent with the current style.
  - [x] Expected behavior: `npm run lint` treats the new config with the same ESM/browser-compatible parser options as `vite.config.ts`.
  - [x] Logging: rely on ESLint output; no application logs are required.
  - [x] Dependencies: `vitest.config.ts` path must be known.

- [x] Decide whether TypeScript project includes need adjustment.
  - [x] Deliverable: inspect whether existing checks cover root config files; only update `tsconfig.json` if the new config produces an actual typecheck or editor issue.
  - [x] Expected behavior: avoid broadening typecheck scope unnecessarily; root config remains valid when loaded by Vitest.
  - [x] Logging: record validation command output in terminal; no application logs are required.
  - [x] Dependencies: `vitest.config.ts` must exist.

### Phase 4 — Validation

- [x] Validate the tooling setup without adding tests.
  - [x] Deliverable: run targeted commands after implementation: `npm test`, `npm run lint`, and `npm run typecheck`.
  - [x] Expected behavior: Vitest starts successfully in `jsdom`, lint passes for the new config, and existing TypeScript checks remain green.
  - [x] Logging: preserve command output in the implementation summary, especially any warnings about no tests.
  - [x] Dependencies: all prior tasks must be complete.

## Acceptance Criteria

- [x] `package.json` contains real Vitest wiring instead of the placeholder test command.
- [x] `package-lock.json` is updated consistently by npm.
- [x] `vitest.config.ts` exists at the project root and uses `jsdom` as the test environment.
- [x] The plan does not add test files, coverage tooling, Vue Test Utils, or documentation changes.
- [x] `npm test` can run successfully in the current no-test baseline.
- [x] `npm run lint` and `npm run typecheck` remain compatible with the new setup.

## Out of Scope

- [ ] Writing unit, component, integration, or e2e tests.
- [ ] Installing Vue Test Utils.
- [ ] Installing or configuring `@vitest/coverage-v8`.
- [ ] Adding `test:watch`, `test:coverage`, or CI changes.
- [ ] Updating project documentation.

## Commit Plan

- [ ] **Commit 1:** `test: configure vitest baseline`
  - [ ] Include dependency installation, npm test script wiring, `vitest.config.ts`, and related lint/typecheck compatibility changes.

## Rework — 2026-07-11

- [x] Move the editor utility tests out of `src/editor/utils/__tests__`.
  - [x] Deliverable: place the files under `test/editor/utils/`, mirroring the tested source module.
  - [x] Expected behavior: Vitest discovers the relocated files and their imports resolve to `src/editor/utils`.
