<!-- handoff:task:e4af0ef9-02ce-47da-8858-6d829fdf2aec -->
# Implementation Plan: Create `.env.example`

Branch: main
Created: 2026-07-07

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous handoff defaults; the task aligns with Этап 0 infrastructure item for creating `.env.example`.

## Scope
- [x] Create a root `.env.example` containing all currently used `VITE_TIPTAP_*` variables.
- [x] Add comments that these variables are for the playground/demo runtime only.
- [x] Explicitly state that the reusable editor library must not read env directly; env access belongs to the playground/app boundary.
- [x] Do not change runtime behavior, source imports, package scripts, tests, or documentation files in this task.

## Current Env Surface
- [x] `VITE_TIPTAP_COLLAB_APP_ID` — enables Tiptap Cloud collaboration when set.
- [x] `VITE_TIPTAP_COLLAB_TOKEN_URL` — endpoint for fetching collaboration JWTs; source fallback is `/api/collaboration`.
- [x] `VITE_TIPTAP_COLLAB_TOKEN` — static collaboration JWT for local development only.
- [x] `VITE_TIPTAP_COLLAB_DOC_PREFIX` — prefix for URL-derived collaboration document names.
- [x] `VITE_TIPTAP_AI_APP_ID` — marks AI flow as configured when set.
- [x] `VITE_TIPTAP_AI_TOKEN_URL` — endpoint for fetching AI JWTs; source fallback is `/api/ai`.
- [x] `VITE_TIPTAP_AI_TOKEN` — static AI JWT for local development only.

## Tasks

### Phase 1: Source Audit
- [x] Task 1: Confirm the complete list of `VITE_TIPTAP_*` variables before editing.
  - [x] Deliverable: Compare env usage in `src/editor/composables/useCollab.ts`, `src/editor/composables/useAi.ts`, `src/editor/components/notion/SetupError.vue`, and `README.md` so `.env.example` covers every current variable exactly once.
  - [x] Expected behavior: No `VITE_TIPTAP_*` variable used by the playground is omitted or renamed.
  - [x] Files to read: `src/editor/composables/useCollab.ts`, `src/editor/composables/useAi.ts`, `src/editor/components/notion/SetupError.vue`, `README.md`.
  - [x] Logging requirements: No application logging changes; during implementation, print or record the audited variable list in the agent output if a mismatch is found.

### Phase 2: Env Example Creation
- [x] Task 2: Create root `.env.example` with commented playground-only guidance.
  - [x] Deliverable: Add `.env.example` at the repository root with grouped comments for collaboration and AI variables.
  - [x] Expected behavior: The file is safe to commit, contains no real secrets, uses empty values for IDs/tokens, keeps URL defaults aligned with source fallbacks, and includes examples only where non-sensitive.
  - [x] Required content: Mention that the variables are актуальны для playground/demo app and that the library package must receive configuration via props/options instead of reading `import.meta.env` directly.
  - [x] Files to create: `.env.example`.
  - [x] Logging requirements: No runtime logging; implementation output should note the created file and any intentionally blank secret fields.
  - [x] Depends on: Task 1.

### Phase 3: Consistency Check
- [x] Task 3: Verify `.env.example` matches source defaults and safety expectations.
  - [x] Deliverable: Manually compare `.env.example` values against `useCollab.ts` and `useAi.ts` fallback behavior.
  - [x] Expected behavior: `VITE_TIPTAP_COLLAB_TOKEN_URL=/api/collaboration`, `VITE_TIPTAP_AI_TOKEN_URL=/api/ai`, token fields remain blank, and comments warn against shipping long-lived frontend secrets.
  - [x] Files to read: `.env.example`, `src/editor/composables/useCollab.ts`, `src/editor/composables/useAi.ts`.
  - [x] Logging requirements: No application logging; report validation findings in the implementation summary if any defaults were adjusted.
  - [x] Depends on: Task 2.

### Phase 4: Scope Guard
- [x] Task 4: Ensure the task stays documentation/config-sample only.
  - [x] Deliverable: Review the final diff and confirm only `.env.example` and this plan file were changed for this task.
  - [x] Expected behavior: No tests are added, no docs files are edited, and no library/runtime code starts reading additional env variables.
  - [x] Files to inspect: `.env.example`, `.ai-factory/plans/create-env-example.md`, final git diff.
  - [x] Logging requirements: No runtime logging; summarize any unexpected changed files before handing off implementation.
  - [x] Depends on: Task 3.
