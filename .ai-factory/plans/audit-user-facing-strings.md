<!-- handoff:task:cbec95b5-fdc8-422d-af62-e247e6402a26 -->
# Implementation Plan: Audit user-facing strings

Branch: `main`
Created: 2026-07-23

## Settings
- [ ] Testing: no
- [ ] Logging: verbose audit diagnostics only; do not add runtime logging or record document/user content
- [ ] Docs: no

## Roadmap Linkage
Milestone: "none"
Rationale: This autonomous Handoff task creates a focused source-of-truth inventory and does not change a roadmap deliverable.

## Scope and Decisions
- [ ] Deliver the inventory as `.ai-factory/audits/user-facing-strings.md`. This is an internal audit artifact, not published product documentation.
- [ ] Record each distinct user-visible value with its exact text or dynamic-value description, UI surface, source location, presentation type, and package scope. Do not list component names, CSS selectors, telemetry/logging text, Tiptap schema keys, or developer-only diagnostics as user-facing strings.
- [ ] Treat an accessibility name, tooltip, visible label, placeholder, menu title/subtext/group heading, search keyword, default-document copy, empty state, and user-visible error as separate presentation surfaces when their wording differs.
- [ ] Include configurable or runtime-supplied text (for example, mention users, emoji metadata, image-upload `errorMessage`, and consumer-provided placeholder/config values) as provenance entries rather than falsely treating it as a fixed English literal.
- [ ] Cover the published `@i-prikot/editor` package first. Include `apps/playground` shell, CTA, theme control, and seeded demo document in a separately marked **playground-only** section so they are not mistaken for library UI strings.
- [ ] Do not change product copy, localization behavior, public APIs, components, tests, or published documentation as part of this audit.

## Tasks

### Phase 1: Define the audit ledger and coverage rules
- [x] **Task 1: Create the canonical user-facing-string audit ledger.** Add `.ai-factory/audits/user-facing-strings.md` with a stable row format containing: exact text or dynamic source, surface/category, UI control or state, source file and symbol, package scope (`editor` or `playground-only`), and notes on duplication/configurability. Start it with explicit inclusion/exclusion rules and a coverage matrix for toolbar/formatting, slash/mention/emoji/drag menus, table controls, colors, links, image UI, editor states, accessibility, and demo content. **Files:** `.ai-factory/audits/user-facing-strings.md`. **Dependencies:** none. **Logging:** no runtime logging; retain the static-search commands and unmatched-candidate decisions in the ledger’s audit notes only, without collecting user content.

### Phase 2: Inventory editor package strings
- [x] **Task 2: Inventory command menus, toolbar controls, and accessibility names.** Populate the ledger from the authoritative metadata and Vue bindings in `packages/editor/src/components/ui/slash-menu/slash-menu-items.ts`, `packages/editor/src/components/ui/{slash-menu,drag-context-menu,emoji-menu,mention-menu,mobile-toolbar,toolbar,turn-into,formatting,link}/`, and their supporting composables such as `useTurnInto.ts`, `useMark.ts`, `useIndent.ts`, `useTextAlign.ts`, `useUndoRedo.ts`, `useMoveNode.ts`, `useDuplicate.ts`, `useDeleteNode.ts`, `useCopyToClipboard.ts`, `useCopyAnchorLink.ts`, and `useResetAllFormatting.ts`. Capture visible labels, headings, descriptions, keyboard-search keywords, tooltips, `aria-label`s, input placeholders, and dynamic user/emoji data sources; deduplicate identical strings while retaining every differing surface. **Files:** `.ai-factory/audits/user-facing-strings.md`; audit-only reads of the listed editor sources. **Dependencies:** Task 1. **Logging:** do not modify application logging; flag labels derived at runtime (for example from action/type values) and development-only diagnostics separately in audit notes.

- [x] **Task 3: Inventory tables, images, colors, and editor-state/error text.** Add the remaining library coverage from `packages/editor/src/components/table/`, `packages/editor/src/composables/{useTableAlignCell,useTableClearAllContents,useTableFitToWidth,useTableHandleState,useTocShowTitle,useColorText,useColorHighlight,useColorMenu,useImageAlign,useImageCaption,useImageDownload,useImageUpload,useImageUploadButton}.ts`, `packages/editor/src/components/ui/{color,image}/`, `packages/editor/src/nodes/{image,image-upload}/`, `packages/editor/src/components/notion/`, `packages/editor/src/components/primitives/`, and the public configuration in `packages/editor/src/components/notion/notion-editor/{EditorProvider,NotionEditor,NotionEditorContent,public-api}.ts`. Distinguish fixed color names from recent/custom color values, static captions/placeholders from consumer-supplied configuration, and upload/error UI from `console`/diagnostic strings that are not rendered to users. **Files:** `.ai-factory/audits/user-facing-strings.md`; audit-only reads of the listed editor sources. **Dependencies:** Task 1. **Logging:** preserve existing runtime diagnostics unchanged; record only error text that can reach rendered UI and annotate runtime-provided error-message provenance without logging file names, URLs, or user data.

### Phase 3: Reconcile package and playground coverage
- [x] **Task 4: Add playground-only content and perform completeness reconciliation.** Inventory `apps/playground/src/components/{NotionEditorHeader,CtaPopup,ThemeToggle}.vue`, `apps/playground/src/{App.vue,content/default-content.ts,composables/useDemoDocumentSeed.ts}`, and any visible setup/loading/error state that wraps the editor. Re-run a source-only literal/attribute scan across `packages/editor/src` and `apps/playground/src`, reconcile every candidate against the ledger or an explicit exclusion, verify all required categories have at least one reviewed source boundary, and add a short totals/known-gaps section. **Files:** `.ai-factory/audits/user-facing-strings.md`; audit-only reads of `packages/editor/src/**` and `apps/playground/src/**`. **Dependencies:** Tasks 2-3. **Logging:** no runtime logging or tests; keep scan results and intentional exclusions as reproducible audit evidence, and explicitly state any strings generated by third-party dependencies that cannot be enumerated from repository source.

- [x] **Rework (2026-07-23): Record the slash-menu placeholder decoration.** Added the visible `Filter...` prompt as a dedicated ledger row, tracing its `decoration-content` source in `packages/editor/src/components/ui/slash-menu/SlashDropdownMenu.vue` and its CSS rendering in `packages/editor/src/styles/slash-decoration.css`. **Files:** `.ai-factory/audits/user-facing-strings.md`. **Dependencies:** Task 4.
