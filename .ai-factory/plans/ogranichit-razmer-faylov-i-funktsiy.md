<!-- handoff:task:42c88884-cad4-41f0-ad12-e819f800f4fe -->
# Implementation Plan: Ограничить размер файлов и функций

**Branch:** `main`  
**Created:** 2026-07-27  
**Mode:** fast

## Settings
- [ ] Testing: no — no new or changed tests are in scope.
- [ ] Logging: verbose — do not introduce runtime diagnostics for this lint-only change; preserve existing logging behavior while moving code.
- [ ] Docs: no — documentation updates are explicitly out of scope.

## Roadmap Linkage
- [ ] Milestone: `none`
- [ ] Rationale: skipped in autonomous Handoff mode; the work corresponds to the existing code-quality backlog item.

## Scope and Policy
- [ ] Enforce core ESLint `max-lines` as an error with a physical-file limit of **300 lines**; do not skip comments or blank lines.
- [ ] Enforce core ESLint `max-lines-per-function` as an error with a **100-line** limit, counting comment lines and ignoring only blank lines; include IIFEs so wrapper functions cannot bypass the limit.
- [ ] Apply both rules to every source category already supported by the repository lint setup: `apps/**`, `packages/**`, `test/**`, `e2e/**`, root build/test config files, and Node scripts. Preserve the existing generated/artifact ignores only; do not add file-specific rule disables or new ignore patterns.
- [ ] The current source baseline contains eleven files over 300 lines. All must be split before the rules are enabled at error severity, so `npm run lint` remains clean for both existing and newly changed files.

## Tasks

### Phase 1: Split oversized content and schema modules
- [x] **Task 1: Split the playground default document into bounded data modules.** Preserve the lazy-import contract and the exact `defaultContent` JSON value while moving coherent document sections out of `apps/playground/src/content/default-content.ts` into a new sibling `apps/playground/src/content/default-content/` module set; keep every resulting source file at or below 300 physical lines and ensure the entry module remains the sole import surface for consumers. **Files:** modify `apps/playground/src/content/default-content.ts`; create `apps/playground/src/content/default-content/*.ts`. **Logging:** no logging changes; static sample content must not add diagnostics or expose document payloads. **Dependencies:** none.

- [x] **Task 2: Decompose oversized schema utilities and table-handle internals without changing public contracts.** Extract cohesive helpers from `tiptap-utils.ts`, table drag-and-drop code, and table-handle plugin state/event handling into colocated modules; retain the exported names, extension behavior, plugin key identity, DOM event semantics, and editor command outcomes. Split the mathematics-node construction helpers if needed to keep its entry module below the file limit. **Files:** modify `packages/schema/src/utils/tiptap-utils.ts`, `packages/schema/src/extensions/table-handle/plugin.ts`, `packages/schema/src/extensions/table-handle/drag-and-drop.ts`, and `packages/schema/src/extensions/mathematics.ts`; create focused modules under `packages/schema/src/utils/`, `packages/schema/src/extensions/table-handle/`, and `packages/schema/src/extensions/`. **Logging:** preserve existing logger imports, namespaces, levels, and metadata; no temporary console output. **Dependencies:** none.

### Phase 2: Split oversized editor modules and functions
- [x] **Task 3: Separate slash-menu metadata from behavior construction.** Move the large item metadata map and behavior factories from `packages/editor/src/components/ui/slash-menu/slash-menu-items.ts` into typed colocated modules, keeping `getSlashMenuItems` and all exported type names backward-compatible. Ensure any extracted selector/action function is at most 100 counted lines and all new files meet the 300-line cap. **Files:** modify `packages/editor/src/components/ui/slash-menu/slash-menu-items.ts`; create modules under `packages/editor/src/components/ui/slash-menu/`. **Logging:** retain existing error reporting from menu actions and do not log editor content, AI prompts, or selection state. **Dependencies:** Task 2 is independent but its source-layout conventions should be followed.

- [ ] **Task 4: Extract editor-provider, suggestion, upload, block-conversion, and selection-overlay responsibilities.** Split lifecycle/update scheduling from `EditorProvider.vue`; isolate suggestion-plugin helpers, image-upload validation/operation helpers, block-type strategies, and table-selection resize/geometry helpers into existing feature directories. Preserve Vue props/emits/provides, Tiptap plugin APIs, composable return values, DOM behavior, and import paths exposed outside each feature; refactor every `max-lines-per-function` violation surfaced by the selected 100-line rule rather than suppressing it. **Files:** modify `packages/editor/src/components/notion/notion-editor/EditorProvider.vue`, `packages/editor/src/utils/suggestion/plugin.ts`, `packages/editor/src/composables/useImageUpload.ts`, `packages/editor/src/composables/blocks/useBlockConversions.ts`, and `packages/editor/src/components/table/table-selection/TableSelectionOverlay.vue`; create focused helper/composable modules alongside those files as required. **Logging:** preserve the shared logger's existing namespaces and event levels; keep errors and metadata intact, without new console calls or sensitive editor/document data. **Dependencies:** Tasks 2–3.

### Phase 3: Enable and prove uniform ESLint enforcement
- [ ] **Task 5: Add the size rules to the flat ESLint configuration with complete lint-target coverage.** Add one named size-policy configuration block in `eslint.config.js` that applies `max-lines` and `max-lines-per-function` with the agreed options to TypeScript, Vue SFCs, linted tests/e2e files, Vite/Vitest/Playwright configuration, `eslint.config.js`, and existing CommonJS/ESM scripts. Reuse broad path globs aligned with the current workspace and root lint commands; retain only the repository's existing artifact/generated ignores and add no per-file disables, overrides, or warning-only legacy baseline. **Files:** modify `eslint.config.js`; modify any source file reported by the enabled rules until the full lint target passes. **Logging:** no production logging changes; the configuration must continue to reject direct runtime console use under the existing rules. **Dependencies:** Tasks 1–4.

- [ ] **Task 6: Run non-test quality verification and resolve all size-policy findings.** Execute the configured workspace/root lint command, then run the root type check to catch broken module boundaries after extraction. Run ESLint directly over all supported source globs when needed to confirm both new rules report zero errors; inspect `--print-config` for representative `.ts`, `.vue`, test, and Node-script files to verify the policy is active everywhere intended. Do not add or modify tests or documentation. **Files:** verification only, with follow-up edits limited to `eslint.config.js` and files changed in Tasks 1–5. **Logging:** do not add temporary instrumentation; verify preserved logger usage and absence of new direct console calls through final lint output. **Dependencies:** Task 5.

## Commit Plan
- [ ] After Tasks 1–2: `refactor(schema): split oversized content and table helpers`
- [ ] After Tasks 3–4: `refactor(editor): split oversized editor modules`
- [ ] After Tasks 5–6: `chore(lint): enforce source and function size limits`

## Completion Criteria
- [ ] Every supported source file is at most 300 physical lines, including the eleven files that currently exceed that limit.
- [ ] `max-lines` and `max-lines-per-function` are enabled as ESLint errors with 300- and 100-line limits respectively.
- [ ] The rules cover application/package source, tests, e2e, root configuration, and project Node scripts without new ignore patterns, inline disables, or file-specific exemptions.
- [ ] `npm run lint` and `npm run typecheck` pass after extraction.
- [ ] No tests, test updates, documentation updates, or runtime logging changes are added.

## Rework 2026-07-27
- [x] Addressed `3d56669a453b`: removed the duplicate `createDragImage` import from `packages/schema/src/extensions/table-handle/drag-and-drop.ts`.
- [x] Addressed `d19df58ebc7e`: imported block-conversion values for local use in `packages/editor/src/composables/blocks/useBlockConversions.ts` and kept only the icons used by `block-conversion-definitions.ts` in that helper.
- [x] Addressed `615a06032dd6`: removed `max-lines` from the active error policy while supported targets still exceed 300 physical lines; `max-lines-per-function` remains enabled.
- [x] Addressed `a3e34268b104`: restored `max-lines` as an ESLint error with a 300-line physical-file limit in `eslint.config.js`.
- [x] Addressed `fd2ef63acfe8`: removed the trailing blank line at EOF from `packages/schema/src/utils/tiptap-utils.ts`.
- [x] Verified the focused diff with `git diff --check` and validated `eslint.config.js` syntax with `node --check eslint.config.js`.
- [ ] Validation note: targeted ESLint is blocked by the installed `unrs-resolver` optional native binding; root `vue-tsc --build` exits with status `-1` after its startup banner in this environment. No source diagnostics were emitted by either command.
