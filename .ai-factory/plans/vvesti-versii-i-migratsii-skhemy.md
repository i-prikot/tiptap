<!-- handoff:task:f878535e-a2f0-4589-9beb-f127e7aa0f49 -->
# Ввести версии и миграции схемы

## Plan Metadata

- [ ] **Mode:** fast
- [ ] **Created:** 2026-07-17
- [ ] **Branch:** `main` / current Handoff workspace
- [ ] **Project:** Vue 3 + TypeScript + Vite + Tiptap v3 workspace
- [ ] **Plan file:** `.ai-factory/plans/vvesti-versii-i-migratsii-skhemy.md`
- [ ] **Handoff task:** `f878535e-a2f0-4589-9beb-f127e7aa0f49`

## Settings

- [ ] **Testing:** no test files or test executions; this is an explicit task constraint.
- [ ] **Docs:** no documentation changes; warn-only docs checkpoint.
- [ ] **Logging:** verbose development diagnostics at the editor update boundary; the migration API remains pure and must not write document data to the console.
- [ ] **Package manager:** npm workspaces, with `package-lock.json` kept unchanged because no dependency changes are needed.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** skipped by autonomous Handoff default. The matching unchecked roadmap item is “Ввести `schemaVersion` в сохраняемый документ и модуль миграций схемы”, but this fast plan has no formal milestone linkage.

## Scope and Decisions

- [ ] Keep the migration contract in `@i-prikot/editor-schema`, the package already shared by the editor and renderer for `JSONContent` and the Tiptap extension schema.
- [ ] Define a persisted-document envelope as `{ schemaVersion, json }`; retain the existing Tiptap `JSONContent` object unchanged inside `json`.
- [ ] Start the current schema at version `1`; interpret documents created before versioning as version `0` and include an explicit `0 → 1` baseline migration.
- [ ] Export `migrate(json, fromVersion): JSONContent` as the requested public API. It must apply every consecutive migration through the current version, never silently skip a version, and never mutate the caller’s input.
- [ ] Keep existing `NotionEditor` consumers compatible: preserve `NotionEditorUpdatePayload.json` and `.html`, adding `schemaVersion` as a sibling field rather than replacing the payload shape.
- [ ] Do not add server/database/localStorage persistence: this repository currently exposes document serialization through the editor `update` event and `getJSON()`, while the playground only stores an interaction flag.

## Current State

- [ ] `packages/schema/src/index.ts` is the public barrel for `@i-prikot/editor-schema` and currently exports `JSONContent` plus schema extensions, nodes, types, and utilities; it has no version or migration APIs.
- [ ] `packages/editor/src/components/notion/public-api.ts` defines `NotionEditorUpdatePayload`, and `packages/editor/src/components/notion/EditorProvider.vue` emits `{ json, html }` after the existing debounced document serialization.
- [ ] `NotionEditor` accepts and exposes raw `JSONContent`; no persistence owner exists in the workspace to automatically migrate a stored envelope during loading.
- [ ] Existing diagnostics are gated behind `developmentDiagnostics` and use `debugEditor`; production migration helpers should not emit the document JSON or other content to logs.

## Tasks

### Phase 1 — Versioned Persistence Contract

- [x] Create the public schema-version contract in `packages/schema/src/migrations/index.ts` and export it from `packages/schema/src/index.ts`.
  - [x] Deliverable: add `CURRENT_SCHEMA_VERSION = 1`, a typed persisted-document shape containing `schemaVersion` and `json: JSONContent`, and a helper that creates the current-version envelope from an editor JSON value.
  - [x] Expected behavior: every new document prepared for storage can be stamped with the current schema version without changing its Tiptap JSON structure; callers using `getJSON()` have a public, typed way to create the same envelope as update-event consumers.
  - [x] Logging: add no runtime logs or `console` calls in the constant/type/envelope helper; this code handles data only and must not expose document content.
  - [x] Dependencies: none.

### Phase 2 — Sequential JSON Migration API

- [x] Implement `migrate(json, fromVersion)` and the internal ordered migration registry in `packages/schema/src/migrations/index.ts`.
  - [x] Deliverable: model each migration as one step from version `N` to `N + 1`, register the baseline `0 → 1` migration for legacy unversioned documents, and execute all required steps until `CURRENT_SCHEMA_VERSION` is reached.
  - [x] Expected behavior: a valid current document returns equivalent JSON; a legacy version `0` document becomes current-version JSON; future migrations compose in numeric order; input JSON is cloned before any migration can modify it.
  - [x] Failure handling: reject non-integer/negative source versions, versions newer than the supported schema, and gaps in the migration registry with descriptive errors instead of attempting an unsafe downgrade or partial conversion.
  - [x] Logging: keep the API side-effect free and do not log JSON. Surface version and missing-step context through thrown error messages so the host can log at its own boundary.
  - [x] Dependencies: the version contract from Phase 1.

### Phase 3 — Expose the Version at the Editor Save Boundary

- [x] Extend `NotionEditorUpdatePayload` in `packages/editor/src/components/notion/public-api.ts` and populate it in `packages/editor/src/components/notion/EditorProvider.vue`.
  - [x] Deliverable: import `CURRENT_SCHEMA_VERSION` from `@i-prikot/editor-schema`, include `schemaVersion` alongside the existing `json` and `html` fields in every debounced `update` emission, and update the public payload type accordingly.
  - [x] Expected behavior: existing consumers continue receiving the same `json` and `html`; a consumer can persist `{ schemaVersion, json }` from the update payload and later call `migrate(saved.json, saved.schemaVersion)` before passing JSON back into the editor.
  - [x] Compatibility: do not change the `content` prop or the `getJSON()`/`setContent()` signatures, and do not add implicit migration inside the component because those APIs intentionally accept raw Tiptap JSON.
  - [x] Logging: when `developmentDiagnostics` is enabled, include only the numeric schema version in the existing `update-flushed` debug details; never log serialized document content.
  - [x] Dependencies: Phases 1 and 2 must export the final schema version and migration contract first.

### Phase 4 — Static Validation Without Tests

- [x] Validate the affected workspace packages after implementation without creating or running automated tests.
  - [x] Deliverable: run `npm run typecheck --workspace=@i-prikot/editor-schema` and `npm run typecheck --workspace=@i-prikot/editor`; run the focused package lint commands when the changed files are covered by their existing ESLint configuration.
  - [x] Expected behavior: the public barrel, migration types, and editor payload compile across the package boundary without dependency or declaration errors.
  - [x] Logging: retain command output as implementation evidence; report only command status and compiler/linter diagnostics, never sample document JSON.
  - [x] Dependencies: all implementation phases must be complete.

## Validation Criteria

- [x] The schema package publicly exports the current version, persisted-document type/helper, and `migrate(json, fromVersion)`.
- [x] Saving through the existing `NotionEditor` update event yields a payload with `schemaVersion`, `json`, and `html`, with no renamed or removed fields.
- [x] Migration runs every defined step from a legacy version to the current one, does not mutate input JSON, and fails safely for invalid, future, or incomplete-version paths.
- [x] No test files, test commands, docs files, dependency changes, or persistence backends are introduced.

## Risks and Mitigations

- [x] **Future-version document loaded by an older client:** throw a descriptive error rather than downgrading or discarding unsupported content.
- [x] **A future schema version is declared without its predecessor migration:** stop at the detected registry gap rather than returning partially upgraded JSON.
- [x] **Consumers persist JSON outside the update event:** export the envelope helper from the schema package so imperative `getJSON()` users can store the same versioned shape.
- [x] **Sensitive document data in diagnostics:** log only control metadata such as the numeric version; keep JSON out of console output.

## Implementation Handoff

- [x] Implement tasks in phase order; the editor payload change depends on the schema package export being finalized.
- [x] Treat unversioned historical JSON as `fromVersion = 0` at the host loading boundary.
- [x] When adding schema version `N + 1` later, increment `CURRENT_SCHEMA_VERSION`, add exactly one `N → N + 1` transformation, and preserve all earlier registry entries.
