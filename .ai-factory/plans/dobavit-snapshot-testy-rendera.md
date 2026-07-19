<!-- handoff:task:a93fa53d-058a-4f2f-b0fc-975e5e38eb3e -->
# Implementation Plan: Add Renderer Snapshot Tests

Branch: `main`
Created: 2026-07-17

## Settings
- [x] Testing: no additional test scope; the requested snapshot suite is the primary deliverable.
- [x] Logging: verbose planning policy; this test-only change must add no runtime logging. Test names and assertion failures must identify the rendered node family and fixture.
- [x] Docs: no; implementation emits `WARN [docs]` only and does not update documentation.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped in autonomous fast-planning mode; the task supports the existing package test-foundation milestone without changing its roadmap state.

## Scope and Constraints
- [x] Cover every node type registered by `createRendererExtensionKit()` that is expected to produce publishable HTML: base document/text nodes, blocks, lists, task lists, tables, media, mention/emoji, mathematics, and custom horizontal rule.
- [x] Include representative marks and rendering attributes where they affect output: basic formatting, link, color/text style, highlight, subscript/superscript, alignment, background color, indentation, and table/image attributes.
- [x] Treat `tocNode` and `imageUpload` as explicit non-publishable cases: the current renderer normalizer removes them before HTML generation, so their expected output is omission rather than a rendered element.
- [x] Use only fixed JSON values (including `id`, URLs, captions, dates, and attribute values) and never depend on generated IDs, current time, browser globals, network access, or mutable emoji metadata.
- [x] Do not modify `packages/renderer/src/index.ts` or `packages/schema/src/**` for this task unless a valid fixture exposes an existing SSR-support defect; report such a defect as a scope blocker before broadening production changes.

## Tasks

### Phase 1: Define Stable JSON Fixtures
- [x] **Task 1: Create a typed renderer-fixture catalog.** Add `test/renderer/fixtures/representative-documents.ts` containing a named, ordered set of valid `JSONContent` documents rather than a single opaque mega-document. Include fixtures covering `doc`, `paragraph`, `text`, `heading` levels, `blockquote`, `codeBlock`, `hardBreak`, bullet/ordered lists with `listItem`, task lists with `taskItem`, `horizontalRule`, `image`, `table`/`tableRow`/`tableHeader`/`tableCell`, `mention`, `emoji`, and inline/block mathematics, plus a dedicated editor-only fixture for `tocNode` and `imageUpload`. Represent supported marks and serializable attributes in the smallest valid contexts. Use `satisfies JSONContent` and immutable fixed values so fixture order and output cannot vary. **Logging:** no application logging; expose descriptive fixture keys so failed snapshots state the exact node family.

### Phase 2: Snapshot and Determinism Coverage
- [x] **Task 2: Replace partial HTML checks with named HTML snapshots.** Update `test/renderer/render-document.test.ts` to import the fixture catalog, retain the Node environment guard, and render each publishable fixture through `renderDocument`. Create one named snapshot assertion per fixture/family so diffs are reviewable and map directly to JSON input. Keep narrow behavior assertions only where snapshots are insufficient: unsupported node errors, omission of editor-only nodes, and unsafe-style sanitization. **Logging:** add no runtime logs; test descriptions must name the input fixture and expected behavior.
- [x] **Task 3: Assert deterministic rendering and commit generated baselines.** In `test/renderer/render-document.test.ts`, render every publishable fixture twice and assert byte-for-byte identical HTML before or alongside its snapshot assertion. Generate and commit `test/renderer/__snapshots__/render-document.test.ts.snap` with the canonical HTML output. Review the snapshot for unstable values, browser-only wrappers, random IDs, or unintentional editor-only markup; move any unstable input to fixed fixture attributes rather than weakening the assertion. **Logging:** no production logging; deterministic-failure messages identify the fixture key.

### Phase 3: Focused Validation
- [x] **Task 4: Regenerate and verify only the renderer snapshot suite.** Run `npx vitest run test/renderer/render-document.test.ts --update` once to create/update the baseline, then run `npx vitest run test/renderer/render-document.test.ts` without update mode to prove the committed snapshots and deterministic checks pass. Confirm no snapshot update occurs on the second run and inspect the final diff to ensure it is limited to renderer fixtures, test assertions, and the `.snap` file. **Logging:** preserve Vitest's normal output; do not introduce application logging or broaden validation into unrelated suites.

## Expected Files
- [x] Create: `test/renderer/fixtures/representative-documents.ts`
- [x] Modify: `test/renderer/render-document.test.ts`
- [x] Create: `test/renderer/__snapshots__/render-document.test.ts.snap`

## Completion Criteria
- [x] Every renderer-supported publishable node type has at least one deterministic JSON fixture and reviewed HTML snapshot.
- [x] The fixture catalog covers output-affecting marks and attributes without relying on browser or network state.
- [x] Editor-only `tocNode` and `imageUpload` are proven absent from published HTML.
- [x] The focused Vitest command passes twice in succession, with the second run requiring no snapshot rewrite.
