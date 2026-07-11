<!-- handoff:task:9d9e89da-2d92-4caf-8eb8-0351ab9d9339 -->
# Implementation Plan: Зафиксировать TDD-регламент

Branch: main
Created: 2026-07-10

## Settings
- [ ] Testing: no new automated test files; this task records the process rule that future feature and refactoring work must start with a failing test.
- [ ] Logging: verbose implementation diagnostics; no runtime application logging is expected for a rules-only change.
- [ ] Docs: no user-facing documentation changes; `.ai-factory/RULES.md` is the required internal policy artifact.

## Roadmap Linkage
Milestone: "Этап 2. Тестирование: фундамент (до рефакторинга и пакетизации)"
Rationale: The task completes the unchecked TDD-regulation item in the testing-foundation milestone.

## Current State
- [x] `.ai-factory/RULES.md` does not exist and must be created as the authoritative project-rules artifact.
- [x] `.ai-factory/ROADMAP.md` already identifies this work: new features and refactoring must begin with a failing test.
- [x] An unrelated working-tree change exists in `.husky/pre-commit`; do not modify, stage, or revert it.

## Scope
- [x] Establish a binding TDD workflow for all new features and refactoring work.
- [x] Make the expected RED–GREEN–REFACTOR evidence clear enough for future implementation and review.
- [x] Keep task-owned changes limited to `.ai-factory/RULES.md` and this implementation plan; do not modify unrelated working-tree changes.

## Tasks

### Phase 1: Establish the Rules Artifact
- [x] Task 1: Create `.ai-factory/RULES.md` with a concise, durable project-rules structure.
  - [x] Deliverable: a new rules file that makes TDD a mandatory engineering convention, rather than a suggestion in a plan or roadmap.
  - [x] Expected behavior: future `$aif-implement` work can read one authoritative file to determine the project's test-first requirement.
  - [ ] Files: `.ai-factory/RULES.md`.
  - [ ] Dependency notes: none; the file must exist before its TDD rule can be recorded.
  - [ ] Logging requirements: add no runtime logging. Record in the implementation summary that the rules artifact was created and that no application source files changed.

### Phase 2: Codify the Test-First Protocol
- [x] Task 2: Add an enforceable TDD rule for new features and refactoring in `.ai-factory/RULES.md`.
  - [x] Deliverable: rule text that requires the implementer to first write and run a test whose assertion fails for the intended missing or incorrect behavior; a setup, type, or unrelated failure does not satisfy the RED step.
  - [x] Expected behavior: each covered change follows RED–GREEN–REFACTOR: observe the targeted failing test, implement the minimal production change until it passes, then refactor only with the relevant tests green. Before a refactor, establish or add a behavioral test that protects the behavior being changed.
  - [x] Evidence requirement: require the relevant test command and its RED and GREEN outcomes to be recorded in the implementation or pull-request summary; do not allow a feature or refactor to be marked complete without this evidence.
  - [x] Scope boundary: specify that the rule applies to new features and refactoring, while purely editorial documentation, formatting-only, or metadata-only changes are outside this scope.
  - [ ] Files: `.ai-factory/RULES.md`.
  - [ ] Dependency notes: depends on Task 1.
  - [ ] Logging requirements: add no runtime logging. Use the test runner's CLI output as development evidence and note the rule's required evidence format in the implementation summary.

### Phase 3: Validate Rule Clarity and Change Isolation
- [x] Task 3: Review `.ai-factory/RULES.md` against the task requirements and the repository state.
  - [x] Deliverable: the final rule explicitly covers both new features and refactoring, requires a targeted failing test before production changes, and names the RED–GREEN–REFACTOR sequence and completion evidence.
  - [x] Expected behavior: the policy is actionable without creating a test file for this documentation-only task, and the task delta contains only `.ai-factory/RULES.md` plus this implementation plan.
  - [ ] Files: `.ai-factory/RULES.md`.
  - [ ] Dependency notes: depends on Tasks 1 and 2.
  - [ ] Logging requirements: add no runtime logging. Record manual policy-review results and confirm that the existing `.husky/pre-commit` change remains untouched.

## Acceptance Criteria
- [x] `.ai-factory/RULES.md` exists and is the source of truth for the TDD convention.
- [x] The rule states that every new feature and refactor begins with a targeted, observed failing test.
- [x] The rule requires the GREEN step before refactoring and keeps refactoring under passing relevant tests.
- [x] The rule requires RED and GREEN test-command evidence in the implementation or pull-request summary.
- [x] Other than `.ai-factory/RULES.md` and this implementation plan, no automated test files, user-facing documentation, application code, or unrelated `.husky/pre-commit` changes are included.

## Out of Scope
- [ ] Creating or changing automated tests for an editor feature.
- [ ] Updating `.ai-factory/ROADMAP.md`, `README.md`, or other user-facing documentation.
- [ ] Changing application source code, CI configuration, npm scripts, or Husky hooks.
