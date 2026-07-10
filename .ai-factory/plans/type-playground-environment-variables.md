<!-- handoff:task:4fa6fb53-b132-4669-98b6-8a26be72b2c0 -->
# Implementation Plan: Type Playground Environment Variables

Branch: main
Created: 2026-07-10

## Settings
- [x] Testing: no
- [x] Logging: verbose
- [x] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous handoff defaults; the task directly aligns with the Этап 1 TypeScript item to type `import.meta.env` for playground `VITE_TIPTAP_*` variables.

## Scope
- [x] Add a TypeScript declaration file for playground Vite env variables.
- [x] Type every currently used `VITE_TIPTAP_*` variable without changing runtime behavior.
- [x] Keep declarations in the TypeScript include boundary so `vue-tsc` can consume them.
- [x] Do not add tests, documentation updates, runtime env reads, or new environment variables.

## Current Env Surface
- [x] `VITE_TIPTAP_COLLAB_APP_ID` — read in `src/editor/composables/useCollab.ts` to enable collaboration configuration.
- [x] `VITE_TIPTAP_COLLAB_TOKEN_URL` — read in `src/editor/composables/useCollab.ts`; fallback is `/api/collaboration`.
- [x] `VITE_TIPTAP_COLLAB_TOKEN` — read in `src/editor/composables/useCollab.ts` as a local/static collaboration JWT fallback.
- [x] `VITE_TIPTAP_COLLAB_DOC_PREFIX` — read in `src/editor/composables/useCollab.ts` to prefix document names.
- [x] `VITE_TIPTAP_AI_APP_ID` — read in `src/editor/composables/useAi.ts` to enable AI configuration.
- [x] `VITE_TIPTAP_AI_TOKEN_URL` — read in `src/editor/composables/useAi.ts`; fallback is `/api/ai`.
- [x] `VITE_TIPTAP_AI_TOKEN` — read in `src/editor/composables/useAi.ts` as a local/static AI JWT fallback.

## Tasks

### Phase 1: Source Audit
- [x] Task 1: Confirm the complete `VITE_TIPTAP_*` variable list before editing.
  - [x] Deliverable: Compare env usage in `src/editor/composables/useCollab.ts`, `src/editor/composables/useAi.ts`, `src/editor/components/notion/SetupError.vue`, and `.env.example`.
  - [x] Expected behavior: The declaration file covers all variables read through `import.meta.env` and does not type display-only names that are not actual runtime reads unless they are already in the runtime/env example surface.
  - [x] Files to read: `src/editor/composables/useCollab.ts`, `src/editor/composables/useAi.ts`, `src/editor/components/notion/SetupError.vue`, `.env.example`.
  - [x] Logging requirements: No application logging changes; during implementation, report the audited variable list in the agent output if any mismatch is found.

### Phase 2: Declaration File
- [x] Task 2: Create `src/env.d.ts` with typed Vite env declarations.
  - [x] Deliverable: Add `src/env.d.ts` because `tsconfig.json` currently includes `src/**/*.ts` and `src/**/*.vue`, so a root-level `env.d.ts` would not be included without changing config.
  - [x] Expected behavior: TypeScript recognizes `import.meta.env.VITE_TIPTAP_*` properties for the playground app without requiring source-code imports.
  - [x] Required content: Declare `ImportMetaEnv` entries for all seven current `VITE_TIPTAP_*` variables and keep them `readonly`; include `ImportMeta` augmentation only if needed by the existing Vite type setup.
  - [x] Type guidance: Prefer optional string declarations (`readonly VITE_TIPTAP_COLLAB_APP_ID?: string`, etc.) because the app supports unset variables with fallback values.
  - [x] Files to create: `src/env.d.ts`.
  - [x] Logging requirements: No runtime logging; implementation output should note the created declaration file and why no runtime logging was added.
  - [x] Depends on: Task 1.

### Phase 3: Consistency Guard
- [x] Task 3: Ensure the declaration file matches source defaults and playground boundaries.
  - [x] Deliverable: Manually compare `src/env.d.ts` against `useCollab.ts`, `useAi.ts`, and `.env.example` after creation.
  - [x] Expected behavior: No env variable is renamed, omitted, duplicated, or given a misleading non-string type; no reusable editor library code gains new direct env access.
  - [x] Files to inspect: `src/env.d.ts`, `src/editor/composables/useCollab.ts`, `src/editor/composables/useAi.ts`, `.env.example`.
  - [x] Logging requirements: No application logging changes; summarize any consistency corrections in the implementation handoff.
  - [x] Depends on: Task 2.

### Phase 4: Final Diff Check
- [x] Task 4: Keep the implementation limited to typing support.
  - [x] Deliverable: Review the final diff and confirm only `src/env.d.ts` and this plan file changed for this task unless a type-inclusion issue forces a minimal `tsconfig.json` update.
  - [x] Expected behavior: No tests are added, no docs are edited, no runtime behavior changes, and no secrets or concrete token values are introduced.
  - [x] Files to inspect: `src/env.d.ts`, `.ai-factory/plans/type-playground-environment-variables.md`, optional `tsconfig.json` only if needed.
  - [x] Logging requirements: No runtime logging; report any unexpected changed files before completing implementation.
  - [x] Depends on: Task 3.
