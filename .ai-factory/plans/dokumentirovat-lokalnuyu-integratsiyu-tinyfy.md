<!-- handoff:task:4608a687-3dba-4173-b1a8-e1be96af0193 -->
# Implementation Plan: Документировать локальную интеграцию Tinyfy

Branch: `main`
Created: 2026-07-18
Mode: fast (Autonomous Handoff)

## Goal

Добавить в корневой README практическую, воспроизводимую инструкцию по
локальной разработке `@i-prikot/editor` совместно с кабинетом Tinyfy. Инструкция
должна покрыть два независимых сценария: установку собранных локальных npm
tarball-файлов и разработку через Vite alias на исходники workspace-пакетов.

## Settings

- [ ] Testing: no — explicitly disabled by the handoff task; do not add or modify test cases.
- [ ] Logging: verbose implementation diagnostics; do not add runtime logging for a documentation-only change.
- [ ] Docs: no — no separate documentation checkpoint is required; updating `README.md` is the requested deliverable.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped for Autonomous Handoff mode; the roadmap already lists this
documentation need, but this focused task must not update roadmap ownership.

## Constraints

- [ ] Modify documentation only; do not change package manifests, Vite configuration, source code, lockfiles, or tests.
- [ ] Keep the documented public package names and import paths aligned with current manifests: `@i-prikot/editor`, `@i-prikot/editor-schema`, and `@i-prikot/editor/style.css`.
- [ ] Use `apps/playground/vite.config.ts` as the in-repository reference for source aliases, stylesheet resolution, and `server.fs.allow`; do not invent a conflicting integration pattern.
- [ ] State that the tarball workflow validates the production package boundary, while the alias workflow is for rapid source-level iteration and is not a substitute for a packed-artifact check.
- [ ] Keep consumer paths explicit placeholders that developers replace with their local checkout locations; never document committed absolute machine-specific paths.

## Tasks

### Phase 1: Establish the integration guide

- [ ] **Task 1: Replace obsolete embedding guidance with a local-integration entry point.**
  - [ ] Files: `README.md`.
  - [ ] Update the existing package/embedding wording so it reflects the current workspace packages and library entry points instead of describing the project only as an unpublished Vite demo.
  - [ ] Add a clearly named subsection for local integration with the Tinyfy cabinet, identify the two supported workflows, and give selection guidance: use packed artifacts for realistic consumer validation; use aliases for faster editor-source iteration.
  - [ ] State the required integration surface: import `NotionEditor` from `@i-prikot/editor`, import `@i-prikot/editor/style.css`, and install/resolve `@i-prikot/editor-schema` whenever the consumer or editor dependency graph requires it.
  - [ ] Preserve unrelated runtime-mode, environment-variable, and theming guidance; link or position the new material so a cabinet developer can find it from the existing Tinyfy embedding section.
  - [ ] **Logging:** no application logging is applicable. During implementation, report README section placement and referenced package names at `DEBUG`; report the completed documentation update at `INFO`; report broken or stale in-repository references at `ERROR` without adding permanent logs.

### Phase 2: Document packed-artifact validation

- [ ] **Task 2: Add an end-to-end `npm pack` workflow for installing local tarballs in the Tinyfy cabinet.**
  - [ ] Files: `README.md`.
  - [ ] Document the producer-side sequence from this workspace: install dependencies, run the workspace build, create tarballs with `npm pack --workspace=...`, and retain the generated `.tgz` file paths for the consumer installation.
  - [ ] Document package order and explicit commands for `@i-prikot/editor-schema` before `@i-prikot/editor`; include `@i-prikot/renderer` only as an optional tarball when the cabinet uses static rendering.
  - [ ] Provide the cabinet-side installation pattern using local tarball paths, then show the normal component and stylesheet imports that the installed package must resolve.
  - [ ] Explain the refresh loop: rebuild and repack after package changes, reinstall the new tarballs in the cabinet, restart its Vite server when dependency pre-bundling caches prevent the update from appearing, and avoid committing generated tarballs to either repository.
  - [ ] Include a concise preflight/checklist that distinguishes a successful archive install from an accidental source/workspace link and calls out peer-runtime compatibility (`vue` and `@tiptap/*`) as a cabinet dependency requirement.
  - [ ] **Logging:** no application logging is applicable. Use `INFO` for each documented build/pack/install boundary, `DEBUG` for generated archive names and package order, and `ERROR` for missing `dist` artifacts, failed package builds, or unresolved peer dependencies; never log registry credentials or tokens.

### Phase 3: Document source-alias development

- [ ] **Task 3: Add a Vite alias alternative for live development against workspace sources.**
  - [ ] Files: `README.md`; reference only `apps/playground/vite.config.ts` for the known-good in-repository pattern.
  - [ ] Provide a consumer-side Vite `resolve.alias` example that maps `@i-prikot/editor`, `@i-prikot/editor-schema`, and the exact `@i-prikot/editor/style.css` subpath to the corresponding files under this checkout's `packages/` directory.
  - [ ] Include the required `server.fs.allow` setup for a cabinet repository located outside this workspace, using the local editor-checkout root as a developer-supplied path placeholder.
  - [ ] Explain operational limits: aliases bypass the packed `dist` artifacts, should be removed before production packaging, and require the cabinet to share compatible `vue`/Tiptap runtime versions to avoid duplicate editor or ProseMirror instances.
  - [ ] Document the verification loop: run the cabinet dev server, edit an editor source/style file, confirm hot reload or a manual server restart applies the change, then return to the tarball workflow before accepting a release-boundary change.
  - [ ] **Logging:** no application logging is applicable. Report alias resolution and filesystem-access setup at `DEBUG`, successful local source loading at `INFO`, and alias/path/duplicate-runtime failures at `ERROR`; do not add persistent logging code or configuration.

## Completion Criteria

- [ ] `README.md` gives a Tinyfy cabinet developer one discoverable local-integration section with a clear choice between tarballs and source aliases.
- [ ] The tarball instructions build, pack, and install the editor schema before the editor, with an optional renderer path and an explicit refresh loop.
- [ ] The alias instructions exactly cover the editor entry, schema entry, stylesheet subpath, and Vite filesystem access needed by a separate local checkout.
- [ ] The guide clearly distinguishes source-alias iteration from packed-artifact validation and calls out peer-runtime compatibility risks.
- [ ] No application code, package metadata, configuration, tests, lockfiles, or roadmap artifacts are changed.
