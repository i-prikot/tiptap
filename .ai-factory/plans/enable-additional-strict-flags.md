<!-- handoff:task:f7aac07a-78cb-4d1d-8467-171eee98623c -->
# Implementation Plan: Enable Additional Strict TypeScript Flags

Branch: main
Created: 2026-07-09

## Settings
- [x] Testing: no
- [x] Logging: verbose for implementation command output; no runtime logging changes expected
- [x] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff default; related roadmap item exists under "Этап 1. TypeScript: строгость и типы".

## Scope
Enable `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` in `tsconfig.json`, then fix all resulting TypeScript diagnostics without hiding legitimate unused code or suppressing errors.

## Current Findings
- [x] `tsconfig.json` currently has `strict: true` but does not enable the three requested additional strict flags.
- [x] `npm run typecheck -- --noUnusedLocals --noUnusedParameters --noFallthroughCasesInSwitch` currently reports one known diagnostic:
  - [x] `src/editor/components/primitives/avatar/AvatarGroup.vue`: `TS6133` for `index` in the `v-for` expression.
- [x] No automated test suite is configured beyond the placeholder `npm test`; validation should use typecheck/build commands, not a test task.

## Tasks

### Phase 1: Enable Compiler Flags
- [x] Task 1: Update `tsconfig.json` compiler options to enable `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`.
  - [x] Deliverable: The three flags are explicitly set to `true` alongside existing strict compiler options.
  - [x] Expected behavior: Future `vue-tsc --noEmit` runs fail on unused locals, unused parameters, and switch fallthrough.
  - [x] Files: `tsconfig.json`
  - [x] Logging requirements: No application logs; record the exact config keys changed and command output in implementation notes if the compiler rejects the configuration.
  - [x] Dependency notes: Must complete before final diagnostics are meaningful.

### Phase 2: Fix Known Diagnostic
- [x] Task 2: Fix the unused `index` diagnostic in `AvatarGroup.vue` without weakening the `v-for` rendering behavior.
  - [x] Deliverable: Remove the unused loop variable or replace the keying approach with a value that TypeScript/Vue recognizes as used; preserve stable rendering for visible avatar children.
  - [x] Expected behavior: `AvatarGroup` still renders `visibleChildren` and the hidden-count fallback exactly as before.
  - [x] Files: `src/editor/components/primitives/avatar/AvatarGroup.vue`
  - [x] Logging requirements: No runtime logs; if behavior is adjusted, note the before/after keying strategy and any compiler output in implementation notes.
  - [x] Dependency notes: Depends on Task 1 only for reproducing the diagnostic under the permanent config.

### Phase 3: Compiler-Driven Cleanup
- [x] Task 3: Run the project typecheck after enabling the flags and fix any additional `TS6133`, `TS7029`, or related strict-flag diagnostics that appear.
  - [x] Deliverable: All new strict-flag diagnostics are resolved by removing unused declarations/imports, deleting dead code, or renaming only signature-required unused parameters with an underscore when omission is not possible.
  - [x] Expected behavior: No valid issues are suppressed with `@ts-ignore`, broad config exclusions, relaxed compiler flags, or dummy reads solely to silence diagnostics.
  - [x] Files: Start with `src/**/*.ts`, `src/**/*.vue`, and any files reported by `npm run typecheck`.
  - [x] Logging requirements: No runtime logs; capture each compiler diagnostic category and the chosen remediation in implementation notes for traceability.
  - [x] Dependency notes: Depends on Tasks 1 and 2; repeat until the strict-flag typecheck is clean.

### Phase 4: Validate Build Health
- [x] Task 4: Validate the completed change with compiler/build checks.
  - [x] Deliverable: `npm run typecheck` passes with the permanent `tsconfig.json` flags; `npm run build` is attempted after typecheck succeeds.
  - [x] Expected behavior: TypeScript strict checks remain enabled and the Vite build is not regressed by cleanup changes.
  - [x] Files: No additional files unless validation exposes a directly related strict-flag issue.
  - [x] Logging requirements: Record command names, pass/fail status, and any related failure output in implementation notes; do not add runtime logging.
  - [x] Dependency notes: Depends on all implementation tasks; do not run `npm test` because tests are explicitly disabled for this plan and the project test script is a placeholder.

## Implementation Guardrails
- [x] Do not disable or remove existing `strict: true` behavior.
- [x] Do not suppress diagnostics with comments, config exclusions, or unused dummy references.
- [x] Prefer deleting unused code over preserving dead exports unless the export is part of a documented public surface.
- [x] For required callback parameters, prefer omitting the parameter when TypeScript allows it; use a leading underscore only when the signature shape must be preserved.
- [x] Keep formatting consistent with the existing Prettier/ESLint style.

## Validation Commands
- [x] `npm run typecheck`
- [x] `npm run build`

## Commit Plan
Single commit after Task 4, suggested message: `chore: enable additional strict compiler flags`.
