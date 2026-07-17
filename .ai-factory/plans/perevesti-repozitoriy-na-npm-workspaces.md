<!-- handoff:task:78769c9a-3af9-44f9-bced-9364ca8b5363 -->
# Migrate the Repository to npm Workspaces

**Created:** 2026-07-16  
**Branch:** `main`  
**Mode:** fast (Autonomous Handoff)

## Goal

Convert the current single Vite/Vue application into an npm-workspaces monorepo with these ownership boundaries:

| Workspace | Package name | Responsibility |
| --- | --- | --- |
| `packages/schema` | `@tinyfy/editor-schema` | Isomorphic Tiptap extensions, custom-node schemas, document types, and schema assembly; no Vue imports or NodeViews. |
| `packages/editor` | `@tinyfy/editor` | Vue editor component, Vue NodeView adapters, composables, UI primitives, menus, editor styles, and public Vue API. |
| `packages/renderer` | `@tinyfy/renderer` | Server-renderer workspace foundation that consumes the schema package; rendering functionality itself remains out of this migration's scope. |
| `apps/playground` | `@tinyfy/playground` | Existing demo application, development configuration, environment integration, and manual QA host. |

The root remains private and owns workspace orchestration, shared development tooling, Git hooks, and the npm lockfile.

## Settings

- [x] **Testing:** no new or modified test cases requested.
- [x] **Logging:** verbose implementation diagnostics for commands; do not add runtime logging because this migration changes packaging and module boundaries only.
- [x] **Docs:** no documentation updates requested.
- [x] **Package manager:** npm workspaces with the existing root `package-lock.json`.

## Roadmap Linkage

- [x] **Milestone:** `none`
- [x] **Rationale:** skipped for Autonomous Handoff mode. The work implements the workspace structure described under Roadmap Stage 4.

## Constraints and Migration Rules

- [x] Preserve the current runtime behavior of the playground and the current public `NotionEditor` API.
- [x] Do not leave production source imports using the old root alias (`@/editor` or `@/playground`). Internal imports stay relative; cross-workspace imports use package names.
- [x] Keep `@tinyfy/editor-schema` free of `vue`, `@tiptap/vue-3`, Vue SFCs, and `VueNodeViewRenderer`.
- [x] Split each existing custom NodeView into a schema-only node definition and an editor-owned Vue adapter. The current Vue-coupled nodes are image, image-upload, and table-of-contents.
- [x] Move application-only files (`App.vue`, `main.ts`, playground components/composables/content/styles, `index.html`, and static assets) to `apps/playground`.
- [x] Retain existing root test files without adding test work; update only tooling resolution where required so existing test commands can resolve the relocated source packages.
- [x] Regenerate `package-lock.json` through npm after every workspace manifest is in place; do not hand-edit lockfile entries.

## Tasks

### Phase 1 — Establish the workspace foundation

- [x] **1. Define root workspace orchestration and shared TypeScript/tooling configuration.**
  - [x] **Files:** modify `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, and `eslint.config.js`; create `tsconfig.base.json`; remove or relocate root-only Vite configuration after the playground owns it.
  - [x] Add npm `workspaces` for `packages/*` and `apps/*`; keep the root `private`; replace single-app scripts with root orchestration commands that delegate to `@tinyfy/playground` and run workspace-aware build, typecheck, lint, formatting, and hook workflows.
  - [x] Move shared compiler options into `tsconfig.base.json`, configure package/app `tsconfig` inheritance and project references, and make tooling resolve package source through their workspace names rather than `@/` aliases.
  - [x] Preserve root ownership of development-only tools (Vite, Vitest, ESLint, TypeScript, Playwright, Husky, Prettier) while runtime dependencies are assigned to the workspace that imports them.
  - [x] **Logging:** print the selected workspace and command in npm scripts where useful; introduce no browser/runtime logs.
  - [x] **Depends on:** none.

- [x] **2. Extract an isomorphic `@tinyfy/editor-schema` package.**
  - [x] **Files:** create `packages/schema/package.json`, `packages/schema/tsconfig.json`, and `packages/schema/src/index.ts`; move/refactor `src/editor/extensions/**`, schema-safe node definitions from `src/editor/nodes/**`, schema-level types, and only their required pure utilities/content into `packages/schema/src/**`.
  - [x] Separate `image`, `image-upload`, and `toc` node specifications into schema-only modules containing attributes, commands, parsing, and HTML serialization; remove `addNodeView` and all Vue renderer imports from those modules.
  - [x] Rebuild the extension kit and public barrel so consumers receive one documented schema assembly API plus exported node/extension types. Export table-handle/UI-state types needed by the editor without importing editor code.
  - [x] Assign only direct schema runtime dependencies to `packages/schema/package.json` (Tiptap core/extensions/ProseMirror/Yjs-related packages actually imported by the extracted code); verify its dependency graph has no Vue or floating-UI packages.
  - [x] **Logging:** no runtime logs; surface module-resolution/type errors during workspace typechecking with package-qualified command output.
  - [x] **Depends on:** task 1.

- [x] **3. Extract the Vue-facing `@tinyfy/editor` package and restore NodeViews.**
  - [x] **Files:** create `packages/editor/package.json`, `packages/editor/tsconfig.json`, `packages/editor/src/index.ts`, and a stylesheet entry such as `packages/editor/src/styles.css`; move the remaining `src/editor/components/**`, `composables/**`, Vue NodeView SFCs, icons, editor-only utilities, styles, and editor public API into `packages/editor/src/**`.
  - [x] Implement editor-owned adapters that extend the schema's image, image-upload, and TOC node definitions with `VueNodeViewRenderer`, then assemble the interactive editor extension list from `@tinyfy/editor-schema` plus these adapters.
  - [x] Update all moved imports: editor-to-schema imports use `@tinyfy/editor-schema`; editor internals use relative paths; remove root alias dependencies and preserve exported components/types currently exposed by `src/editor/index.ts`.
  - [x] Expose the editor stylesheet as a package export so the playground imports a single stable CSS entry instead of importing the former root source tree.
  - [x] Declare `@tinyfy/editor-schema` with the npm-compatible matching local version `0.1.0` (npm creates the workspace link) and assign Vue, `@tiptap/vue-3`, Floating UI, collaboration client, and other editor-only runtime dependencies to this package.
  - [x] **Logging:** no runtime logs; add no debug statements while relocating UI code, and make package typecheck failures identify `@tinyfy/editor`.
  - [x] **Depends on:** task 2.

### Phase 2 — Move the host application and complete all workspaces

- [x] **4. Move the existing demo into `@tinyfy/playground` and wire it to package APIs.**
  - [x] **Files:** create `apps/playground/package.json`, `apps/playground/tsconfig.json`, `apps/playground/vite.config.ts`, and `apps/playground/index.html`; move `src/main.ts`, `src/App.vue`, and all `src/playground/**` files to `apps/playground/src/**`; move any app-only static assets from `public/**` into `apps/playground/public/**`; delete the obsolete root application entry files after imports resolve.
  - [x] Replace direct imports from former `src/editor/**` paths with the public exports of `@tinyfy/editor`, import the editor stylesheet through its package export, and keep app-specific document ID, seed content, environment reads, collaboration setup, theme UI, and CTA behavior inside the playground.
  - [x] Configure Vite's app root, source alias (if retained, only for `apps/playground/src`), filesystem access, and output directory so linked workspace sources work in development and production builds.
  - [x] Declare `@tinyfy/editor` and `@tinyfy/editor-schema` with npm-compatible matching local versions `0.1.0` (npm creates workspace links); leave application-specific dev/runtime configuration in the playground manifest.
  - [x] **Logging:** preserve existing application diagnostics; add no migration-specific browser logs. Vite commands must clearly identify the playground workspace.
  - [x] **Depends on:** tasks 1–3.

- [x] **5. Create the `@tinyfy/renderer` workspace boundary without implementing publishing renderer features.**
  - [x] **Files:** create `packages/renderer/package.json`, `packages/renderer/tsconfig.json`, and `packages/renderer/src/index.ts` (plus minimal type/source entry files required by configured builds).
  - [x] Define the package as Node-compatible ESM and give it an explicit dependency on `@tinyfy/editor-schema` using the npm-compatible matching local version `0.1.0` (npm creates the workspace link); reserve `@tiptap/html` and server-rendering dependencies for the renderer implementation only when its exported API needs them.
  - [x] Add a narrow, truthful public entrypoint (for example, renderer input/output types or a deliberate empty foundation) rather than shipping a stub `renderDocument` that appears functional. Keep all Vue and browser-only code out of this package.
  - [x] Add package exports and build/typecheck metadata consistent with the other workspaces so consumers can resolve `@tinyfy/renderer` once its rendering milestone is implemented.
  - [x] **Logging:** no runtime logs; package commands should report renderer build/typecheck failures with workspace context.
  - [x] **Depends on:** tasks 1–2.

- [x] **6. Finalize dependency ownership, lockfile state, and repository-wide tooling resolution.**
  - [x] **Files:** modify root and workspace `package.json` files, `package-lock.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, root/child TypeScript configs, and any remaining import/config references exposed by the migration; remove empty legacy `src/`, root `index.html`, and obsolete root aliases/config files.
  - [x] Run `npm install` at the repository root to record all workspaces and `workspace:*` links in `package-lock.json`; ensure each third-party runtime dependency appears in the package that imports it while shared development tools remain rooted.
  - [x] Update Vitest, Playwright, ESLint, and TypeScript resolution to follow the new app/package source locations without editing or adding test cases. Ensure coverage include/exclude paths and browser test server commands point to `apps/playground`.
  - [x] Validate the migration with `npm run typecheck`, `npm run lint`, `npm run build`, and a manual `npm run dev` smoke start for `@tinyfy/playground`. Do not run or add test work because testing is disabled for this task.
  - [x] **Logging:** capture verbose command output during migration validation; do not add application logging.
  - [x] **Depends on:** tasks 3–5.

## Dependency Order

`1 → 2 → 3 → 4 → 6` and `1 → 2 → 5 → 6`. The playground must switch only after the editor exposes its final workspace API; the root lockfile and tool configuration are finalized after all manifests and paths exist.

## Acceptance Criteria

- [x] Repository contains exactly the requested workspace roots: `packages/schema`, `packages/editor`, `packages/renderer`, and `apps/playground`.
- [x] Root `package.json` declares npm workspaces and root commands delegate to the app/packages instead of a root `src` application.
- [x] `@tinyfy/editor-schema` can be typechecked without Vue packages or Vue NodeView code.
- [x] `@tinyfy/editor` consumes the locally linked schema workspace through npm-compatible matching version `0.1.0`, owns Vue UI and NodeView adapters, and exports the existing editor public API plus a stylesheet entry.
- [x] `@tinyfy/playground` builds and starts through its workspace command while importing `@tinyfy/editor` rather than root-relative editor source files.
- [x] `@tinyfy/renderer` is a resolvable workspace package with a schema dependency and no Vue/browser dependency.
- [x] `package-lock.json` is npm-generated and represents all workspaces; no old root `src` or root app entrypoint remains.
- [x] `npm run typecheck`, `npm run lint`, and `npm run build` succeed; test cases and documentation are not added or changed for this task.

## Commit Plan

1. After tasks 1–4: `refactor(workspaces): split schema editor and playground packages`
2. After tasks 5–6: `refactor(workspaces): add renderer workspace and update tooling`

## Rework — 2026-07-16

- [x] Update `vitest.config.ts` so legacy source resolution prioritizes extension and `index` candidates and returns only files, preventing directory resolutions such as `packages/schema/src/extensions/table-handle/`. Verified RED with `npm test -- test/editor/extensions/table-handle.integration.test.ts` (`EISDIR`), GREEN with the same command (2 passed), and `npm test` (no `EISDIR` failures; unrelated existing failures remain).

## Rework — 2026-07-16

- [x] **Address blocking finding `02c6b3933c15` / `9a64e415a4da`: declare `@tiptap/extension-emoji` directly in `@tinyfy/editor`.**
  - [x] Added `@tiptap/extension-emoji: ^3.27.1` to `packages/editor/package.json` for `EmojiMenuItem.vue`'s direct type import.
  - [x] Regenerated `package-lock.json` using `npm install --package-lock-only --ignore-scripts`.
  - [x] Verified with `npm run typecheck --workspace=@tinyfy/editor` and `npm ls --workspace=@tinyfy/editor @tiptap/extension-emoji --depth=0`.
