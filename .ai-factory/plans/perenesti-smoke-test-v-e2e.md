<!-- handoff:task:330d58b2-9881-493f-aea2-6cf73464bd44 -->
# Implementation Plan: Move the smoke scenario to Playwright e2e

Branch: main
Created: 2026-07-13

## Settings
- [x] Testing: no additional test scope; the requested deliverable is the Playwright e2e smoke test itself.
- [x] Logging: standard diagnostics through Playwright reports, traces, screenshots, and CI logs; do not add application runtime logging solely for e2e coverage.
- [x] Docs: no
- [x] Package manager: npm; update `package-lock.json` through npm when adding Playwright.

## Roadmap Linkage
Milestone: "Этап 2. Тестирование: фундамент (до рефакторинга и пакетизации)"
Rationale: Implements the roadmap item that explicitly requires moving `scratchpad/smoke-test.mjs` to Playwright e2e and running it in CI.

## Scope
- [x] Add a reproducible Chromium Playwright runner for the Vite/Vue application.
- [x] Encode the legacy smoke behavior as a browser-level test against the locally running editor.
- [x] Use accessible locators first; introduce one stable `data-testid` only if the rendered editor lacks a durable semantic selector.
- [x] Run e2e independently in GitHub Actions and preserve failure diagnostics as workflow artifacts.

## Current State
- [x] `scratchpad/smoke-test.mjs` and the `scratchpad/` directory are absent from the current checkout and are not present in reachable Git history; its exact Puppeteer/Edge interactions must be recovered from any available handoff artifact before implementation.
- [x] The application mounts `NotionEditor` in `src/App.vue`; in the default local configuration `NotionEditorContent.vue` renders the editor without collaboration credentials.
- [x] The seeded editor content includes the visible title `Welcome to Notion-like template` and editable instructional content, which can anchor a deterministic smoke assertion.
- [x] No `e2e/` directory, `playwright.config.*`, or `@playwright/test` dependency exists.
- [x] `.github/workflows/ci.yml` currently runs typecheck, lint, Vitest, and build in one `quality` job on Node.js 22.

## Tasks

### Phase 1: Define and scaffold the browser smoke contract

- [x] Task 1: Recover the intended assertions from `scratchpad/smoke-test.mjs` if the source becomes available through the task handoff; otherwise document the fallback browser contract directly in `e2e/smoke.spec.ts`: load the local editor, wait for the seeded title and an editable editor surface, enter a unique marker through normal keyboard input, and assert that the marker remains rendered. Use the actual URL/document-id handling without cloud credentials, so the test verifies the supported local-editor path rather than a mocked editor.
  - [x] Files: create `e2e/smoke.spec.ts`; modify `src/editor/components/notion/EditorContentArea.vue` only if a semantic locator cannot select the editable surface reliably, adding a narrowly scoped `data-testid` with no behavioral change.
  - [x] Expected behavior: the test proves hydration and real ProseMirror editing in Chromium; it must not call Tiptap commands, Vue component internals, or browser `evaluate` to mutate document state.
  - [x] Logging: add no production logs and no `console` output. Give assertions descriptive messages and rely on Playwright's action log, trace, screenshot, and video on failure.
  - [x] Dependencies: none. This is the RED checkpoint: first run the new targeted e2e command before runner wiring and record the expected missing-command/configuration failure.

- [x] Task 2: Add the Playwright toolchain and deterministic local-server configuration for the new smoke test.
  - [x] Files: modify `package.json` and `package-lock.json`; create `playwright.config.ts`; modify `.gitignore` to exclude generated Playwright report, test-results, and browser-artifact directories.
  - [x] Deliverable: install `@playwright/test`, expose `npm run test:e2e` for `playwright test`, and configure one Chromium project with `baseURL` matching Vite's existing `127.0.0.1:5173` host. Configure `webServer` to start `npm run dev`, reuse an existing local server only outside CI, run with one worker in CI, and retain trace/video/screenshot evidence on failures without committing generated files.
  - [x] Expected behavior: `npm run test:e2e -- --grep "smoke"` starts the app, executes `e2e/smoke.spec.ts` reliably on a clean checkout, and terminates the server it created.
  - [x] Logging: keep runner output at Playwright's normal level; diagnostics are emitted only by the CLI and failure artifacts, not application logging.
  - [x] Dependencies: Task 1 supplies the scenario and its required stable locator. This is the GREEN checkpoint: run the focused smoke command and record its passing result.

### Phase 2: Remove the ad-hoc path and integrate CI

- [x] Task 3: Retire the obsolete ad-hoc smoke entry only when it is present in the implementation workspace, and make the Playwright path the sole supported smoke command.
  - [x] Files: delete `scratchpad/smoke-test.mjs` if it is restored or exists; do not recreate the `scratchpad/` directory. Keep all executable smoke behavior in `e2e/smoke.spec.ts` and the `test:e2e` package script.
  - [x] Expected behavior: developers and CI use the same committed Playwright test and no longer depend on `puppeteer-core`, a locally installed Microsoft Edge binary, or machine-specific executable paths.
  - [x] Logging: no runtime logging changes; an absent legacy file is a no-op, while any removed file is visible through the Git diff.
  - [x] Dependencies: Task 2 must provide a passing committed replacement before removing any legacy script.

- [x] Task 4: Add a dedicated GitHub Actions e2e job that runs after the existing quality checks and uploads Playwright diagnostics when it fails.
  - [x] Files: modify `.github/workflows/ci.yml`.
  - [x] Deliverable: add an `e2e` job with `needs: quality`, Node.js 22, npm dependency caching, `npm ci`, `npx playwright install --with-deps chromium`, and `npm run test:e2e`. On failure, upload the configured `playwright-report/` and `test-results/` directories with an explicit retention period; do not upload them on successful runs.
  - [x] Expected behavior: pull requests and manual workflow dispatches fail if the browser smoke scenario fails, while a failed job exposes enough CI artifacts to reproduce and diagnose the failure.
  - [x] Logging: preserve GitHub Actions step output and Playwright reporter output; no secrets, editor contents beyond the seeded test data, or application logs are uploaded.
  - [x] Dependencies: Tasks 1–2 must define the command, browser, output paths, and failure-artifact policy.

### Phase 3: Validate the production-like flow

- [ ] Task 5: Validate the final e2e integration from a clean dependency state and perform the mandatory TDD evidence check without expanding into unrelated test coverage.
  - [x] Files: no planned source changes; update only files from Tasks 1–4 if validation exposes an issue caused by this migration.
  - [ ] Deliverable: run `npm ci`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, `npm run lint`, `npm run typecheck`, and `npm run build`; record the observed RED (missing runner before setup) and GREEN (focused/full e2e pass) outcomes in the implementation handoff.
  - [ ] Expected behavior: the e2e test uses the same lockfile-resolved dependencies and browser installation as CI, passes without a pre-existing Vite process, and does not break the existing quality gate.
  - [x] Logging: retain command output in the implementation summary; use Playwright artifacts for failures and do not introduce production `console` logging.
  - [x] Dependencies: Tasks 1–4.

## Acceptance Criteria
- [x] `npm run test:e2e` executes a committed Chromium Playwright smoke test against the Vite application.
- [x] The test verifies page hydration and an actual editor typing interaction through browser-visible DOM behavior.
- [x] The runner starts the Vite server automatically and behaves deterministically in CI.
- [x] Generated Playwright outputs are ignored by Git and are uploaded only for failed e2e CI runs.
- [x] GitHub Actions runs e2e after the existing quality job and fails the workflow on smoke-test failure.
- [x] No machine-specific Edge/Puppeteer executable path remains necessary for the smoke check.

## Out of Scope
- [x] Adding unrelated unit, component, integration, visual-regression, cross-browser, or accessibility test suites.
- [x] Changing editor behavior, seed content, collaboration configuration, or production logging beyond an optional test-only locator.
- [x] Updating user-facing documentation or adding a documentation checkpoint.

## Commit Plan
- [x] **Commit 1:** `test: add Playwright editor smoke test` — Playwright dependency/configuration, e2e scenario, stable locator if needed, scripts, and ignored artifacts.
- [x] **Commit 2:** `ci: run Playwright smoke test` — dedicated GitHub Actions e2e job and failure-artifact upload.
