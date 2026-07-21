<!-- handoff:task:d0d4a2e7-9b2b-41b5-871d-547f22cc2d47 -->
# Implementation Plan: Аудировать Vue-компоненты

Branch: `main`
Created: 2026-07-20

## Settings
- [ ] Testing: no
- [ ] Logging: verbose local audit diagnostics; add no runtime logging
- [ ] Docs: no

## Roadmap Linkage
Milestone: "Этап 6. Vue 3: лучшие практики"
Rationale: This plan implements the roadmap item requiring a project-wide audit and standardization of Vue SFC script syntax.

## Scope and Decisions
- [x] Audit all Vue SFCs in `apps/playground/src/**/*.vue` and `packages/editor/src/**/*.vue`; the current baseline contains 94 files.
- [x] Confirm that all 94 files contain exactly one `<script setup>` block with `lang="ts"`; no Options API, ordinary `<script>`, JavaScript-only setup block, or dual-script exception is present.
- [x] Treat `packages/editor/src/components/ui/SuggestionMenu.vue` as compliant: its `<script setup lang="ts" generic="…">` form is valid TypeScript script setup, not an exception.
- [x] Do not make source changes merely to restyle equivalent syntax. At the audited revision there are zero components to migrate and zero justified exceptions to preserve.
- [x] Exclude unit, snapshot, and end-to-end test work from this task, per the explicit task setting. Use type checking and linting only as non-test validation if source files change.

## Tasks

### Phase 1: Reconfirm the SFC baseline before editing
- [x] **Task 1: Run a deterministic inventory of all in-scope Vue SFCs and classify their script blocks.** Enumerate `apps/playground/src/**/*.vue` and `packages/editor/src/**/*.vue`; for every file, require one script block whose opening tag has both `setup` and `lang="ts"`, irrespective of additional attributes such as `generic`. Record any violating paths as the only migration candidates. The expected baseline is 94 compliant files and 0 candidates. **Files:** `apps/playground/src/**/*.vue`, `packages/editor/src/**/*.vue` (read-only audit). **Logging:** add no application logs; retain full command output as verbose local diagnostics, containing only paths and aggregate counts.

### Phase 2: Migrate only verified deviations
- [x] **Task 2: Convert each candidate identified by Task 1 to `<script setup lang="ts">` while preserving its public component contract.** For a legacy Options API or ordinary script, translate imports, props, emits, exposed bindings, lifecycle hooks, and template-visible names without changing rendered output or behavior; add TypeScript types needed by the converted setup block. Preserve a regular `<script>` only when a concrete compiler- or framework-required feature cannot be expressed through script setup, document the exact reason in the implementation handoff, and do not classify `generic` script-setup attributes as exceptions. At the current baseline this task must make no source changes. **Files:** only noncompliant `.vue` files reported by Task 1; currently none. **Dependencies:** Task 1. **Logging:** do not introduce `console` calls, telemetry, or document-content logging; compiler and lint diagnostics remain local development output.

### Phase 3: Validate the standardized component set
- [x] **Task 3: Re-run the inventory and validate changed Vue code without adding or running tests.** Verify the final count remains 94 compliant SFCs with 0 exceptions, then run `npm run typecheck --workspace=@i-prikot/editor` and `npm run lint --workspace=@i-prikot/editor` when Task 2 changes editor sources; include equivalent workspace validation for any future playground candidate. Do not add, modify, or run unit, snapshot, or end-to-end tests, and do not update documentation. **Files:** no source changes expected; any files changed only by Task 2. **Dependencies:** Tasks 1-2. **Logging:** retain command output as verbose local diagnostics only; add no runtime logging.

## Completion Criteria
- [x] Every in-scope `.vue` component has exactly one `<script setup … lang="ts">` block.
- [x] Any retained exception has a concrete compiler/framework justification; the audited baseline retains none.
- [x] No behavioral, public API, or template-output change is introduced by syntax-only migrations.
- [x] Required non-test typecheck and lint commands pass when migration candidates exist.
