<!-- handoff:task:76469d68-35b2-489e-9c49-da9e5eba11a3 -->
# Implementation Plan: Add Project README

Branch: main
Created: 2026-07-07

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped for autonomous fast planning; this task is a focused documentation landing-page addition.

## Context Summary
- [ ] Project: Vue 3 + Vite + TypeScript Notion-like Tiptap editor intended to be documented as an embeddable editor library for Tinyfy.
- [ ] Target artifact: root `README.md`.
- [ ] Existing knowledge sources: `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `package.json`, `src/main.ts`, `src/App.vue`, `src/editor/components/notion/NotionEditor.vue`, `src/editor/composables/useCollab.ts`, `src/editor/composables/useAi.ts`.
- [ ] Required README sections: project overview, installation, local launch, environment variables, project structure, and purpose of major parts.

## Commit Plan
- [ ] **Commit 1** (after tasks 1-4): `docs: add readme overview and setup details`
- [ ] **Commit 2** (after tasks 5-7): `docs: document editor structure and integration notes`

## Tasks

### Phase 1: Gather README Facts
- [x] Task 1: Audit source-of-truth project metadata and commands before writing `README.md`.
  - [x] Deliverable: Confirm the package name, available npm scripts, framework stack, and library/application positioning from `package.json`, `vite.config.ts`, `src/main.ts`, `src/App.vue`, and `.ai-factory/DESCRIPTION.md`.
  - [x] Expected behavior: The README must describe the project as an embeddable Tinyfy editor library while staying consistent with the current Vite demo entrypoint.
  - [x] Files to inspect: `package.json`, `vite.config.ts`, `src/main.ts`, `src/App.vue`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`.
  - [x] Logging requirements: No runtime logging changes; while implementing, record verbose notes in the task/commit summary for every documented command or claim and flag uncertain assumptions instead of presenting them as facts.

### Phase 2: Create Root README
- [x] Task 2: Create `README.md` with a concise project introduction and Tinyfy embedding context.
  - [x] Deliverable: Add a root `README.md` explaining that the project provides a Vue/Tiptap Notion-like editor intended for embedding into Tinyfy, including its main capabilities: rich text blocks, tables, image nodes, TOC, slash/mention/emoji menus, local mode, optional collaboration, and optional AI token flow.
  - [x] Expected behavior: A new developer should understand what the project is, where it fits in Tinyfy, and what is currently implemented without reading internal AI Factory documents.
  - [x] Files to create/change: `README.md`.
  - [x] Logging requirements: No code logging changes; document any externally visible behavior precisely and avoid claiming production packaging or published npm distribution unless it exists in the repo.
  - [x] Depends on: Task 1.

- [x] Task 3: Document installation and local development commands in `README.md`.
  - [x] Deliverable: Add sections for prerequisites, dependency installation, development server startup, type checking, and production build using the existing scripts: `npm install`, `npm run dev`, `npm run typecheck`, and `npm run build`.
  - [x] Expected behavior: Instructions must mention the Vite dev server is configured with `--host 127.0.0.1` and the app can be opened through the local Vite URL shown by the CLI.
  - [x] Files to create/change: `README.md`.
  - [x] Logging requirements: No runtime logging changes; include command outputs only as paraphrased expectations, not fabricated exact logs.
  - [x] Depends on: Task 2.

- [x] Task 4: Document environment variables and runtime modes in `README.md`.
  - [x] Deliverable: Add a table covering `VITE_TIPTAP_COLLAB_APP_ID`, `VITE_TIPTAP_COLLAB_TOKEN_URL`, `VITE_TIPTAP_COLLAB_TOKEN`, `VITE_TIPTAP_COLLAB_DOC_PREFIX`, `VITE_TIPTAP_AI_APP_ID`, `VITE_TIPTAP_AI_TOKEN_URL`, and `VITE_TIPTAP_AI_TOKEN` with purpose, defaults or fallback behavior, and local/production cautions.
  - [x] Expected behavior: The README must explain that collaboration is optional, `?noCollab=1` disables it, static JWT values are only suitable for local development, and token URLs default to `/api/collaboration` and `/api/ai` when configured code requests tokens.
  - [x] Files to create/change: `README.md`.
  - [x] Logging requirements: No runtime logging changes; describe token errors as user-visible setup/loading behavior based on existing code and avoid exposing or inventing secrets.
  - [x] Depends on: Task 2.

### Phase 3: Explain Structure and Integration Points
- [x] Task 5: Document the project structure and purpose of major directories in `README.md`.
  - [x] Deliverable: Add a tree or table for root files and `src/editor/` directories: `components/notion`, `components/ui`, `components/table`, `components/primitives`, `composables`, `extensions`, `nodes`, `content`, `utils`, `icons`, and `styles`.
  - [x] Expected behavior: The structure section must help implementers locate entrypoints, editor shell, UI widgets, Tiptap behavior, Vue NodeViews, default content, utility helpers, and CSS design tokens.
  - [x] Files to create/change: `README.md`.
  - [x] Logging requirements: No runtime logging changes; keep descriptions grounded in the actual folder layout and note when a directory owns behavior versus presentation.
  - [x] Depends on: Task 2.

- [x] Task 6: Add a short embedding/usage note for Tinyfy integration in `README.md`.
  - [x] Deliverable: Explain the current app entry flow (`src/main.ts` mounts `App.vue`, `App.vue` derives `room` from the URL, `NotionEditor.vue` wires providers) and identify `NotionEditor` as the main component boundary to extract/import for Tinyfy embedding.
  - [x] Expected behavior: The note should clarify current constraints: this repo currently runs as a Vite app/demo, and any formal library export or packaging should be added separately if Tinyfy needs direct package consumption.
  - [x] Files to create/change: `README.md`.
  - [x] Logging requirements: No runtime logging changes; explicitly distinguish implemented behavior from future packaging work so downstream implementers do not assume an existing npm library API.
  - [x] Depends on: Tasks 3, 4, 5.

### Phase 4: Self-Review
- [x] Task 7: Review `README.md` for completeness, accuracy, and readability.
  - [x] Deliverable: Check that all required sections are present: description, installation, launch, environment variables, project structure, and purpose of major parts.
  - [x] Expected behavior: The README must be root-level, Markdown-formatted, internally consistent, and free of unverified commands, stale paths, or references to missing files.
  - [x] Files to inspect/change: `README.md`.
  - [x] Logging requirements: No runtime logging changes; include a concise implementation summary noting the reviewed sections and any intentionally deferred items, such as tests or formal library packaging.
  - [x] Depends on: Tasks 1-6.
