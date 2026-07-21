<!-- handoff:task:add8d740-657a-4eb4-b7f6-7f526a4684a5 -->
# Implementation Plan: Типизировать props и emits

Branch: `main`
Created: 2026-07-20

## Settings

- [x] Testing: yes — rework requires a focused Vitest compiler-contract regression test and recorded RED/GREEN evidence for the three migrated NodeViews.
- [ ] Logging: verbose local diagnostics only — add no application `console` calls, telemetry, or document-content logging.
- [ ] Docs: no — do not change documentation or add a documentation checkpoint.

## Roadmap Linkage

Milestone: "Этап 6. Vue 3: лучшие практики"
Rationale: Implements generic type declarations for safe `defineProps` and `defineEmits` calls while preserving the Tiptap runtime prop contract where Vue's generic compiler output is not equivalent.

## Scope and Decisions

- [ ] Audit scope is limited to the 94 Vue SFCs in `apps/playground/src/**/*.vue` and `packages/editor/src/**/*.vue`; do not alter generated files, dependencies, package manifests, or unrelated components.
- [ ] Current baseline: 75 `defineProps` calls — 72 already use generic declarations and 3 use the Tiptap runtime `nodeViewProps`; all 35 `defineEmits` calls already use generic declarations. Do not rewrite equivalent generic declarations merely for style.
- [ ] The only migration candidates are `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue`, `packages/editor/src/nodes/image/ImageNodeView.vue`, and `packages/editor/src/nodes/toc/TocNodeView.vue`.
- [x] Implementation exception: retain `defineProps(nodeViewProps)` in the three Tiptap NodeViews. With the installed Vue compiler, `defineProps<NodeViewProps>()` emits `null` validators for `node`, `view`, `getPos`, and `innerDecorations`, and an `Array` validator for `decorations`, instead of Tiptap's required `Object`/`Function` validators.
- [x] Preserve every node-view prop name and requiredness (`editor`, `node`, `decorations`, `selected`, `extension`, `getPos`, `updateAttributes`, `deleteNode`, `view`, `innerDecorations`, `HTMLAttributes`), template binding, computed value, event handler, and Tiptap renderer integration. Do not add emits, defaults, casts, or local duplicate prop validators.
- [x] Rework scope: retain the three runtime declarations and extend `test/editor/nodes/node-view-props.contract.test.ts` to assert all 11 validator types, requiredness flags, and generated runtime-prop references for image-upload, image, and TOC NodeViews.

## Tasks

### Phase 1 — Reconfirm macro inventory and compatibility

- [x] **1. Re-run a deterministic macro inventory before changing source.**  
  **Files:** `apps/playground/src/**/*.vue`, `packages/editor/src/**/*.vue` (read-only audit).  
  Enumerate every `defineProps` and `defineEmits` call, classify each as generic or runtime, and confirm the expected baseline: exactly three runtime `defineProps(nodeViewProps)` calls at the three listed node views and zero runtime `defineEmits` calls. Inspect the installed `@tiptap/core` `NodeViewProps` export and compile a minimal SFC declaration to confirm Vue emits the complete required prop-key set before applying the replacement.  
  **Expected behavior:** the migration set is exact, and the runtime declarations remain in place when the generic compiler output is not contract-equivalent.  
  **Logging:** add no runtime logging; retain command output, component paths, declaration counts, and compiler output as verbose local diagnostics.

### Phase 2 — Preserve the remaining runtime declarations

- [x] **2. Preserve image-upload and image NodeViews' runtime props declarations.**  
  **Files:** `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue`, `packages/editor/src/nodes/image/ImageNodeView.vue`.  
  Retain `defineProps(nodeViewProps)` and its `@tiptap/vue-3` runtime import because the generic compiler output weakens validators. Preserve all template-visible `props` accesses, upload/image behavior, attributes, callback invocation, and existing component imports.  
  **Expected behavior:** both renderers receive and type-check the same Tiptap NodeView contract without changing normal render output, upload flow, image commands, or public component API.  
  **Dependencies:** Task 1.  
  **Logging:** introduce no application logs; use verbose local compiler/linter diagnostics only.

- [x] **3. Preserve the table-of-contents NodeView runtime props declaration.**  
  **Files:** `packages/editor/src/nodes/toc/TocNodeView.vue`.  
  Retain `defineProps(nodeViewProps)` and its runtime import, without changing TOC option reads, node attribute fallbacks, heading normalization, or navigation event handling. Verify that every existing `props.extension` and `props.node` access remains type-safe without broad casts.  
  **Expected behavior:** the TOC NodeView remains fully compatible with `VueNodeViewRenderer`, including its required props and current fallback semantics.  
  **Dependencies:** Task 1.  
  **Logging:** do not add runtime logs; retain TypeScript and lint output as verbose local diagnostics.

### Phase 3 — Add mandatory regression coverage

- [x] **4. Add targeted compiler-contract coverage for all affected NodeViews.**  
  **Files:** `test/editor/nodes/node-view-props.contract.test.ts`; `packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue`, `packages/editor/src/nodes/image/ImageNodeView.vue`, `packages/editor/src/nodes/toc/TocNodeView.vue` (temporary RED verification only).  
  Add one parameterized Vitest test for the three affected SFCs. It asserts the `nodeViewProps` import and macro declaration, verifies all 11 validator types and requiredness flags against Tiptap's runtime export, and uses `@vue/compiler-sfc` to verify that each component delegates its generated runtime props to that declaration.  
  **Expected behavior:** the regression test fails when a component stops using `nodeViewProps` or when the shared runtime validator contract changes.  
  **Dependencies:** Tasks 2–3.  
  **Logging:** retain test command and RED/GREEN output as local plan evidence; add no application logging.

  **TDD evidence (July 20, 2026):**
  - **RED:** `npm exec vitest run test/editor/nodes/node-view-props.contract.test.ts --pool=forks --maxWorkers=1`, run after temporarily replacing the runtime declarations with the generic macro, exited nonzero because the compiler emitted weakened validator types.
  - **GREEN:** the same command, after restoring all three runtime declarations and validator assertions, passes: 1 test file, 3 tests.

### Phase 4 — Validate the completed migration

- [x] **5. Re-audit macro declarations and run static validation for the editor workspace.**  
  **Files:** `apps/playground/src/**/*.vue`, `packages/editor/src/**/*.vue` (read-only audit); changed files from Tasks 2–3 plus the targeted regression test.  
  Confirm that all non-exception `defineProps` calls and all 35 `defineEmits` calls are generic declarations, while the three Tiptap NodeViews retain the runtime declaration. Run `npm run typecheck --workspace=@i-prikot/editor`, `npm run lint --workspace=@i-prikot/editor`, and the focused NodeView contract test; inspect the diff to ensure it is limited to the three NodeView declarations plus the targeted regression test. Do not change documentation.  
  **Expected behavior:** static checks and the focused regression test pass, the macro inventory contains only the three documented runtime exceptions, and no public behavior or unrelated source changes are introduced.  
  **Dependencies:** Tasks 2–4.  
  **Logging:** preserve verbose local audit/compiler/linter output only; add no production logging.

  **Validation evidence (July 20, 2026):** `npm exec vitest run test/editor/nodes/node-view-props.contract.test.ts --pool=forks --maxWorkers=1` passed with 1 test file and 3 tests. `npm run typecheck --workspace=@i-prikot/editor`, `npm run lint --workspace=@i-prikot/editor`, and Prettier verification for all changed files also passed.

## Acceptance Criteria

- [x] Every in-scope `defineEmits` call and every non-exception `defineProps` call uses a generic type declaration.
- [x] The three Tiptap NodeViews retain `nodeViewProps` because it is the only supported declaration that preserves the public runtime validators.
- [x] The three NodeViews retain all 11 required prop names, validator types, requiredness flags, behavior, and template API.
- [x] A targeted Vitest compiler-contract regression test detects missing runtime declarations and validator/requiredness regressions for all three NodeViews.
- [x] `npm run typecheck --workspace=@i-prikot/editor` and `npm run lint --workspace=@i-prikot/editor` pass.
- [x] No documentation changes, runtime logging, dependency updates, or unrelated source refactors are introduced beyond the required focused regression test.

## Out of Scope

- [ ] Adding tests beyond the required NodeView compiler-contract regression test or changing existing test fixtures.
- [ ] Replacing already-generic macro declarations for stylistic reasons.
- [ ] Changing props/emits public APIs, defaults, validators outside the three Tiptap NodeViews, or Tiptap/Vue dependency versions.
