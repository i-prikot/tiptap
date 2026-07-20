<!-- handoff:task:5ed90f5f-95c1-4903-b0bb-0567422ff1ad -->
# Implementation Plan: Extract an Isomorphic Editor Schema Package

Branch: `main`
Created: 2026-07-17

## Settings
- [ ] Testing: no — requested scope excludes adding or running tests.
- [ ] Logging: verbose — preserve existing diagnostics, but add no runtime logging for this package-boundary refactor.
- [ ] Docs: no — requested scope excludes documentation changes.

## Roadmap Linkage
Milestone: "none"
Rationale: "Autonomous handoff defaults to no roadmap linkage; this is an internal package-boundary refactor."

## Scope and Dependency Contract
- [x] Create the publishable workspace package `@i-prikot/editor-schema` under `packages/schema/`; its public entry point must be `packages/schema/src/index.ts` and its compiled output must be JavaScript plus declarations in `packages/schema/dist/`.
- [x] The schema package may depend on Tiptap, ProseMirror, and data-model dependencies such as `yjs`, but must not import `vue`, `@tiptap/vue-3`, a `.vue` file, or any source under `packages/editor/`.
- [x] Move schema-only extensions, marks configured by the extension kit, custom node specifications, shared Tiptap type augmentation, and pure editor/table utilities into `@i-prikot/editor-schema`. Keep declarative schema behavior intact: names, attributes, defaults, commands, `parseHTML`, and `renderHTML` output remain compatible.
- [x] Keep Vue `NodeView` components and `VueNodeViewRenderer` calls in `@i-prikot/editor`. The editor package wraps the base `Image`, `ImageUploadNode`, and `TocNode` exports with `.extend({ addNodeView() { ... } })` instead of duplicating their schemas.
- [x] The schema entry point must be safe to import in a Node.js process: no DOM access during module initialization, and browser-only DOM use inside extension callbacks must be guarded or deferred until it runs in a browser editor.
- [x] Do not change external editor UI APIs, serialize a different document format, add test files, run `npm test`, or make documentation changes.

## Commit Plan
- [ ] **Commit 1** (after tasks 1–3): `refactor: extract editor schema package`
- [ ] **Commit 2** (after tasks 4–5): `refactor: wire editor to schema package`

## Tasks

### Phase 1: Establish the Package Boundary
- [x] **Task 1: Add the `@i-prikot/editor-schema` workspace package and build wiring.**
  - [x] Files: `packages/schema/package.json`, `packages/schema/tsconfig.json`, `packages/schema/src/index.ts`, root `package.json`, `package-lock.json`, `tsconfig.base.json`, `vitest.config.ts`, `packages/editor/vite.config.ts`, `apps/playground/vite.config.ts`.
  - [x] Define ESM exports, declaration generation, and `dist/` publishing metadata for `@i-prikot/editor-schema`; list only the schema runtime dependencies required by its source and keep Vue out of its manifest.
  - [x] Register workspace build/typecheck/lint ordering so schema compiles before packages that consume it; add development/test aliases that resolve the workspace package to `packages/schema/src/index.ts` without altering the existing public `@i-prikot/editor` API.
  - [x] Logging: no new runtime logs — manifest, TypeScript, and resolver changes are static wiring; retain existing build-command output and error handling unchanged.

- [x] **Task 2: Move all schema-only extensions, marks, utilities, and type declarations into the schema source tree.**
  - [x] Files: create/move `packages/schema/src/extensions/{extension-kit,horizontal-rule,indent,list-normalization,node-alignment,node-background,table-kit,triple-click-block-selection,ui-state}.ts`, `packages/schema/src/extensions/table-handle.ts`, `packages/schema/src/extensions/table-handle/{decorations,drag-and-drop,plugin,types}.ts`, `packages/schema/src/utils/tiptap-utils.ts`, `packages/schema/src/utils/table-utils/{index,cell-selection,shared,table-calculations,table-map}.ts`, `packages/schema/src/types/{image-upload,tiptap-augmentations,toc,user}.ts`; remove or convert the corresponding schema implementations under `packages/editor/src/extensions/`, `packages/editor/src/utils/`, and `packages/editor/src/types/`.
  - [x] Preserve all custom extension behavior and the `createExtensionKit` composition, including standard marks/extensions (for example text style/color/highlight, subscript/superscript, typography, lists, collaboration, and table support), feature flags, and the injected node override seam.
  - [x] Keep pure table drag/decorations and Tiptap helper code framework-neutral; do not import UI components, composables, editor services, or Vue lifecycle APIs.
  - [x] Logging: no new runtime logs — preserve any existing warnings/errors and do not introduce `console` diagnostics in moved pure-schema code.

- [x] **Task 3: Extract the custom node specifications without their NodeViews.** (depends on Task 2)
  - [x] Files: create/move `packages/schema/src/nodes/image/image.ts`, `packages/schema/src/nodes/image-upload/image-upload.ts`, and `packages/schema/src/nodes/toc/toc.ts`; update `packages/schema/src/index.ts`; remove the duplicated base schema definitions from `packages/editor/src/nodes/**` where present.
  - [x] Export framework-neutral `Image`, `ImageUploadNode`, and `TocNode` definitions with the same node names, groups, attribute defaults, command names, `parseHTML` selectors, and `renderHTML` data attributes as before; export their public option/attribute types from the schema package.
  - [x] Ensure image-upload keyboard and DOM-related behavior does not evaluate browser globals at import time and returns safely when executed without a DOM; do not move `ImageNodeView.vue`, `ImageUploadNodeView.vue`, `TocNodeView.vue`, or their styling into the schema package.
  - [x] Logging: no new runtime logs — retain existing user-visible error handling in the Vue layer and avoid logging from node schema definitions.

### Phase 2: Keep Vue Integration as a Thin Adapter
- [x] **Task 4: Replace editor copies with schema re-exports and Vue-only NodeView adapters.** (depends on Tasks 1–3)
  - [x] Files: `packages/editor/package.json`, `packages/editor/src/extensions/{extension-kit,table-handle,table-kit,ui-state}.ts`, `packages/editor/src/nodes/image/image-node.ts`, `packages/editor/src/nodes/image-upload/image-upload-node.ts`, `packages/editor/src/nodes/toc/toc-node.ts`, `packages/editor/src/types/{image-upload,tiptap-augmentations,toc,user}.ts`, `packages/editor/src/utils/{table-utils,tiptap-utils}.ts`, `packages/editor/src/index.ts`.
  - [x] Add `@i-prikot/editor-schema` as the editor dependency; turn extension/type/utility modules into compatibility re-exports where their public paths remain in use.
  - [x] Have the editor's extension-kit call the schema factory with its Vue-enhanced image, image-upload, and TOC nodes. Each adapter may only add `VueNodeViewRenderer` and UI-specific options such as TOC event handling; schema attributes, commands, parsing, and HTML rendering remain owned by the base node.
  - [x] Keep existing editor public exports stable and ensure Tiptap declaration augmentation is loaded from the schema package rather than duplicated in the editor package.
  - [x] Logging: no new runtime logs — retain current NodeView error reporting and behavior unchanged; re-export/adaptor changes must not add telemetry or console output.

### Phase 3: Consume and Validate the Isomorphic Contract
- [x] **Task 5: Update non-Vue consumers and verify the dependency boundary with static builds.** (depends on Task 4)
  - [x] Files: `packages/renderer/package.json`, `packages/renderer/src/index.ts`, `apps/playground/package.json`, root `package.json`, `package-lock.json`, `eslint.config.js`.
  - [x] Make renderer and playground consume the workspace schema package where they need schema types or source resolution; retain renderer as a Node-compatible consumer with no dependency on `@i-prikot/editor` or Vue.
  - [x] Add/enforce the one-way lint boundary that forbids imports from `packages/editor/src` into `packages/schema/src`; search the schema source for `vue`, `@tiptap/vue-3`, and `.vue` imports, and confirm no browser global is read at module initialization.
  - [x] Run `npm run build --workspace=@i-prikot/editor-schema`, `npm run typecheck`, and `npm run lint`; do not add tests or execute `npm test`, per scope.
  - [x] Logging: no new runtime logs — validation relies on compiler/linter command output only, with failures left visible to the caller.

## Completion Criteria
- [x] `@i-prikot/editor-schema` is a standalone ESM workspace package with declarations and no Vue dependency or import path.
- [x] All schema extensions, marks configured by the extension kit, custom node specs, schema attributes, `parseHTML`, and `renderHTML` behavior are owned by the schema package.
- [x] Vue NodeViews stay in `@i-prikot/editor`, and its three custom nodes are thin `.extend()` adapters over schema exports.
- [x] `@i-prikot/editor-renderer` can import schema types in Node.js without loading Vue or requiring browser globals at module import time.
- [x] Static package builds, workspace type checking, and linting pass; no tests or documentation files are changed.
