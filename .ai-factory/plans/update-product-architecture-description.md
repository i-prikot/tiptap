<!-- handoff:task:e8cd8bf7-c6aa-4590-be39-3750adb5c7b8 -->
# Update product architecture description

**Created:** 2026-07-28  
**Mode:** Fast  
**Branch:** `main`  
**Status:** Ready for implementation

## Goal

Align `.ai-factory/DESCRIPTION.md` with the accepted Tinyfy product decisions:
the workspace is a Tinyfy-focused editor library, AI support is limited to a
future in-house extension, collaboration is deferred until Tinyfy has the
required backend, and Tinyfy stores versioned Tiptap JSON in MySQL.

## Settings

- [ ] **Testing:** No — this is a documentation-only change; do not add or run test tasks.
- [ ] **Logging:** None — do not add runtime logging or diagnostics for this editorial update.
- [ ] **Docs checkpoint:** No — `DESCRIPTION.md` is the sole requested artifact; do not invoke a broader documentation workflow.

## Scope and Constraints

- [ ] **Modify only:** `.ai-factory/DESCRIPTION.md`.
- [ ] **Do not modify:** application/package source, tests, `.ai-factory/ARCHITECTURE.md`, or `.ai-factory/ROADMAP.md`.
- [ ] Preserve the existing uncommitted additions in `.ai-factory/DESCRIPTION.md`; incorporate the decisions without reverting or overwriting unrelated edits.
- [ ] Use the accepted product decisions in `.ai-factory/ROADMAP.md` dated **2026-07-05** as the wording authority where the current description is stale.
- [ ] Retain the existing package and static-rendering boundaries: `@i-prikot/editor-renderer` consumes saved JSON to produce derived HTML; HTML is not the source of truth.

## Roadmap Linkage

- [ ] **Milestone:** `none`
- [ ] **Rationale:** Skipped by autonomous fast-mode defaults. The plan nevertheless uses the accepted 2026-07-05 roadmap decisions as its requirements source.

## Tasks

### Phase 1 — Reconcile the Existing Description

- [x] **1. Establish the editorial baseline and decision map.**
  - [ ] **File:** `.ai-factory/DESCRIPTION.md`
  - [ ] Review the current working-tree diff before editing and preserve its unrelated 14 inserted lines.
  - [ ] Identify and replace claims that imply a generic standalone product, current configurable AI support, or active Yjs/Tiptap Cloud collaboration.
  - [ ] Map each accepted decision to the relevant existing sections: `## 1. Назначение`, `### Дополнительные режимы`, `## 4. Технологический обзор`, and `## 6. Контекст потребления`.
  - [ ] **Logging:** None; this task must not add production logging or diagnostics.
  - [ ] **Dependency:** None.

### Phase 2 — Update Product and Data-Boundary Statements

- [x] **2. Rewrite the product-boundary language in `.ai-factory/DESCRIPTION.md`.**
  - [ ] **File:** `.ai-factory/DESCRIPTION.md`
  - [ ] Describe the published packages as a library primarily intended for the Tinyfy cabinet, while keeping `apps/playground` explicitly development-only and outside the product integration path.
  - [ ] State that AI functionality is not currently supplied by the library or a third-party Tiptap Pro AI offering; any future AI capability must be a separately approved in-house Tinyfy extension.
  - [ ] State that collaboration is out of the current product scope and may be considered only after the necessary Tinyfy backend is available; remove language that advertises current Yjs, `@hocuspocus/provider`, or Tiptap Cloud collaboration support.
  - [ ] Make Tinyfy’s persistence contract explicit: the Tinyfy backend (Node.js + MySQL) owns `Tiptap JSON` with `schemaVersion`; static HTML is a derived renderer output rather than stored canonical content.
  - [ ] Keep host secrets, authentication, and storage infrastructure outside the library’s public package responsibilities.
  - [ ] **Logging:** None; wording changes must not introduce runtime logging, event contracts, or configuration APIs.
  - [ ] **Dependency:** Task 1.

### Phase 3 — Verify Editorial Consistency

- [x] **3. Review the final description for contradictory capability claims.**
  - [ ] **File:** `.ai-factory/DESCRIPTION.md`
  - [ ] Verify all four accepted decisions appear consistently and that no remaining section promises host-configured AI, available collaboration, or a different document source of truth.
  - [ ] Confirm the text still distinguishes the editor library, Tinyfy as the primary host, the development-only playground, and static rendering of saved JSON.
  - [ ] Run `git diff --check -- .ai-factory/DESCRIPTION.md` to catch whitespace errors; no automated tests are required or permitted by this plan.
  - [ ] **Logging:** None; this is an editorial validation step.
  - [ ] **Dependency:** Task 2.

## Completion Criteria

- [x] `.ai-factory/DESCRIPTION.md` reflects the four accepted Tinyfy product decisions without changing source code, tests, architecture guidance, or the roadmap.
- [x] Existing unrelated working-tree edits in `.ai-factory/DESCRIPTION.md` remain intact.
- [x] The final diff contains no whitespace errors and no stale claims of current third-party AI or collaboration support.
