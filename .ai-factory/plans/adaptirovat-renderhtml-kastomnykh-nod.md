<!-- handoff:task:3c1b9813-751e-4b1f-a94c-bae56d950c52 -->
# Implementation Plan: Adapt custom-node HTML rendering for server output

Branch: `main`
Created: 2026-07-17

## Settings
- [ ] Testing: no
- [ ] Logging: verbose development diagnostics; no runtime document-content logs
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: The autonomous Handoff task is a focused follow-up to the Stage 4 server-renderer work.

## Scope and Decisions
- [x] Audit the server-visible behavior of all custom document nodes: `Image`, `ImageUploadNode`, and `TocNode`, plus the custom global attributes emitted by `HorizontalRule`, `Indent`, `NodeAlignment`, and `NodeBackground`.
- [x] Preserve the existing semantic image contract: an image with a caption flag or inline caption content renders as `figure` containing `img` and `figcaption`; an image without a caption remains a standalone `img`.
- [x] Exclude `tocNode` from published HTML rather than emitting an empty editor placeholder or attempting a static anchor list. The atom node stores display options only, while heading data is calculated by the editor-only `TableOfContents` extension; `renderHTML` does not receive the full document needed to derive a correct list.
- [x] Treat `imageUpload` as an editor-only pending-upload placeholder and exclude it from published HTML as well. Persisted completed uploads are represented by `image` nodes and remain renderable.
- [x] Keep editor parsing and NodeView behavior unchanged. Static-only removal belongs at the `@i-prikot/renderer` document boundary and must not mutate the caller's JSON.

## Tasks

### Phase 1: Establish server-rendering contracts
- [x] **Task 1: Review and harden custom-node `renderHTML` output for static conversion.** Inspect and adjust `Image`, `ImageUploadNode`, and `TocNode` only where their declarative HTML output is browser- or NodeView-dependent, and verify that custom global-attribute extensions continue to emit serializable attributes accepted by `@tiptap/html`. Keep `Image.renderHTML`'s current `figure`/`figcaption` branch, including `src`, optional `alt`/`title`/dimensions, `data-align`, and caption state; preserve its `parseHTML` round-trip for both `figure` and standalone `img`. Do not add interactive controls, browser-global checks, or Vue markup to static output. **Files:** `packages/schema/src/nodes/image/image.ts`, `packages/schema/src/nodes/image-upload/image-upload.ts`, `packages/schema/src/nodes/toc/toc.ts`, and, only if the audit exposes a serialization defect, `packages/schema/src/extensions/horizontal-rule.ts`, `packages/schema/src/extensions/indent.ts`, `packages/schema/src/extensions/node-alignment.ts`, `packages/schema/src/extensions/node-background.ts`. **Logging:** add no runtime logs to declarative schema code; document failures through precise TypeScript/runtime errors only, never dumping document JSON, generated HTML, image URLs, or caption text.

### Phase 2: Filter editor-only nodes before publication
- [x] **Task 2: Add an immutable publishable-document normalization step to `renderDocument`.** In `packages/renderer/src/index.ts`, recursively copy the incoming `JSONContent`, retaining all supported nodes and their nested `content` while removing atomic nodes whose types are `tocNode` or `imageUpload`; preserve the original JSON object and preserve ordering of all remaining sibling nodes. Feed the normalized JSON to `generateHTML` with `createRendererExtensionKit`. Keep malformed/unsupported JSON failures visible to callers—do not return partial HTML or silently catch conversion errors. **Files:** `packages/renderer/src/index.ts`. **Dependencies:** Task 1. **Logging:** keep the renderer pure and side-effect-free; do not log input/output content or omitted-node attributes. If an explicit invariant is needed, include only node type and structural path in the thrown error, never serialized document data.

### Phase 3: Validate package integration without tests
- [x] **Task 3: Run targeted type and build validation for schema and renderer packages.** Confirm the server extension factory and `renderDocument` compile after the custom-node changes: run `npm run typecheck --workspace=@i-prikot/editor-schema`, `npm run build --workspace=@i-prikot/editor-schema`, `npm run typecheck --workspace=@i-prikot/renderer`, and `npm run build --workspace=@i-prikot/renderer`. Manually inspect generated HTML for a representative captioned image, a plain image, a TOC node, and an image-upload placeholder: image semantics must remain intact and both editor-only nodes must be absent. Do not add or run unit, snapshot, or end-to-end tests, and do not create documentation updates. **Files:** no source changes expected; generated `packages/schema/dist/**` and `packages/renderer/dist/**` only when required by the repository's tracked-build workflow. **Dependencies:** Tasks 1-2. **Logging:** retain command output only as local development diagnostics; do not add runtime renderer logging.
