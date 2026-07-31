<!-- handoff:task:1ec1622a-5985-4df1-8b01-8bc91db00b01 -->
# Implementation Plan: Remove Legacy Editor Styles

Branch: `main`
Created: 2026-07-28

## Settings
- [ ] Testing: no
- [ ] Logging: verbose; no runtime logging changes are required because this is a CSS-entrypoint cleanup.
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: Autonomous Handoff defaults to no roadmap linkage, and this is a focused legacy-style cleanup.

## Decision and Scope
- [x] Remove `packages/editor/src/styles/editor.css`; do not archive it. Git history retains the legacy implementation without keeping a dead source asset in the published style graph.
- [x] Remove its imports from both maintained aggregate entrypoints: `packages/editor/src/styles.css` and `packages/editor/src/styles/index.css`.
- [x] The pre-plan audit found no direct component or playground use of the legacy Vue-port selectors (`editor-shell`, `editor-frame`, `editor-toolbar`, `editor-surface`, `table-menu`, `slash-menu`, `mobile-table-menu`, `menu-row`, `menu-separator`, `menu-swatches`, and `menu-swatch`).
- [x] The live generic editor and table controls are already styled by dedicated modules: `packages/editor/src/styles/prosemirror-base.css`, `packages/editor/src/styles/menu.css`, `packages/editor/src/styles/table-handle.css`, and `packages/editor/src/styles/expandable-menu-button.css`.

## Tasks

### Phase 1: Confirm Removal Boundary
- [x] Task 1: Re-run a scoped, tracked-source selector audit before modifying the stylesheet graph.
  - [x] Inspect `packages/editor/src`, `apps/playground/src`, and CSS files under all `packages/*/src` directories for actual class/selector usage rather than matching module-path text such as `slash-menu` imports.
  - [x] Confirm `packages/editor/src/styles.css` and `packages/editor/src/styles/index.css` are the only importers of `editor.css`.
  - [x] Verify the potentially live rules are covered by their owners: ProseMirror base rules in `packages/editor/src/styles/prosemirror-base.css`, table/menu surfaces in `packages/editor/src/styles/menu.css` and `packages/editor/src/styles/table-handle.css`, and the expandable control in `packages/editor/src/styles/expandable-menu-button.css`.
  - [x] No real selector consumer was discovered, so no rule migration is needed; do not retain or archive the legacy aggregate file.
  - [x] Logging: no application logging. Record audit evidence only in the implementation handoff/commit message; do not add console or logger calls.

### Phase 2: Remove the Legacy Entry
- [x] Task 2: Delete the obsolete stylesheet and detach it from the package style entrypoints.
  - [x] Delete `packages/editor/src/styles/editor.css`.
  - [x] Remove `@import './styles/editor.css';` from `packages/editor/src/styles.css`.
  - [x] Remove `@import './editor.css';` from `packages/editor/src/styles/index.css`.
  - [x] Preserve import ordering and leave all dedicated stylesheet imports intact so both public exports (`./style.css` and `./styles.css`) continue to generate equivalent CSS.
  - [x] Logging: no application logging or instrumentation; this task changes only static CSS imports.
  - [x] Depends on: Task 1.

### Phase 3: Validate Published Style Graph
- [ ] Task 3: Validate that the editor and playground no longer depend on the removed legacy file.
  - [x] Run a tracked-source search to confirm no `editor.css` import or legacy-only Vue-port selector remains; allow equivalent selectors intentionally owned by dedicated stylesheet modules.
  - [x] Build `@i-prikot/editor` with `npm run build --workspace=@i-prikot/editor`, then build `@i-prikot/playground` with `npm run build --workspace=@i-prikot/playground` to catch unresolved CSS imports and verify both consumers compile.
  - [ ] Perform a playground smoke check of the editor surface, slash-menu trigger, and table handle/menu controls in light and dark themes; confirm their dedicated styles still render and no missing-style regression appears.
  - [x] Logging: no new runtime logs. Treat build failures and visual regressions as validation failures with their command/output captured in the implementation handoff.
  - [x] Depends on: Task 2.
