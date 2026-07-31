<!-- handoff:task:70ec3ada-5c75-4e92-8c57-34c1c2dcad28 -->
# Decide Combobox scope

**Created:** 2026-07-28  
**Branch:** `main`  
**Mode:** fast / autonomous Handoff

## Settings

- [x] **Testing:** no — this task changes the documented product boundary only; it does not alter runtime behavior.
- [x] **Logging:** verbose policy retained; no runtime logging changes are expected because no editor code changes are in scope.
- [x] **Docs:** no additional documentation checkpoint; the required product-decision record in `DESCRIPTION.md` is the task deliverable.

## Roadmap Linkage

- [x] **Milestone:** `none`
- [x] **Rationale:** skipped in autonomous fast mode. The decision resolves the existing Combobox item in Stage 10, but this plan does not modify the roadmap artifact.

## Decision to Implement

**Formally exclude the original Ariakit screen-reader-filter Combobox behavior from the current `@i-prikot/editor` scope.**

Rationale:

- [x] `@i-prikot/editor` has no Ariakit dependency or Combobox component contract to preserve.
- [x] The active `/`, `@`, and `:` suggestion UI already implements its own keyboard navigation and `listbox` / `option` / active-descendant ARIA relationships in `packages/editor/src/components/ui/suggestion/SuggestionMenu.vue`.
- [x] Adding the original filter would create a second, unrequested interaction model and a new dependency without a host requirement, public API, or acceptance criteria.
- [x] A future requirement for screen-reader filtering must be scoped separately with target workflows, accessibility acceptance criteria, public configuration, and compatibility expectations for the existing suggestion menus.

## Tasks

### Phase 1 — Confirm and record the boundary

- [x] **1. Validate the exclusion decision against the current editor UI.**
  - [x] Inspect `packages/editor/package.json` and `packages/editor/src/components/ui/suggestion/SuggestionMenu.vue` to confirm that Ariakit is not part of the package and that existing suggestion menus retain their keyboard and ARIA ownership.
  - [x] Treat the absence of a concrete host requirement or public Combobox API as the decision boundary; do not introduce Ariakit, a filter input, or editor UI changes.
  - [x] **Logging:** no code is changed; document that no runtime logging is added or altered.
  - [x] **Dependency:** none.
  - [x] **Acceptance:** the decision rationale names the existing accessibility behavior that remains supported and the conditions required to reconsider the exclusion.

- [x] **2. Record the final product decision in the project description.**
  - [x] Update `.ai-factory/DESCRIPTION.md` near the editor capability/scope description with a concise subsection or bullet stating that the original Ariakit SR-filter Combobox is excluded from the current editor scope.
  - [x] Include the rationale: existing suggestion menus own their accessible listbox navigation; Ariakit is not a dependency or public contract; future implementation requires a separately approved accessibility and host-integration specification.
  - [x] Keep the wording product-facing and bounded: preserve current `/`, `@`, and `:` suggestion behavior, but make no commitment to future Ariakit adoption.
  - [x] **Logging:** no code is changed; explicitly make no runtime logging changes.
  - [x] **Dependency:** Task 1.
  - [x] **Acceptance:** `DESCRIPTION.md` contains an unambiguous final decision and rationale that allows the Stage 10 roadmap item to be closed without changing editor behavior.

## Validation

- [x] Review the `DESCRIPTION.md` wording for consistency with the current package boundaries and existing suggestion-menu accessibility behavior.
- [x] Run `git diff --check` to verify the documentation edit has no whitespace errors.
- [x] Do not run or add tests: no runtime code or public API changes are planned.
