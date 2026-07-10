<!-- handoff:task:8427149c-9516-42e4-b7ef-fd8936f82e22 -->
# Configure Vue Test Utils and Coverage

## Plan Metadata

- [ ] **Mode:** fast
- [ ] **Created:** 2026-07-10
- [ ] **Branch:** current Handoff branch / current workspace
- [ ] **Project:** Vue 3 + TypeScript + Vite + Vitest + Tiptap v3 editor
- [ ] **Plan file:** `.ai-factory/plans/nastroit-vue-test-utils.md`

## Settings

- [ ] **Testing:** no component test cases in this task; configure infrastructure only.
- [ ] **Docs:** no documentation changes; warn-only docs checkpoint.
- [ ] **Logging:** verbose terminal diagnostics while changing tooling; no runtime application logging expected for config-only work.
- [ ] **Package manager:** npm, because `package-lock.json` is present.
- [ ] **DOM environment decision:** keep `jsdom`, already configured in `vitest.config.ts`, for Vue + ProseMirror/Tiptap DOM compatibility.
- [ ] **Coverage decision:** use `@vitest/coverage-v8`; do not add coverage thresholds yet because the repository has no test suite baseline.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** skipped by autonomous Handoff default. Relevant roadmap context exists under `Этап 2. Тестирование: фундамент`, item `Установить и настроить Vue Test Utils + @vitest/coverage-v8`, but no formal linkage was selected.

## Scope

- [ ] Install Vue component testing and coverage dependencies.
- [ ] Configure Vitest so Vue Test Utils component tests can mount Vue SFCs in `jsdom`.
- [ ] Add npm scripts for watch mode and coverage collection.
- [ ] Add a minimal shared test setup file for future component tests.
- [ ] Keep this task focused: no sample component tests, no coverage threshold policy, no docs updates, no CI changes.

## Current State

- [ ] `package.json` already has `vitest`, `jsdom`, and `test: "vitest run"`.
- [ ] `package.json` does not yet include `@vue/test-utils`, `@vitest/coverage-v8`, `test:watch`, or `test:coverage`.
- [ ] `vitest.config.ts` exists, registers `@vitejs/plugin-vue`, uses `environment: 'jsdom'`, and sets `passWithNoTests: true`.
- [ ] `eslint.config.js` already ignores `coverage/**` and includes `vitest.config.ts` in root tooling files.
- [ ] No existing `*.test.*`, `*.spec.*`, `tests/`, or shared test setup files were found during planning.

## Tasks

### Phase 1 — Dependencies and Scripts

- [x] Install component testing and coverage dependencies.
  - [x] Deliverable: add `@vue/test-utils` and `@vitest/coverage-v8` to `devDependencies` via npm, updating `package.json` and `package-lock.json` together.
  - [x] Expected behavior: dependency versions resolve against the existing Vue 3, Vite 6, Vitest 4, and TypeScript toolchain without manual lockfile edits.
  - [x] Logging: capture the full `npm install --save-dev @vue/test-utils @vitest/coverage-v8` terminal output for troubleshooting install or peer-dependency issues.
  - [x] Dependencies: none.

- [x] Add npm scripts for interactive tests and coverage.
  - [x] Deliverable: keep `scripts.test` as CI-style `vitest run`, add `scripts.test:watch` as `vitest`, and add `scripts.test:coverage` as `vitest run --coverage`.
  - [x] Expected behavior: `npm test` runs once, `npm run test:watch` starts watch mode, and `npm run test:coverage` invokes the configured V8 coverage provider.
  - [x] Logging: rely on npm and Vitest CLI output; verify script names are visible in `npm run` output if needed.
  - [x] Dependencies: dependency installation should be complete first so the coverage script can resolve its provider.

### Phase 2 — Vitest Component Test Configuration

- [x] Extend `vitest.config.ts` for Vue Test Utils usage.
  - [x] Deliverable: add `test.setupFiles` pointing to a shared setup file, keep `environment: 'jsdom'`, and preserve `passWithNoTests: true` for the infrastructure-only baseline.
  - [x] Expected behavior: future Vue SFC component tests can import `mount` or `shallowMount` from `@vue/test-utils` and run with browser-like globals.
  - [x] Logging: keep config changes minimal; rely on Vitest startup output to confirm the config loads.
  - [x] Dependencies: scripts and dependencies should be present first.

- [x] Configure V8 coverage collection in `vitest.config.ts`.
  - [x] Deliverable: set `coverage.provider` to `v8`, configure useful reporters such as `text`, `html`, and `json-summary`, and keep output under `coverage/`.
  - [x] Expected behavior: `npm run test:coverage` writes coverage artifacts to the already ignored `coverage/` directory and prints a readable terminal summary.
  - [x] Logging: rely on coverage reporter output; no application logs are required.
  - [x] Dependencies: `@vitest/coverage-v8` must be installed first.

- [x] Scope coverage and test discovery intentionally.
  - [x] Deliverable: configure coverage include/exclude patterns for `src/**/*.{ts,vue}` while excluding entrypoints, generated/type-only files, and test/setup files where appropriate.
  - [x] Expected behavior: future coverage reports focus on application/editor code and do not count test harness files as covered source.
  - [x] Logging: coverage CLI output should make included files and uncovered-file behavior understandable during validation.
  - [x] Dependencies: coverage configuration must exist first.

### Phase 3 — Shared Test Setup and Tooling Compatibility

- [x] Add a shared Vitest setup file.
  - [x] Deliverable: create `test/setup.ts` with Vue Test Utils defaults, automatic wrapper cleanup through `enableAutoUnmount(afterEach)`, and mock cleanup such as `vi.restoreAllMocks()` after each test.
  - [x] Expected behavior: future component tests start from a clean wrapper/mock state without each test file repeating boilerplate setup.
  - [x] Logging: no runtime logs; keep setup deterministic and side-effect limited to test lifecycle hooks.
  - [x] Dependencies: `@vue/test-utils` and `vitest` imports must resolve.

- [x] Ensure lint and TypeScript tooling accepts test setup files.
  - [x] Deliverable: no `eslint.config.js` change was needed; `tsconfig.json` now includes `test/**/*.ts` so TypeScript checks the shared setup file, and setup imports Vitest APIs explicitly.
  - [x] Expected behavior: `npm run lint` handles `test/setup.ts` without weakening source lint rules or broadening ignores.
  - [x] Logging: rely on ESLint output; no application logs are required.
  - [x] Dependencies: `test/setup.ts` path must be known.

### Phase 4 — Validation

- [x] Validate the tooling setup without adding tests.
  - [x] Deliverable: run `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run typecheck` after implementation.
  - [x] Expected behavior: Vitest still passes with no tests, coverage command starts successfully with the V8 provider, lint passes for updated config/setup files, and TypeScript checks remain green.
  - [x] Logging: preserve command output in the implementation transcript, especially any coverage no-test behavior or warnings.
  - [x] Dependencies: all configuration and script changes must be complete.

## Acceptance Criteria

- [x] `@vue/test-utils` is installed in `devDependencies` and locked in `package-lock.json`.
- [x] `@vitest/coverage-v8` is installed in `devDependencies` and locked in `package-lock.json`.
- [x] `package.json` exposes `test`, `test:watch`, and `test:coverage` scripts.
- [x] `vitest.config.ts` supports Vue component tests in `jsdom` and uses the V8 coverage provider.
- [x] A shared `test/setup.ts` exists and is wired through `test.setupFiles`.
- [x] No component test cases, documentation files, CI files, or coverage thresholds are added in this task.

## Out of Scope

- [ ] Writing tests for Vue components or utilities.
- [ ] Setting coverage percentage thresholds.
- [ ] Adding Playwright/e2e infrastructure.
- [ ] Updating CI pipelines or roadmap/rules artifacts.
- [ ] Replacing `jsdom` with `happy-dom`.

## Commit Plan

- [ ] **Commit 1:** `test: add vue test utils and coverage scripts`
  - [ ] Include dependency installation and `package.json` script wiring.
- [ ] **Commit 2:** `test: configure component test setup and coverage`
  - [ ] Include `vitest.config.ts`, `test/setup.ts`, any necessary ESLint compatibility changes, and validation results.
