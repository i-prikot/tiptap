<!-- handoff:task:fac74881-f843-4aea-a5e8-0a956fd99783 -->
# Implementation Plan: Настроить библиотечную сборку редактора

Branch: `main`
Created: 2026-07-17
Mode: fast (Autonomous Handoff)

## Goal

Сделать `@i-prikot/editor` корректной ESM-библиотекой для host-приложений:
Vite должен выпускать библиотечный ESM-артефакт, а `vue` и все напрямую
используемые пакеты `@tiptap/*` должны оставаться внешними peer-зависимостями.
Это исключает встраивание второго runtime-набора Tiptap/ProseMirror в пакет
редактора и позволяет host-приложению владеть единственным экземпляром этих
библиотек.

Текущий `packages/editor/vite.config.ts` уже использует `build.lib` с форматом
`es` и external-правилами для `vue` и `@tiptap/*`; реализация должна сохранить
этот контракт и устранить несоответствие в `package.json`, где эти модули пока
объявлены обычными `dependencies`.

## Settings

- [ ] Testing: no — explicitly disabled by the handoff task; do not add or modify test cases.
- [ ] Logging: verbose implementation diagnostics; do not add permanent runtime logging for package metadata or build configuration.
- [ ] Docs: no — do not add documentation tasks or a documentation checkpoint.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped for Autonomous Handoff mode; this is a focused packaging
correction for the Vue editor workspace.

## Constraints

- [x] Keep the package public API and its `.` / `./styles.css` export map unchanged.
- [x] Emit ESM only; do not add CommonJS, UMD, or additional entry points.
- [x] Treat `vue` and every direct `@tiptap/*` import, including `@tiptap/pm/*` subpaths, as host-owned peer runtime dependencies.
- [x] Keep `@i-prikot/editor-schema` and unrelated external dependency classifications unchanged unless build validation proves a direct requirement.
- [x] Do not change application code, editor behavior, release/versioning settings, tests, or documentation.
- [x] Regenerate `package-lock.json` only through the package-manager metadata update; do not retain unrelated lockfile churn.

## Tasks

### Phase 1: Align the library bundle contract

- [x] **Task 1: Make the Vite library contract explicit and preserve external runtime imports.**
  - [x] Files: `packages/editor/vite.config.ts`.
  - [x] Keep `packages/editor/src/index.ts` as the library entry, `formats: ['es']`, and the existing stable JS/CSS artifact names required by the package export map.
  - [x] Ensure Rollup externalizes the exact `vue` module and every `@tiptap/*` specifier via a matcher that also covers ProseMirror subpaths imported as `@tiptap/pm/...`; do not inline either runtime into generated chunks.
  - [x] Preserve the existing schema alias used during workspace builds and retain current unrelated externals without broadening the task scope.
  - [x] **Logging:** use verbose terminal diagnostics while examining the Vite output and external resolution. Do not add `console` calls or application logging because this task changes build metadata only.

### Phase 2: Publish the correct dependency boundary

- [x] **Task 2: Move Vue and direct Tiptap runtime packages to peer dependency declarations.**
  - [x] Files: `packages/editor/package.json`, `package-lock.json`.
  - [x] Remove `vue` and each direct `@tiptap/*` package from `dependencies`: `@tiptap/core`, `@tiptap/extension-drag-handle-vue-3`, `@tiptap/extension-emoji`, `@tiptap/pm`, `@tiptap/suggestion`, and `@tiptap/vue-3`.
  - [x] Add the same compatible version ranges to `peerDependencies`; retain the packages locally for type-checking and library builds through the package's development dependency setup when required by npm workspaces.
  - [x] Keep non-Tiptap runtime dependencies classified as they are, unless they are necessary only to support the newly declared peers; do not move the schema package or collaboration/Yjs/Floating UI/KaTeX packages as part of this task.
  - [x] Regenerate and review the lockfile workspace entry so it mirrors the intended `dependencies`, `peerDependencies`, and development-only metadata without modifying unrelated package resolutions.
  - [x] **Logging:** record verbose package-manager and dependency-tree diagnostics during implementation. Do not introduce runtime logs; dependency classification has no browser-side execution path.

### Phase 3: Verify distributable output without adding tests

- [x] **Task 3: Build and inspect the editor package as a consumer-facing ESM artifact.** (depends on Tasks 1–2)
  - [x] Files inspected/generated: `packages/editor/dist/index.js`, generated `packages/editor/dist/*.js`, `packages/editor/dist/styles.css`, `packages/editor/dist/index.d.ts`.
  - [x] Run a clean workspace build with `npm run build --workspace=@i-prikot/editor` and confirm the package still emits declarations, ESM JavaScript, and the stylesheet declared by `packages/editor/package.json`.
  - [x] Inspect generated JavaScript imports/chunks to confirm `vue` and `@tiptap/*` remain import specifiers rather than bundled implementations, with no duplicated ProseMirror code embedded in `dist`.
  - [x] Check the resolved workspace dependency tree for `vue`, `@tiptap/core`, and `@tiptap/pm` to confirm peer resolution does not introduce a nested editor-owned copy.
  - [x] **Logging:** preserve the build command output and dependency-tree inspection as verbose implementation evidence. No automated test command is required or added because testing is explicitly disabled.

## Completion Criteria

- [x] `@i-prikot/editor` produces only ESM library output compatible with its current export map.
- [x] `vue` and all direct `@tiptap/*` dependencies are external in Vite and declared as `peerDependencies`, not production `dependencies`.
- [x] The built editor artifact imports the host's Vue/Tiptap runtime instead of embedding Vue, Tiptap, or ProseMirror code.
- [x] No test files, documentation artifacts, public API exports, or unrelated dependency classifications change.
