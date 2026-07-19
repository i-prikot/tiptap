<!-- handoff:task:fc22af8e-f5b9-4776-b167-9fa44b68de7b -->
# Implementation Plan: Создать Vue-пакет редактора

Branch: `main`
Created: 2026-07-17
Mode: fast (Autonomous Handoff)

## Goal

Deliver `@i-prikot/editor` as the Vue-facing editor package. It must contain the
`NotionEditor` component, all Vue UI for toolbars, menus, tables and primitives,
the editor-owned composables and styles, while consuming the isomorphic
`@i-prikot/editor-schema` package for document schema and ProseMirror behavior.

The repository already contains the initial workspace migration. Use it as the
baseline, close any remaining boundary or packaging gaps, and do not duplicate
source that is already correctly owned by `packages/editor`.

## Settings

- [ ] Testing: no — explicitly disabled by the handoff task; do not add or modify test cases.
- [ ] Logging: verbose implementation diagnostics; do not introduce permanent runtime logging for this packaging work.
- [ ] Docs: no — do not create documentation tasks or a documentation checkpoint.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped for Autonomous Handoff mode; the work corresponds to the
editor-library item in Roadmap Stage 4.

## Constraints

- [ ] Keep `@i-prikot/editor-schema` free of `vue`, `@tiptap/vue-3`, Vue SFCs, and `VueNodeViewRenderer` imports.
- [ ] Keep host-specific concerns in `apps/playground`: bootstrap, header, demo seed content, environment access, CTA UI, and mock upload behavior.
- [ ] Use relative imports inside a workspace and package-name imports across workspace boundaries.
- [ ] Preserve the public `NotionEditor` contract, feature flags, collaboration/image-upload adapters, lifecycle events, and host overlay target API.
- [ ] Do not make this task publish packages or change versioning/release automation; publication is a separate roadmap concern.

## Commit Plan

- [ ] **Commit 1** (after tasks 1–3): `feat: package Vue editor with schema node-view adapters`
- [ ] **Commit 2** (after tasks 4–6): `build: expose editor styles and consume package in playground`

## Tasks

### Phase 1: Define the package boundary

- [x] **Task 1: Finalize the `@i-prikot/editor` workspace and build contract.**
  - [ ] Files: `packages/editor/package.json`, `packages/editor/tsconfig.json`, `packages/editor/vite.config.ts`, `package.json`, `tsconfig.base.json`, `tsconfig.json`.
  - [ ] Ensure the package has ESM and declaration output, a public root export and a `./styles.css` export, and is included in npm workspaces and TypeScript project references.
  - [ ] Configure Vite library mode to emit the Vue package entry and stylesheet without bundling host-owned or duplicate framework dependencies. Keep `vue`, `@tiptap/*`, the schema package, Floating UI, collaboration/Yjs libraries, and KaTeX external where required by the consumer contract.
  - [ ] Classify dependencies consistently with the package boundary; do not introduce a second ProseMirror/Tiptap runtime into consuming applications.
  - [ ] **Logging:** retain concise `INFO` workspace headings in root build/typecheck scripts; emit verbose command diagnostics only while implementing. Do not add browser `console` calls because this task changes module metadata and build configuration only.

- [x] **Task 2: Consolidate the Vue editor shell and reusable public API in `packages/editor`.**
  - [ ] Files: `packages/editor/src/index.ts`, `packages/editor/src/components/notion/NotionEditor.vue`, `packages/editor/src/components/notion/EditorProvider.vue`, `packages/editor/src/components/notion/public-api.ts`, `packages/editor/src/components/**`, `packages/editor/src/composables/**`, `packages/editor/src/icons/index.ts`, `packages/editor/src/types/**`.
  - [ ] Keep the editor shell, editor provider, toolbar/menu/table UI, command buttons, primitives, icons, and Vue-specific composables under `packages/editor/src`.
  - [ ] Export only intentional consumer-facing symbols from `src/index.ts`: `NotionEditor`, documented controls/primitives, image upload types, feature/options types, lifecycle payloads, and overlay-target helpers. Keep internal implementation files unexported.
  - [ ] Preserve dependency injection and `Editor` lifecycle ownership inside the package; the host supplies configuration and receives events rather than importing internal composables.
  - [ ] **Logging:** preserve existing `ERROR` propagation for editor creation, image upload, and collaboration failures through callbacks/events. Use temporary verbose diagnostics only to trace relocation/import failures, then remove them; add no permanent `DEBUG` or `INFO` browser logs.

### Phase 2: Bind schema nodes to Vue NodeViews

- [x] **Task 3: Implement editor-owned Vue adapters for custom schema nodes.**
  - [ ] Files: `packages/schema/src/extensions/extension-kit.ts`, `packages/schema/src/nodes/image/image.ts`, `packages/schema/src/nodes/image-upload/image-upload.ts`, `packages/schema/src/nodes/toc/toc.ts`, `packages/editor/src/extensions/extension-kit.ts`, `packages/editor/src/nodes/image/image-node.ts`, `packages/editor/src/nodes/image/ImageNodeView.vue`, `packages/editor/src/nodes/image-upload/image-upload-node.ts`, `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue`, `packages/editor/src/nodes/toc/toc-node.ts`, `packages/editor/src/nodes/toc/TocNodeView.vue`.
  - [ ] Keep the three base node definitions (`image`, `imageUpload`, `toc`) schema-only, including their attributes, commands, parsing/rendering behavior, and configuration types.
  - [ ] In the editor package, derive each visual node with `.extend({ addNodeView: () => VueNodeViewRenderer(...) })`; use the relevant Vue SFC for image, upload-progress, and table-of-contents behavior. Preserve the TOC `stopEvent` behavior needed for item interaction.
  - [ ] Make the editor extension-kit factory call the schema factory with the three Vue node overrides, so consumers receive Vue NodeViews without changing the schema factory's isomorphic default.
  - [ ] **Logging:** route recoverable upload errors to the existing `onImageUploadError` callback at `ERROR` level in the host's logging policy; do not log document transactions or NodeView lifecycle events. Use temporary `DEBUG` traces only when diagnosing a missing NodeView registration and remove them before completion.

- [x] **Task 4: Package the complete editor UI stylesheet behind a stable consumer import.**
  - [ ] Files: `packages/editor/src/styles.css`, `packages/editor/src/styles/**`, `packages/editor/src/components/**`, `packages/editor/vite.config.ts`, `packages/editor/package.json`.
  - [ ] Aggregate all editor CSS from a single source entry and emit it as `dist/styles.css`, reachable through `@i-prikot/editor/styles.css`.
  - [ ] Keep styles required by menus, floating UI, table controls, custom nodes, primitives, editor typography, and design tokens with the editor package. Scope selectors to the editor root (`.tinyfy-editor`) where feasible so application CSS is not unintentionally affected.
  - [ ] Exclude playground-only styles such as the header and CTA popup from the library output; retain only styles required for `NotionEditor` and explicitly exported reusable controls.
  - [ ] **Logging:** do not add runtime logging. At build time, record `INFO` output for the generated CSS artifact and use temporary `DEBUG` inspection only for unresolved CSS imports or unintended global selectors.

### Phase 3: Integrate the consumer and verify artifacts

- [x] **Task 5: Make `apps/playground` consume the editor strictly as a package client.**
  - [ ] Files: `apps/playground/package.json`, `apps/playground/tsconfig.json`, `apps/playground/vite.config.ts`, `apps/playground/src/main.ts`, `apps/playground/src/App.vue`, `apps/playground/src/components/**`, `apps/playground/src/composables/**`, `apps/playground/src/content/**`, `apps/playground/src/styles/**`.
  - [ ] Import `NotionEditor`, its public types/helpers, and `@i-prikot/editor/styles.css` from package entry points; leave source aliases only where local development needs them and ensure they match the production export contract.
  - [ ] Keep document-id parsing, seed data, environment reads, collaboration/AI options, mock image upload, header/theme controls, and CTA behavior in the playground.
  - [ ] Remove any remaining application imports of editor internals or former root-app paths, while preserving the existing browser behavior and overlay target setup.
  - [ ] **Logging:** preserve development diagnostics passed through the public `NotionEditor` API and existing error callbacks. Do not emit secret-bearing environment values; use `WARN` only for disabled optional integrations and `ERROR` for failed setup.

- [x] **Task 6: Validate workspace boundaries and distributable artifacts without adding tests.**
  - [ ] Files: inspect generated `packages/editor/dist/**`; modify only the configuration files from tasks 1–5 if validation exposes a package-contract defect.
  - [ ] Run the package-level typecheck/build commands and the root workspace build. Confirm that the editor emits `dist/index.js`, declarations, and `dist/styles.css`; confirm the playground builds against the package API.
  - [ ] Inspect import boundaries: schema must not import Vue, editor must not import playground modules, and the published editor entry must not expose private implementation paths by accident.
  - [ ] Use `npm pack --dry-run --workspace=@i-prikot/editor` to confirm that the package archive contains only the intended distributable files and exports.
  - [ ] **Logging:** retain full command output as verbose implementation evidence, classify validation failures as `ERROR`, and report boundary violations with the offending path. Do not create or run new test cases because testing is explicitly disabled for this task.

## Completion Criteria

- [x] `@i-prikot/editor` contains the Vue editor UI, composables, NodeView SFCs, reusable controls, and library styles.
- [x] `@i-prikot/editor-schema` remains isomorphic and contains no Vue rendering dependency.
- [x] Image, image-upload, and TOC extensions use editor-side `.extend({ addNodeView: () => VueNodeViewRenderer(...) })` adapters.
- [x] `@i-prikot/editor/styles.css` resolves to the built stylesheet and excludes playground-only CSS.
- [x] `apps/playground` runs as a package consumer without importing editor internals.
- [x] Package typecheck/build and workspace build pass; no new tests or documentation work are introduced.
