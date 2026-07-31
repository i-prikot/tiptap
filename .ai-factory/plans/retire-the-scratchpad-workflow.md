<!-- handoff:task:53b914a9-f261-4363-ab97-dfc5369d285c -->
# Implementation Plan: Retire the scratchpad workflow

Branch: `main`
Created: 2026-07-28

## Settings
- [x] Testing: no additional automated tests
- [x] Logging: verbose for the new Node utility entry points; no application-runtime logging changes
- [x] Docs: no mandatory `$aif-docs` checkpoint; feature documentation below is required by this task

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped in autonomous fast mode.

## Rework History
- [x] 2026-07-29: Reverted unrelated `package-lock.json` transitive dependency upgrades identified by review finding `a6cd03adc72e`; this task adds scripts only and does not change dependencies.
- [x] 2026-07-30: Addressed review-gate finding `788d72349250` by redacting sensitive forwarded Playwright argument values before `LOG_LEVEL=debug` logging. RED: `npm run test:scripts` failed because a credential-bearing URL appeared in debug output; an expanded regression also caught an `Authorization: Bearer` header value. GREEN: `npm run test:scripts` passed all 5 assertions after redaction while confirming original arguments still reach Playwright. Focused Prettier passed.
- [x] 2026-07-30: Addressed review-gate findings `36a2b02a5937` and `61313a423c26` by redacting inline option URL values such as `--grep=https://user:password@example.test` and sensitive header values such as `X-Api-Key: <secret>`. Regression coverage confirms debug logs omit both secrets while the original arguments still reach Playwright; `npm run test:scripts` and focused Prettier passed.

## Scope and Decisions
- [x] `scratchpad/` is not present in the current checkout or reachable Git history. Do not recreate it; treat it as a retired location if it appears in a handoff workspace.
- [x] Keep `e2e/smoke.spec.ts`, `playwright.config.ts`, and the existing `test:e2e` command as the browser-test implementation. The new script is a maintained smoke-specific launcher, not a second browser scenario.
- [x] Make `packages/editor/src/icons/*.ts` the source tree for a deterministic icon-barrel generator. The generator must rebuild or verify `packages/editor/src/icons/index.ts`; it must not overwrite individual icon modules or generated package output under `packages/editor/dist/`.
- [x] Preserve historical references in archived `.ai-factory/plans/` files. Remove or clarify only live workflow references and user-facing documentation.

## Tasks

### Phase 1: Establish maintained utility entry points
- [x] **Task 1: Add a deterministic icon-barrel generator under `scripts/`.**
  - [x] Files: create `scripts/generate-icons.mjs`; modify `package.json`; modify `packages/editor/src/icons/index.ts` only through the generator's first committed output.
  - [x] Deliverable: implement a Node ESM CLI that discovers the committed `*-icon.ts` modules in `packages/editor/src/icons/`, derives their named exports, produces alphabetically ordered named re-exports, and writes the canonical barrel. Support a non-writing `--check` mode that reports drift and exits non-zero, while the default mode updates only the barrel.
  - [x] Package interface: add explicit root commands such as `icons:generate` and `icons:check`; do not make icon generation an implicit install, build, or test side effect.
  - [x] Safety: reject unexpected filenames, duplicate export names, unresolved exports, and output paths outside `packages/editor/src/icons/`; leave individual source icons and `packages/editor/dist/` untouched.
  - [x] Rework (2026-07-29): reject symlinked or non-regular barrel files, validate the resolved barrel path, and write only through a no-follow file handle.
  - [x] Rework (2026-07-29): reject symlinked icon source directories and verify the canonical icon source and barrel paths remain under the canonical repository root before opening `index.ts`.
  - [x] Logging: emit `DEBUG` discovery counts, selected output path, and check/write mode when `LOG_LEVEL=debug`; emit `INFO` for successful checks or writes; emit actionable `ERROR` messages with the failed validation or drift context before a non-zero exit.
  - [x] Dependencies: none.

- [x] **Task 2: Add a maintained smoke-test launcher under `scripts/`.**
  - [x] Files: create `scripts/run-smoke-test.mjs`; modify `package.json`.
  - [x] Deliverable: provide a Node ESM wrapper that launches the existing Playwright smoke scenario in `e2e/smoke.spec.ts`, forwards user-supplied Playwright arguments, preserves the child exit status/signal, and avoids any machine-specific Puppeteer, Edge, or executable-path configuration.
  - [x] Package interface: add `test:smoke` for the wrapper while retaining `test:e2e` as the full Playwright command used by CI. Document any required browser-install prerequisite in the user-facing maintenance guide rather than silently installing browsers.
  - [x] Logging: emit `INFO` with the resolved command and smoke target, stream Playwright output directly, emit `DEBUG` with forwarded arguments when enabled, and emit `ERROR` with spawn or non-zero-exit context before returning failure.
  - [x] Dependencies: relies on the existing `@playwright/test`, `e2e/smoke.spec.ts`, and `playwright.config.ts`; do not duplicate or relocate the browser assertions.

- [x] **Task 5 (Rework 2026-07-29): Add focused executable regression coverage.**
  - [x] Files: create `test/scripts/generate-icons.test.mjs` and `test/scripts/run-smoke-test.test.mjs`; add the `test:scripts` package command and update this plan with RED/GREEN evidence.
  - [x] Deliverable: isolated fixture projects cover icon barrel check-mode drift detection, write-mode regeneration, and clean verification, plus smoke-launcher argument forwarding and non-zero child exit-code propagation.
  - [x] Verification: focused Node tests passed after the implementation was restored; evidence is recorded under Completion Criteria.

### Phase 2: Remove the retired workflow surface
- [x] **Task 3: Eliminate active `scratchpad/` workflow references and enforce the replacement boundary.**
  - [x] Files: delete `scratchpad/` only if it is present in the implementation workspace; modify `package.json`, `.gitignore`, and `.ai-factory/MIGRATION_STATUS.md` only where they contain active scratchpad commands or inaccurate current-state guidance.
  - [x] Deliverable: remove obsolete script hooks, ignore rules, and current workflow instructions that direct contributors to `scratchpad/`. Replace live references with the maintained `scripts/` commands and the existing Playwright e2e location. Do not edit historical completed plans merely to erase audit history.
  - [x] Guardrail: confirm `scratchpad/` remains absent after the cleanup and ensure no package script targets it. Keep generated Playwright artifacts and existing CI behavior unchanged unless an obsolete scratchpad-specific reference requires removal.
  - [x] Logging: no runtime logging is needed for metadata-only cleanup; the new CLI utilities from Tasks 1–2 provide all operational diagnostics. Record each removed or redirected active reference in the implementation handoff.
  - [x] Dependencies: Tasks 1 and 2 establish the supported replacements before removing references.

### Phase 3: Document operation and maintenance
- [x] **Task 4: Document the supported development utilities and ownership boundary.**
  - [x] Files: create `docs/development-scripts.md`; modify `README.md`; update `.ai-factory/MIGRATION_STATUS.md` if its current wording still presents `scratchpad/` as an active tool location.
  - [x] Deliverable: add concise developer documentation covering `npm run icons:generate`, `npm run icons:check`, `npm run test:smoke`, and `npm run test:e2e`; explain when each command is appropriate, the Playwright browser-install prerequisite, expected generated icon-barrel changes, check-mode drift remediation, and the rule that new ad-hoc developer utilities belong in `scripts/`, not `scratchpad/`.
  - [x] Navigation: link the guide from the README's local-development or project-structure area and identify `scripts/` as the repository-owned maintenance-utility directory.
  - [x] Logging: documentation must state the `LOG_LEVEL=debug` diagnostics behavior and that normal utility output remains concise; no additional application logging is introduced.
  - [x] Dependencies: Tasks 1–3 define the final command names and retirement boundary.

## Completion Criteria
- [x] The repository has no active `scratchpad/` directory, package script, or contributor workflow that points to it.
- [x] `scripts/generate-icons.mjs` deterministically owns only the icon barrel and exposes write/check commands through `package.json`.
- [x] `scripts/run-smoke-test.mjs` launches the existing Playwright smoke scenario without recreating the legacy Puppeteer/Edge workflow.
- [x] `README.md` and `docs/development-scripts.md` tell contributors how to run, troubleshoot, and maintain the supported scripts.
- [x] Focused executable regression tests cover icon check/write behavior and smoke-launcher argument forwarding and exit-code propagation.
  - [x] RED (2026-07-29): `node --test test/scripts/generate-icons.test.mjs` failed with status 1 after temporarily replacing the barrel write with a no-op.
  - [x] RED (2026-07-29): `node --test test/scripts/run-smoke-test.test.mjs` failed with status 1 after temporarily omitting forwarded Playwright arguments.
  - [x] GREEN (2026-07-29): `npm run test:scripts` passed all 3 focused assertions after restoring both scripts.

## Implementation Notes
- [x] Rework (2026-07-29): `.ai-factory/RULES.md` requires focused automated coverage and recorded RED/GREEN evidence for the executable behaviors added by Tasks 1–2.
- [x] The touched implementation files include `package.json`, `scripts/generate-icons.mjs`, `scripts/run-smoke-test.mjs`, `test/scripts/generate-icons.test.mjs`, `test/scripts/run-smoke-test.test.mjs`, `packages/editor/src/icons/index.ts`, `README.md`, `docs/development-scripts.md`, and only relevant active cleanup files if they currently reference `scratchpad/`.

- [x] Rework (2026-07-29): addressed findings `434d85ad9e76`, `d227c27d1475`, `b099b2e1b319`, and `f5737431e703`. RED: `npm run test:scripts` failed with the new hard-link and INFO-log redaction assertions; GREEN: the same command passed all 5 assertions after the minimal fixes. Focused Prettier and `git diff --check` passed.
- [x] Rework (2026-07-29): addressed review-gate findings `3765665fb5b4` and `7790cfc71428` by staging `test:scripts` with the focused tests, recording the completed retirement in `.ai-factory/ROADMAP.md`, and rerunning `npm run test:scripts` (5 passing assertions).
- [x] Rework (2026-07-30): addressed review-gate findings `81801ce30f80` and `fd7e58e6512e` by redacting every forwarded `--header`/`--headers` value in debug logs, including `Cookie` and `Set-Cookie`, and restoring LF line endings in `README.md`, `.gitignore`, and `.ai-factory/MIGRATION_STATUS.md` without removing intended content edits.
- [x] RED (2026-07-30): `node --test test/scripts/run-smoke-test.test.mjs` exited 1 after cookie-header regression cases were added, confirming that debug logs exposed the header values before the fix.
- [x] GREEN (2026-07-30): `npm run test:scripts` passed all 5 focused assertions; scoped `git diff --check HEAD` and `npx prettier --check --ignore-unknown README.md .gitignore .ai-factory/MIGRATION_STATUS.md` passed.
- [x] Rework (2026-07-30): addressed blocking finding `8d8c42231d96` by treating quoted credential keys in JSON-like forwarded values as sensitive before debug logging. RED: `node --test test/scripts/run-smoke-test.test.mjs` exited 1 because `{"password":"json-password-secret","token":"json-token-secret"}` appeared in stdout. GREEN: `npm run test:scripts` passed all 5 assertions; focused Prettier and scoped `git diff --check` passed.
- [x] Rework (2026-07-30): addressed blocking findings `263882dbe061` and `bc0d9e8a89db`. RED: `node --test test/scripts/run-smoke-test.test.mjs test/scripts/generate-icons.test.mjs` exited 1 because JSON-like `Cookie`/`Set-Cookie` values appeared in debug output and a symbolic-link `src` ancestor was accepted. GREEN: `npm run test:scripts` passed all 6 assertions after cookie-key redaction and descriptor-relative, no-follow directory traversal; `npm run icons:check`, focused Prettier, and scoped `git diff --check` passed.
