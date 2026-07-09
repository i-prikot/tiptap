<!-- handoff:task:0573a07c-9eeb-45b8-9f5b-221c19ed5e88 -->
# Implementation Plan: Add CI Pipeline

Branch: main
Created: 2026-07-09

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped for autonomous fast planning; this is a focused repository automation task for pull request quality checks.

## Context Summary
- [ ] Project stack: Vue 3 + TypeScript + Vite application using npm and `package-lock.json` as the authoritative lockfile.
- [ ] Existing quality scripts: `npm run typecheck`, `npm run lint`, and `npm run build` already exist in `package.json`.
- [ ] Current test gap: `package.json` does not define a `test` script, and no project test runner/config was found outside AI-agent support files.
- [ ] CI target: GitHub Actions workflow for every pull request that runs checks sequentially in this order: typecheck, lint, test, build.
- [ ] Implementation boundary: do not add test files or documentation because this plan was requested with `tests:false` and `docs:false`.

## Commit Plan
- [ ] **Commit 1** (after tasks 1-2): `chore: prepare npm scripts for ci`
- [ ] **Commit 2** (after tasks 3-5): `ci: add pull request quality workflow`

## Tasks

### Phase 1: Confirm CI Baseline
- [x] Task 1: Audit the current npm and GitHub Actions baseline before editing.
  - [ ] Deliverable: Confirm the package manager, lockfile, Node/npm baseline, existing quality scripts, absence or presence of `.github/workflows/`, and whether a real `test` command already exists.
  - [ ] Expected behavior: The CI implementation uses `npm ci` and existing project scripts where possible, without introducing duplicate package managers or unrelated tooling.
  - [ ] Files to inspect: `package.json`, `package-lock.json`, `vite.config.ts`, `eslint.config.js`, `tsconfig.json`, `.github/workflows/`.
  - [ ] Logging requirements: No application runtime logging is needed; capture INFO-level implementation notes for discovered scripts and WARN-level notes for missing CI/test infrastructure or unsupported package-manager signals.
  - [ ] Dependencies: none

### Phase 2: Prepare The Test Script Contract
- [x] Task 2: Add an explicit npm `test` script contract for CI if it is still missing.
  - [ ] Deliverable: Update `package.json` so `npm run test` exists; because no automated tests are currently configured and tests are out of scope, use a transparent placeholder script that prints that automated tests are not configured yet and exits successfully.
  - [ ] Expected behavior: The CI `test` phase is present and visible in pull request logs, while not pretending to add coverage or introducing a test framework without requested test work.
  - [ ] Files to change: `package.json`.
  - [ ] Logging requirements: The script output must be explicit and searchable in CI logs, for example `No automated tests configured yet; skipping test phase.`; preserve npm failure output if the script syntax is invalid.
  - [ ] Dependencies: Task 1

### Phase 3: Add Pull Request Workflow
- [x] Task 3: Create the GitHub Actions workflow file for pull request CI.
  - [ ] Deliverable: Add `.github/workflows/ci.yml` with a single quality job triggered by `pull_request` and optional manual `workflow_dispatch` for maintainers.
  - [ ] Expected behavior: Each pull request starts one CI run using Ubuntu, checks out the repository, installs Node with npm cache enabled, and runs `npm ci` before quality checks.
  - [ ] Files to create: `.github/workflows/ci.yml`.
  - [ ] Logging requirements: Use clear workflow/job/step names so GitHub Actions logs show exactly where failures occur; do not add secrets or environment dumps to logs.
  - [ ] Dependencies: Task 1

- [x] Task 4: Wire the workflow quality steps in the required sequential order.
  - [ ] Deliverable: Add separate workflow steps for `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`, in exactly that order after dependency installation.
  - [ ] Expected behavior: A failure in typecheck stops lint/test/build, a failure in lint stops test/build, a failure in test stops build, and build only runs after the first three checks pass.
  - [ ] Files to change: `.github/workflows/ci.yml`.
  - [ ] Logging requirements: Keep each command in its own named step for verbose GitHub Actions logs; rely on npm script stdout/stderr for diagnostics and avoid combining commands into one opaque shell block.
  - [ ] Dependencies: Task 3 and Task 2

### Phase 4: Harden And Validate CI
- [x] Task 5: Add workflow safety defaults and validate the CI commands locally.
  - [ ] Deliverable: Configure minimal workflow permissions, concurrency cancellation for superseded PR runs, `CI: true`, and validate with `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` after edits.
  - [ ] Expected behavior: The workflow has least-privilege repository read access, avoids wasting runner minutes on outdated commits, and all configured commands complete successfully before handoff.
  - [ ] Files to change: `.github/workflows/ci.yml`, `package.json`.
  - [ ] Logging requirements: Preserve full local command output for any validation failure and classify failures by command name; GitHub Actions logs must expose cancellation, install, and per-check status without leaking secrets.
  - [ ] Dependencies: Task 4

## Implementation Notes
- [ ] Use npm consistently because `package-lock.json` is present; do not add pnpm, Yarn, or Bun configuration.
- [ ] Prefer the locally confirmed Node major version for CI unless the repository already defines a stricter version file or `engines.node` during implementation.
- [ ] Do not add tests, test files, Vitest/Jest/Playwright dependencies, or coverage configuration in this task.
- [ ] Keep the workflow focused on pull request quality gates; deployment, release publishing, artifact upload, and branch protection setup are out of scope.
- [ ] If a real test runner appears before implementation starts, replace the placeholder `test` script plan with the real project test command and preserve the same CI step order.

## Next Steps
- [ ] Start implementation with `$aif-implement` using `.ai-factory/plans/add-ci-pipeline.md`.
