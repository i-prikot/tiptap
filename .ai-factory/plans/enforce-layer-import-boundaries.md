<!-- handoff:task:04c5def7-e8b9-4e87-9f09-d8a3c4b3913e -->
# Enforce Layer Import Boundaries

- [ ] **Branch:** `main` (fast-plan mode; no branch changes)
- [ ] **Created:** 2026-07-14
- [ ] **Scope:** Prevent editor behavior and utility layers from depending on the Vue component layer.

## Goal

Add ESLint `import/no-restricted-paths` enforcement so files in
`src/editor/extensions/` and `src/editor/utils/` cannot import modules from
`src/editor/components/`. This codifies the existing architecture direction:
`components → composables → extensions/utils`.

## Settings

- [ ] **Testing:** No — do not add or modify test files and do not run test suites. ESLint validation is a non-test configuration check.
- [ ] **Logging:** Verbose command diagnostics only; do not add runtime/application logging for this static lint configuration.
- [ ] **Documentation:** No — do not modify documentation artifacts.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** Skipped by autonomous Handoff defaults. The work corresponds to the existing roadmap item for enforcing layer boundaries with `import/no-restricted-paths`.

## Confirmed Context

- [ ] `eslint.config.js` is an ESLint 9 flat config and currently has no `eslint-plugin-import` registration or import resolver settings.
- [ ] `package.json` and `package-lock.json` do not include `eslint-plugin-import`; `src/editor/` uses the TypeScript alias `@/*`.
- [ ] The architecture explicitly states that `extensions/` and `utils/` must not import Vue components. Current searches found no direct component imports from either restricted layer.

## Tasks

### Phase 1 — Add Import-Lint Dependencies

- [x] **Task 1: Install the ESLint import plugin and TypeScript resolver.**
  - [x] **Files:** `package.json`, `package-lock.json`.
  - [x] **Deliverable:** Add `eslint-plugin-import` and `eslint-import-resolver-typescript` as development dependencies using npm, preserving the lockfile's npm format.
  - [x] **Expected behavior:** ESLint can load the `import` rule namespace and resolve the existing `@/*` TypeScript path alias when applying path-based restrictions.
  - [x] **Logging requirements:** Do not add runtime logs; retain npm install output and report dependency-resolution failures as terminal diagnostics.
  - [x] **Dependencies:** None.

### Phase 2 — Define One-Way Layer Boundaries

- [x] **Task 2: Register `import/no-restricted-paths` in the flat ESLint configuration.**
  - [x] **Files:** `eslint.config.js`.
  - [x] **Deliverable:** Import and register `eslint-plugin-import` under the `import` plugin key, configure its TypeScript resolver against `tsconfig.json`, and add a clearly named flat-config block for editor layer boundaries.
  - [x] **Expected behavior:** Configure `import/no-restricted-paths` as an error with two explicit zones: `src/editor/extensions/` cannot import `src/editor/components/`, and `src/editor/utils/` cannot import `src/editor/components/`. Apply the rule to TypeScript and Vue files in the two target directories, use explicit directory paths rather than broad component-name patterns, and include an actionable message that directs code toward a pure utility, extension API, or dependency inversion instead of UI coupling.
  - [x] **Guardrails:** Preserve allowed downward dependencies such as `components → extensions/utils` and `extensions → utils`; do not expand this task to `nodes/`, `composables/`, or unrelated import rules. Alias-form imports such as `@/editor/components/...` must be covered, not only relative imports.
  - [x] **Logging requirements:** Do not add runtime logs; use ESLint configuration names and CLI diagnostics to make boundary failures identifiable.
  - [x] **Dependencies:** Depends on Task 1.

### Phase 3 — Verify the Rule Without Test Work

- [x] **Task 3: Validate configuration loading and repository compatibility.**
  - [x] **Files:** `eslint.config.js`, `package.json`, `package-lock.json`; touch source files only if lint identifies a genuine current layer violation.
  - [x] **Deliverable:** Run `npm run lint` after the dependency and config changes. If needed, inspect the resolved config for representative files under `src/editor/extensions/` and `src/editor/utils/` to confirm `import/no-restricted-paths` is active.
  - [x] **Expected behavior:** ESLint loads the flat config without plugin or resolver errors, lint remains clean for the current source, and any discovered prohibited import is corrected by restoring the architectural boundary rather than weakening or disabling the rule.
  - [x] **Guardrails:** Do not create fixtures, add tests, run Vitest/Playwright, or introduce unrelated lint/format cleanup. Do not alter docs.
  - [x] **Logging requirements:** Preserve full ESLint stdout/stderr; classify configuration or resolver failures as errors and pre-existing unrelated findings as warnings in the implementation handoff.
  - [x] **Dependencies:** Depends on Task 2.

## Acceptance Criteria

- [x] `package.json` and `package-lock.json` contain the import plugin and the resolver required for flat-config alias resolution.
- [x] `eslint.config.js` registers the `import` plugin and enables `import/no-restricted-paths` at error severity.
- [x] Imports from `src/editor/components/` into either `src/editor/extensions/` or `src/editor/utils/` are lint errors for both relative and `@/*` alias import forms.
- [x] Existing allowed dependency directions remain unblocked.
- [x] `npm run lint` completes without ESLint config, plugin, or resolver loading errors.
- [x] No test files or documentation files are added or modified.

## Commit

- [ ] Single commit after validation: `chore: enforce editor layer import boundaries`

## Notes for Implementer

- [ ] This is a static configuration change; avoid introducing source rewrites unless lint reveals a real violation.
- [ ] Keep the restriction focused on the visual `components/` layer. The editor's `nodes/` directory contains Vue NodeViews and is deliberately outside this task's target set.

## Rework

- [x] **2026-07-14:** Addressed review finding `7d4e2508ec12` by restoring `package.json` and `package-lock.json` to regular-file mode (`100644`) without changing their contents.
