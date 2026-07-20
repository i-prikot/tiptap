<!-- handoff:task:df97f249-2e07-47e1-a590-adb65ae46b61 -->
# Implementation Plan: Implement server-side document rendering

Branch: `main`
Created: 2026-07-17

## Settings
- [x] Testing: yes — rework adds a targeted server-only public renderer API test
- [ ] Logging: verbose development diagnostics; no runtime document-content logs
- [ ] Docs: no

## Roadmap Linkage
Milestone: [`Серверный рендер (@i-prikot/editor-renderer)` — `Реализовать renderDocument(json): html`](../ROADMAP.md#серверный-рендер-tinyfyrenderer)
Rationale: This plan implements the first renderer milestone tracked in `.ai-factory/ROADMAP.md`.

## Scope and Decisions
- [ ] The workspace package `@i-prikot/editor-renderer` already exists; extend it rather than creating a second package.
- [ ] Expose exactly `renderDocument(json: JSONContent): string` as a synchronous public API. It must delegate HTML conversion to `generateHTML` from `@tiptap/html`.
- [ ] Keep rendering independent of Vue, an editor instance, collaboration, browser globals, decorations, and interactive node views.
- [ ] Centralize the server-safe extension collection in `@i-prikot/editor-schema` so the renderer uses the same document schema and custom `renderHTML` definitions as the editor without duplicating extension configuration.
- [ ] Do not catch and replace `generateHTML` errors: malformed or unsupported Tiptap JSON must fail visibly to the caller rather than producing incomplete HTML.
- [ ] Do not add runtime logging of JSON or HTML. Documents may contain user data; the renderer stays a pure, side-effect-free library function.

## Tasks

### Phase 1: Server-safe schema extensions
- [x] **Task 1: Add and export a renderer extension factory.** Refactor `packages/schema/src/extensions/extension-kit.ts` to share schema/render configuration where appropriate, then add a server-only factory (for example, `createRendererExtensionKit`) that returns only extensions required to parse the persisted Tiptap JSON and emit HTML. Preserve all extension and custom-node `renderHTML` behavior needed by documents, including tables, image/image-upload nodes, TOC representation, text styling, lists, mathematics, and custom attributes. Exclude collaboration, browser event handlers, decorations, drag/table controls, selection/UI state, and other interactive-only behavior. Export the factory from `packages/schema/src/index.ts` without changing the editor-facing `createExtensionKit` contract. **Files:** `packages/schema/src/extensions/extension-kit.ts`, `packages/schema/src/index.ts`. **Logging:** no runtime logs; document the pure/server-safe boundary in API naming and implementation structure, and do not expose document content through diagnostics.

### Phase 2: Public renderer API
- [x] **Task 2: Declare the HTML renderer dependency and implement `renderDocument`.** Add `@tiptap/html` as a production dependency of `@i-prikot/editor-renderer` and update `package-lock.json`. Replace the DTO-only contents of `packages/renderer/src/index.ts` with the public `renderDocument(json: JSONContent): string` function: import `generateHTML`, obtain extensions from `createRendererExtensionKit`, and return the generated HTML unchanged. Remove unused wrapper interfaces unless they remain a purposeful part of the public API. Keep the package ESM export map and declaration output intact. **Files:** `packages/renderer/package.json`, `package-lock.json`, `packages/renderer/src/index.ts`. **Dependencies:** Task 1. **Logging:** do not log input JSON, output HTML, or errors; allow conversion errors to propagate with their original context.

### Phase 3: Package validation
- [x] **Task 3: Verify renderer artifacts and add server-only API coverage.** Run the package-level TypeScript checks and builds in dependency order: `npm run typecheck --workspace=@i-prikot/editor-schema`, `npm run build --workspace=@i-prikot/editor-schema`, `npm run typecheck --workspace=@i-prikot/editor-renderer`, and `npm run build --workspace=@i-prikot/editor-renderer`. Add `test/renderer/render-document.test.ts` with Vitest's `node` environment; call public `renderDocument` with representative heading, formatted text, task-list, and table JSON, and assert unsupported node errors propagate unchanged. Run `npm test -- --run test/renderer/render-document.test.ts` and `npm exec eslint -- test/renderer/render-document.test.ts`. **Files:** `test/renderer/render-document.test.ts`; generated `packages/schema/dist/**` and `packages/renderer/dist/**` only if those artifacts are tracked by the repository's established build workflow. **Dependencies:** Tasks 1-2. **Logging:** retain command output as development diagnostics only; never add renderer runtime logging to satisfy validation.

## Rework
- [x] Security rework (2026-07-17): sanitize untrusted JSON before `generateHTML` so `backgroundColor`, text/highlight colors, alignment values, raw `style`, and indent values cannot emit arbitrary CSS. Added regression coverage for a malicious CSS payload while preserving safe Tinyfy color variables.

## Test Evidence
- [x] **Targeted command:** `npm test -- --run test/renderer/render-document.test.ts`
- [x] **RED (2026-07-17):** Temporarily passed `json` directly to `generateHTML` in `renderDocument`, bypassing `sanitizeDocumentContent`. The targeted command exited `1`: `omits unsafe values from serialized style attributes` failed because the rendered HTML contained `attacker.example`; the suite reported `1 failed | 2 passed (3)`.
- [x] **GREEN (2026-07-17):** Restored `sanitizeDocumentContent(json)` before `generateHTML` and reran the same command. It exited `0` with `1` test file passed and `3` tests passed.
