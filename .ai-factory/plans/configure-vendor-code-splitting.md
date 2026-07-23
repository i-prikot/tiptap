<!-- handoff:task:a5abaced-da60-4805-89e7-7a9227f08401 -->
# Implementation Plan: Configure vendor code splitting

Branch: main
Created: 2026-07-22

## Settings

- [x] Testing: no — explicitly disabled by the handoff task; do not add or modify test cases.
- [x] Logging: verbose implementation diagnostics; do not add permanent runtime logging for this build-only change.
- [x] Docs: no — do not add documentation tasks or a documentation checkpoint.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped in Autonomous Handoff mode; the work supports the existing
Stage 7 performance objective without modifying the roadmap artifact.

## Scope and Constraints

- [x] Configure chunking in the consuming host at `apps/playground/vite.config.ts`, not in the editor library build. `packages/editor/vite.config.ts` is a `build.lib` configuration that deliberately leaves Vue, Tiptap, collaboration, and KaTeX imports external.
- [x] Keep the existing playground aliases for `@i-prikot/editor` and `@i-prikot/editor-schema`, CSS selector scoping, output directory, and default Rollup behavior for every module outside the requested vendor groups.
- [x] Emit deterministic, separate host chunks named `vendor-tiptap`, `vendor-collaboration`, and `vendor-katex` for the following resolved module families:
  - [x] `@tiptap/*`, including `@tiptap/pm/*` subpaths → `vendor-tiptap`.
  - [x] `@hocuspocus/*`, `yjs`, `y-prosemirror`, and `y-protocols` → `vendor-collaboration`.
  - [x] `katex` and its resolved JavaScript modules → `vendor-katex`.
- [x] Normalize Rollup module IDs before matching so the classifier works with both POSIX and Windows path separators; return no manual name for unrelated modules.
- [x] Preserve `packages/editor/package.json` peer dependencies for Vue and direct `@tiptap/*` packages. Do not move Yjs, Hocuspocus, or KaTeX to peer dependencies merely to influence chunking: peer metadata controls package installation/resolution, whereas `manualChunks` controls the host bundle graph.
- [x] Do not change editor behavior, public exports, package versions, lockfile metadata, tests, documentation, or generated baseline artifacts unless a dependency-resolution failure requires a narrowly scoped manifest correction.

## Tasks

### Phase 1: Define the host vendor-chunk policy

- [x] **Task 1: Add a deterministic manual chunk classifier to the playground Vite build.**
  - [x] Files: `apps/playground/vite.config.ts`.
  - [x] Add a small, named helper that accepts Rollup's resolved module ID, normalizes path separators, and assigns only the three requested vendor group names.
  - [x] Add `build.rollupOptions.output.manualChunks` using that helper while retaining `outDir: 'dist'`, the current aliases, CSS processing, and Vite defaults for all unmatched modules.
  - [x] Give the Tiptap matcher precedence for every `@tiptap/` module, including ProseMirror subpaths; group all Hocuspocus and Yjs support packages together; keep KaTeX isolated so its existing dynamic import remains a distinct lazy chunk.
  - [x] Avoid a catch-all `vendor` chunk and avoid manual rules for Vue, local workspace source, or unrelated third-party modules.
  - [x] **Logging:** use verbose terminal diagnostics while inspecting normalized IDs and the Vite/Rollup output. Do not add browser-side `console` calls or permanent config logging because chunk assignment is build-time only.

### Phase 2: Confirm package resolution remains host-owned

- [x] **Task 2: Verify the peer-dependency and externalization contract without changing it.**
  - [x] Files inspected: `packages/editor/package.json`, `packages/editor/vite.config.ts`, `apps/playground/package.json`, `packages/schema/package.json`, `package-lock.json`.
  - [x] Confirm Vue and every direct editor `@tiptap/*` runtime remain `peerDependencies` in `@i-prikot/editor` and are external in its library build, including the `@tiptap/pm/*` matcher.
  - [x] Confirm the playground host can resolve the peer packages through its workspace dependency tree and aliases, and that the collaboration/KaTeX packages remain installed runtime dependencies available to the host bundle.
  - [x] Run `npm ls --workspaces --include-workspace-root` for the relevant Vue, Tiptap, Hocuspocus, Yjs, and KaTeX packages; resolve only actual peer-resolution errors, preserving the established library/package ownership strategy.
  - [x] Explicitly verify that no package metadata change is required for `manualChunks` to classify the host-resolved modules.
  - [x] **Logging:** retain verbose package-manager and dependency-tree command output as implementation evidence. Do not add runtime logs; this task validates package metadata and build resolution only.

### Phase 3: Build and inspect emitted host chunks

- [x] **Task 3: Build the playground and verify the three vendor outputs.** (depends on Tasks 1–2)
  - [x] Files inspected/generated: `apps/playground/dist/assets/*`, `apps/playground/vite.config.ts`.
  - [x] Run `npm run build --workspace=@i-prikot/playground`; this is a production-build verification, not a test run.
  - [x] Inspect the generated asset graph and filenames to confirm separate `vendor-tiptap-*`, `vendor-collaboration-*`, and `vendor-katex-*` chunks are emitted when their source modules participate in the host build.
  - [x] Confirm Tiptap code is not merged into the main application chunk, Hocuspocus/Yjs support is not split across unrelated vendor chunks, and KaTeX remains independently loaded through its existing lazy-import path rather than becoming an eager application dependency.
  - [x] Confirm the build completes without unresolved peer-dependency or Rollup chunking warnings; do not update `packages/editor/BUNDLE_BASELINE.md` or add a report because documentation is disabled.
  - [x] **Logging:** preserve verbose build output and artifact-inspection commands as diagnostics. Do not add application logging or automated test commands.

## Completion Criteria

- [x] `apps/playground/vite.config.ts` assigns exactly the requested Tiptap, collaboration, and KaTeX vendor families to separate manual chunks while leaving unrelated modules to Vite/Rollup defaults.
- [x] A production playground build emits independently named Tiptap, collaboration, and KaTeX assets, with KaTeX remaining lazy-loaded.
- [x] `@i-prikot/editor` continues to externalize Vue and Tiptap for library consumers, and its existing peer-dependency strategy is shown not to block host-side chunk generation.
- [x] No test files, documentation artifacts, public APIs, dependency versions, or unrelated build/package configuration changes are introduced.
