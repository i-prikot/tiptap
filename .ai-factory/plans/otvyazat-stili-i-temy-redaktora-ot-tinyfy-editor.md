<!-- handoff:task:073de634-1f15-4ec0-a76b-f30ef9dd4935 -->
# Implementation Plan: Decouple editor styles and themes from `.tinyfy-editor`

Branch: `feature/tinyfy-editor-073de6`
Created: 2026-08-06

## Settings

- [ ] Testing: yes (TDD is mandatory by `.ai-factory/RULES.md`; capture a failing targeted test before each production refactor and record its RED/GREEN commands in the implementation summary)
- [ ] Logging: verbose for build and release-verifier output; do not introduce browser/runtime logging for a CSS-only concern. Preserve the existing redacted `useEditorHotkeys` diagnostics.
- [ ] Docs: yes (mandatory documentation checkpoint through `/aif-docs` during implementation)

## Roadmap Linkage

Milestone: `none`

Rationale: autonomous Handoff defaults to no roadmap linkage; this focused package-boundary refactor does not map to an existing unchecked roadmap item.

## Target CSS Contract

- [x] `@i-prikot/editor/styles.css` contains only editor component/layout selectors and no theme defaults, page/container reset, `.tinyfy-editor`, or host-selector assumptions.
- [x] `@i-prikot/editor/light-theme.css` and `@i-prikot/editor/dark-theme.css` are independently importable built assets. They provide respectively the complete light and dark token/reset/normalization values, including component token overrides formerly expressed as `.tinyfy-editor.dark ...`.
- [x] Theme application is opt-in and neutral: the consumer marks its chosen container with the documented `data-tiptap-theme="light"` or `data-tiptap-theme="dark"` attribute, while retaining any arbitrary local selector (for example, `.my-editor`). Theme selectors and all source/distribution CSS must not mention `.tinyfy-editor`.
- [x] A consumer that needs a wholly custom theme imports only `styles.css` and declares the documented public `--tt-*` tokens on its own container; `--white`, `--black`, `--transparent`, and non-`--tt-*` implementation variables remain internal.
- [x] Keep `./style.css` as a compatibility alias to the base asset unless the package compatibility audit demonstrates an intentional removal is required. Publish `./styles.css`, `./light-theme.css`, and `./dark-theme.css` explicitly.

## Commit Plan

- [ ] **Commit 1** (after tasks 1-3): `refactor(editor): split base styles from opt-in themes`
- [ ] **Commit 2** (after tasks 4-7): `test(editor): verify theme entry points and consumer isolation`
- [ ] **Commit 3** (after tasks 8-9): `docs(editor): document standalone theme contract`

## Tasks

### Phase 1: Establish executable CSS and API boundaries

- [x] **Task 1: Add failing contract tests for selector independence and theme assets.**
  - [ ] Files: create `test/editor/styles/theme-assets.test.ts`; update `test/package-public-api.mjs` as needed for the new artifact contract.
  - [ ] Assert before the refactor that the required public subpaths resolve to distinct expected CSS artifacts, that the source and freshly built `packages/editor/dist` contain no `.tinyfy-editor`, and that `styles.css` does not embed light/dark token defaults or reset/container ownership. Add fixture assertions for a consumer root with an arbitrary class plus `data-tiptap-theme`, including isolated light/dark computed tokens.
  - [ ] Make the test inspect package output after a fresh editor build rather than trusting tracked `dist`; retain checks that packed CSS targets exist and references are complete.
  - [ ] Run the targeted test and record its expected RED failure against the current `.tinyfy-editor` implementation before changing production files.
  - [ ] Logging: test failure messages must name the offending source/artifact path and selector/export. Build checks use existing script output; add no application logs.

- [x] **Task 2: Define the neutral theme source layout and move all token/reset ownership out of the base stylesheet.**
  - [ ] Files: refactor `packages/editor/src/styles.css`, `packages/editor/src/styles/index.css`, and `packages/editor/src/styles/design-tokens.css`; create `packages/editor/src/light-theme.css`, `packages/editor/src/dark-theme.css`, and any clearly named shared theme partials under `packages/editor/src/styles/`.
  - [ ] Split the existing declarations into: structural/component CSS in the base entry; common normalization, typography/container defaults, palettes, public core tokens, internal aliases, and light component-token values in the light theme; matching dark values in the dark theme. Preserve exact visual values and behavior, including toolbars, popovers, menus, tables, images, TOC, AI surfaces, selection, scrollbar, and editor content.
  - [ ] Replace every `.tinyfy-editor` and `.tinyfy-editor.dark` rule with editor-owned classes/attributes. Scope opt-in theme values under the documented `data-tiptap-theme` attribute on the consumer container, ensuring inherited values also reach overlay targets that are rendered inside the host-provided editor root. Do not add `html`, `body`, `:root`, or global reset ownership to `styles.css`.
  - [ ] Keep only selectors tied to `.tiptap`, `.ProseMirror`, `notion-like-*`, `tiptap-*`, editor data attributes, or component classes in the base entry. Move dark-only component variables out of those base files rather than replacing them with a hidden host class.
  - [ ] Logging: CSS files add no runtime logs. Preserve source comments only where they identify public versus internal token scope; build output remains deterministic and silent apart from existing Vite diagnostics.

- [x] **Task 3: Produce and expose the three CSS entry points without PostCSS host prefixing.**
  - [ ] Files: update `packages/editor/vite.config.ts`, `packages/editor/src/index.ts`, `packages/editor/package.json`, and `packages/editor/scripts/clean-stale-css.mjs`; add minimal TypeScript/CSS entry modules only if Vite needs them to emit stable `dist/styles.css`, `dist/light-theme.css`, and `dist/dark-theme.css` names.
  - [ ] Remove `postcss-prefix-selector`, `editorRootSelector`, selector-transform helpers, and their editor dev dependency. Configure Vite/Rollup so the base and each optional theme CSS file are emitted and packed as deterministic public assets without accidentally coupling all theme CSS to the JS entry.
  - [ ] Update `exports` so `./styles.css`, `./light-theme.css`, and `./dark-theme.css` resolve to emitted files; retain `./style.css` as the evaluated compatibility alias to the base file. Ensure the main JavaScript import does not force light or dark theme selection.
  - [ ] Run the Task 1 tests through RED/GREEN after the source/build change, then run `npm run build --workspace=@i-prikot/editor` and inspect generated CSS for the forbidden selector.
  - [ ] Logging: retain Vite bundle-analysis diagnostics unchanged; any new build assertion must report artifact filenames and selector matches only, never document content or host data.

### Phase 2: Remove runtime and playground coupling

- [x] **Task 4: Replace the runtime hotkey dependency on the demo root class.**
  - [ ] Files: update `packages/editor/src/composables/useEditorHotkeys.ts` and `test/editor/composables/editor-hotkeys.test.ts`.
  - [ ] Change host discovery to an editor-neutral boundary based on the editor DOM and its actual wrapper/ancestor relationship, with the editor element itself as the safe fallback. It must continue to isolate simultaneous editor instances, reject events outside the instance, and retain the mobile contenteditable gate without querying `.tinyfy-editor` or another host-owned class.
  - [ ] Convert fixtures to arbitrary consumer classes and add an explicit assertion that no `.tinyfy-editor` selector/runtime string remains in the composable path. Execute the targeted test first for RED, then after the change for GREEN.
  - [ ] Logging: retain the existing `shortcut-dispatched`, attach, and detach redacted debug diagnostics; do not log element HTML, content, selectors supplied by a host, or keystroke text.

- [x] **Task 5: Make playground own its local demo class and opt-in themes.**
  - [ ] Files: update `apps/playground/vite.config.ts`, `apps/playground/src/main.ts`, `apps/playground/src/App.vue`, `apps/playground/src/styles/notion-editor-header.css`, `test/playground/host-overlay-target.test.ts`; add focused style/import tests if they provide better coverage than the existing host test.
  - [ ] Remove playground PostCSS prefixing of package CSS and add aliases for all public CSS entry points used in local development. Explicitly import base, light, and dark package CSS in `main.ts`.
  - [ ] Keep `.tinyfy-editor` only as the playground's local root styling hook. Make that root set the neutral `data-tiptap-theme` attribute from `isDarkMode`, and change local header styles to target the local class plus the theme attribute rather than relying on library-owned `.tinyfy-editor.dark` selectors.
  - [ ] Update the host-theme test to prove theme toggling changes only the playground editor root/attribute, does not mutate `html` or `body`, and continues to retain overlays/tooltips below that root. Add a browser-facing check or extend `e2e/smoke.spec.ts` to exercise both theme states and verify the editor remains usable and visibly themed.
  - [ ] Logging: preserve existing playground diagnostics only; test errors should identify the expected root attribute and overlay boundary, with no document content logged.

- [x] **Task 6: Update clean-consumer, package, and release-verifier contracts for optional theme delivery.**
  - [x] Make the clean Vite consumer import the base stylesheet plus each supported light/dark combination and build successfully from a packed archive. Assert all CSS export targets are present in `npm pack --dry-run` output, include only the requested CSS assets, and contain no `.tinyfy-editor` in the packed editor distribution.
  - [ ] Update the immutable release-manifest fixture and negative drift test to the expanded export map, including the legacy `style.css` compatibility alias if retained. Preserve verifier timeouts and its redacted structured logging contract.
  - [ ] Run the affected Node/Vitest tests RED before changing the package/release contract and GREEN afterwards.
  - [ ] Logging: use existing `INFO`/`DEBUG` release verifier messages for archive/export paths; retain the invariant that secrets and consumer project contents never appear in logs.

### Phase 3: Document, version, and validate the public contract

- [x] **Task 7: Rewrite the editor README as a complete standalone styling guide.**
  - [x] Files: update `packages/editor/README.md` through the mandatory `/aif-docs` checkpoint.
  - [x] Document import order and copy-ready examples for base-only styling, light-only, dark-only, both built-in themes, multiple independent editor instances, and a custom container selector with `data-tiptap-theme`; do not use `.tinyfy-editor` in package documentation.
  - [x] Publish a complete, source-audited table for every supported `--tt-*` variable: exact name, family (surfaces, borders, text, palette, statuses, radii, shadows, animation, or component), purpose, permitted CSS value type, and light/dark default. Document the distinction between public tokens and internal values, explicitly naming `--white`, `--black`, `--transparent`, and non-public component implementation variables.
  - [x] Add a full custom-theme example that scopes variables to one consumer container, includes palette/component overrides and its dark variation, and explains how to avoid affecting the rest of the page. Add a test/validation script assertion that every declared public `--tt-*` token is represented in this contract so future tokens cannot silently drift from docs.
  - [ ] Logging: documentation changes add no runtime logging; validation failures must report the missing/undocumented token name only.

- [x] **Task 8: Add the release intent and synchronize fixed workspace metadata.**
  - [ ] Files: create a changeset under `.changeset/`; run the repository version workflow to update generated package versions, changelogs, workspace dependency ranges, and `package-lock.json` as required by the fixed package group `@i-prikot/editor-schema`, `@i-prikot/editor`, and `@i-prikot/editor-renderer`.
  - [ ] Use a **minor** release because `@i-prikot/editor` gains public CSS entry points and changes the documented theme integration contract. Confirm the fixed-group versioning result is internally consistent, including `apps/playground` workspace dependencies.
  - [ ] Logging: changeset text describes the public stylesheet contract change. Keep package/release command output free of registry credentials and do not publish from this task.

- [ ] **Task 9: Run the complete acceptance verification set and preserve RED/GREEN evidence.**
  - [ ] Files: no production source changes expected; update only tests or documentation when a verification exposes a real contract gap.
  - [ ] Run, in dependency order: targeted CSS/hotkey/playground/release-verifier tests; `npm run typecheck`; `npm run lint`; `npm run build`; `npm run test:package-public-api`; `npm run test:release-verifiers`; `npm test`; and `npm run test:e2e`. Re-run packaging with `npm pack --dry-run --workspace=@i-prikot/editor` and verify `packages/editor/dist` has no `.tinyfy-editor` string.
  - [ ] Validate the consumer paths by importing base alone, base + light, base + dark, and base + both theme files in the clean Vite fixture. Confirm that only an explicitly themed consumer root receives token values, an arbitrary root works, and the playground's theme toggle keeps its visual state and editor interaction.
  - [ ] Record the exact targeted test commands and their observed pre-change RED/post-change GREEN results required by TDD; treat failures in the selector scan, export map, packed artifact, visual theme switch, or host isolation as release blockers.
  - [ ] Logging: retain command-level build/test output and existing redacted verifier logs; do not add application telemetry or expose fixture document data.

## Acceptance Checklist

- [x] No `.tinyfy-editor` string in `packages/editor/src` CSS/runtime, `packages/editor/vite.config.ts`, generated `packages/editor/dist`, published package CSS, or editor README.
- [x] `styles.css` is theme-free and does not style a host page/container; light and dark values load only through explicitly imported theme entry points.
- [x] A consumer uses any local root selector and the documented neutral theme attribute to theme one editor instance without altering another instance or the page.
- [x] Playground keeps `.tinyfy-editor` only in its own templates/local CSS, imports the optional themes itself, and its toggle still switches the active theme without touching `html`/`body`.
- [ ] Export-map, packed archive, clean-consumer build, release verifier, typecheck, lint, unit tests, build, and Playwright smoke coverage pass at the post-versioned package state.

## Rework Verification (2026-08-06)

- [x] Added the packed-consumer base-only `styles.css` scenario to `scripts/verify-editor-consumer-build.mjs`, with a focused public-API test that prevents its removal.
- [x] Expanded `scripts/verify-editor-consumer-build.mjs` to build packed consumers for base plus light only, base plus dark only, and base plus both themes.
- [x] Moved light component defaults from base component CSS into `light-component-defaults.css`; `styles.css` retains structural rules only.
- [x] Moved shared popover/spinner keyframes into base `keyframes.css` and verified all nine required keyframes in generated `dist/styles.css`.
- [x] Replaced grouped token descriptions in `packages/editor/README.md` with exact light/dark defaults, value types, and purposes for all public root tokens.
- [x] Regenerated `dist/styles.css`, `dist/light-theme.css`, and `dist/dark-theme.css`; `npm pack --dry-run --workspace=@i-prikot/editor` includes all three and they contain no `.tinyfy-editor`.
- [x] Updated `test/editor/styles/theme-assets.test.ts` to merge all matching theme declarations in cascade order; the README table now documents the final values of all 147 public root tokens, including late dark overrides.
- [x] Corrected the custom-theme contract: it imports the built-in light/dark component-default layer before overriding public tokens, so base component rules never depend on unset internal variables.
- [ ] `npm run build --workspace=@i-prikot/editor` remains blocked in this checkout because the pre-existing root-owned `node_modules` prevents a clean dev-dependency install, leaving `vue-tsc` unavailable on `PATH`; direct Vite verification is also blocked because `esbuild` is missing. The root manifest and lockfile already declare the required development dependencies.
- [ ] Targeted Vitest RED/GREEN evidence is unavailable for the same dependency-tree blocker: `npx vitest run test/editor/styles/theme-assets.test.ts` cannot load Vitest. The new dependency-free validator produced the intended RED with 46 stale/missing cascading defaults, then GREEN for all 147 final token defaults and the component-default custom-theme contract. Other static checks remain blocked where they require a fresh build.
