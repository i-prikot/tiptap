<!-- handoff:task:65274f00-1f37-4f11-96f0-f1e759604fc0 -->
# Implementation Plan: Собрать единый CSS редактора

Branch: `main`
Created: 2026-07-17
Mode: fast (Autonomous Handoff)

## Goal

Собрать стили `@i-prikot/editor` через единственный исходный CSS-вход
`packages/editor/src/styles/index.css` и выпускать итоговый библиотечный файл
`packages/editor/dist/style.css`. Сохранить текущий порядок каскада, включая
стили KaTeX, и обеспечить, что локальный playground и опубликованный package
subpath разрешают новый файл.

В текущем коде CSS уже агрегируется в `packages/editor/src/styles.css` и
импортируется из `packages/editor/src/index.ts`; файла `main.ts` в пакете нет.
Реализация должна перенести этот действующий агрегатор в каталог `styles/`, а
не пытаться менять отсутствующую точку входа.

## Settings

- [ ] Testing: no — explicitly disabled by the handoff task; do not add or modify test cases.
- [ ] Logging: verbose implementation diagnostics; do not add permanent runtime logging for CSS or build configuration.
- [ ] Docs: no — do not add documentation tasks or a documentation checkpoint.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped for Autonomous Handoff mode; this is a focused editor
packaging and stylesheet-entry refactor.

## Constraints

- [ ] Preserve the existing import order from `packages/editor/src/styles.css`; keep the KaTeX import first so vendor and editor cascade behavior does not change.
- [ ] Do not edit individual files in `packages/editor/src/styles/*.css` or change component class names, tokens, or visual behavior.
- [ ] Make `./style.css` the canonical package export for `dist/style.css`; retain `./styles.css` as a compatibility alias to the same generated file.
- [ ] Keep `build.emptyOutDir: false` because declaration output is emitted before Vite runs; remove only the obsolete stylesheet artifact rather than clearing `dist` wholesale.
- [ ] Do not add tests, documentation, release/version changes, or unrelated workspace changes.

## Tasks

### Phase 1: Establish the canonical source stylesheet

- [x] **Task 1: Move the aggregate CSS entry under `styles/` and connect it to the library entry.**
  - [x] Files: create `packages/editor/src/styles/index.css`; modify `packages/editor/src/index.ts`; delete `packages/editor/src/styles.css`.
  - [x] Move every existing `@import` statement into `styles/index.css` without reordering, keeping `katex/dist/katex.min.css` first and preserving each current relative path.
  - [x] Replace the library entry import with `import './styles/index.css'` so Vite still discovers one stylesheet from the JavaScript library entry.
  - [x] Remove the former root-level aggregate only after all callers have been redirected; individual stylesheet modules remain untouched.
  - [x] **Logging:** use verbose terminal inspection to compare source import count and order before and after the move. Do not add browser-side logs because CSS aggregation has no runtime logging path.

### Phase 2: Align generated artifacts and public CSS subpaths

- [x] **Task 2: Emit `dist/style.css` and eliminate stale `dist/styles.css` during editor builds.** (depends on Task 1)
  - [x] Files: modify `packages/editor/vite.config.ts`, `packages/editor/package.json`; create `packages/editor/scripts/clean-stale-css.mjs`.
  - [x] Change the Vite library CSS filename from `styles` to `style`, producing `packages/editor/dist/style.css` while retaining the existing ESM entry, aliases, external rules, and `emptyOutDir: false` behavior.
  - [x] Update `exports` so canonical `@i-prikot/editor/style.css` resolves to `./dist/style.css`; map legacy `@i-prikot/editor/styles.css` to that same file to avoid a needless consumer break.
  - [x] Invoke the Node cleanup script from the editor build lifecycle before Vite runs; it must remove only obsolete `packages/editor/dist/styles.css`, preventing an old artifact from surviving because Vite does not empty `dist`.
  - [x] **Logging:** retain verbose package-build and cleanup diagnostics in the implementation evidence. Do not introduce application `console` logs; these changes affect only packaging metadata and generated files.

### Phase 3: Update local source resolution

- [x] **Task 3: Point the playground at the canonical stylesheet subpath and source entry.** (depends on Tasks 1–2)
  - [x] Files: modify `apps/playground/src/main.ts`, `apps/playground/vite.config.ts`.
  - [x] Change the playground CSS import to `@i-prikot/editor/style.css` so local development consumes the same canonical public path as package users.
  - [x] Update the matching Vite alias to resolve that subpath directly to `packages/editor/src/styles/index.css`; keep the existing editor and schema aliases unchanged.
  - [x] Do not add a second CSS import or a duplicate legacy alias to the playground; compatibility for `@i-prikot/editor/styles.css` remains in the editor package export map.
  - [x] **Logging:** use verbose Vite resolution/build output to verify the CSS alias is selected once. Do not add runtime logs to the playground for a static stylesheet-path change.

### Phase 4: Verify the distributable stylesheet without tests

- [x] **Task 4: Build and inspect the editor’s CSS delivery contract.** (depends on Tasks 1–3)
  - [x] Files inspected/generated: `packages/editor/dist/style.css`, `packages/editor/dist/index.js`, `packages/editor/package.json`; confirm `packages/editor/dist/styles.css` is absent after the build.
  - [x] Run `npm run build --workspace=@i-prikot/editor` and confirm it emits declarations, ESM JavaScript, and exactly the canonical stylesheet artifact at `dist/style.css` without deleting required declaration files.
  - [x] Inspect the generated CSS to confirm it contains KaTeX and representative editor/token rules, demonstrating that Vite followed `styles/index.css` and preserved the complete aggregate.
  - [x] Build the playground with `npm run build --workspace=@i-prikot/playground` to confirm its canonical CSS subpath resolves to the source entry in workspace development.
  - [x] **Logging:** preserve verbose command output and artifact checks as implementation evidence. No automated test command or test files are added because testing is explicitly disabled.

## Completion Criteria

- [x] The only aggregate source entry is `packages/editor/src/styles/index.css`, imported by `packages/editor/src/index.ts`.
- [x] The existing stylesheet import sequence and component styling behavior remain unchanged.
- [x] The editor build produces `packages/editor/dist/style.css` and removes any stale `packages/editor/dist/styles.css` without clearing emitted declarations.
- [x] `@i-prikot/editor/style.css` is the canonical export, while `@i-prikot/editor/styles.css` remains a compatibility mapping to the same artifact.
- [x] The playground resolves the canonical CSS subpath, editor and playground builds succeed, and no tests or documentation changes are introduced.
