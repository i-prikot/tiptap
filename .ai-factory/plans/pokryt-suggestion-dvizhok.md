<!-- handoff:task:2ccbab3e-3bcc-4db0-b1d2-2f7ad4cd2b68 -->
# Implementation Plan: Покрыть suggestion-движок

Branch: main
Created: 2026-07-11

## Settings
- [x] Testing: the requested deliverable is the focused unit suite below; do not add component, browser, or unrelated utility coverage.
- [x] Logging: retain verbose Vitest diagnostics while implementing; add no runtime application logging because this is a test-only change.
- [x] Docs: no user-facing or project-documentation changes.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff default; this work advances the uncovered suggestion-engine area of the roadmap's `Этап 2. Тестирование: фундамент`.

## Current State
- [x] `src/editor/utils/suggestion/suggestion.ts` implements a custom ProseMirror suggestion plugin with plugin state, keyboard dismissal, cancellable item loading, `minQueryLength`, and inline decorations.
- [x] Escape dispatches plugin metadata that preserves the active match in `dismissedRange`; subsequent transactions map that range and keep the menu hidden until the current trigger is left or reset conditions apply.
- [x] The plugin view loads `items` only when the active query satisfies `minQueryLength`; each load aborts the prior controller and waits for the configured debounce before calling `items`.
- [x] Vitest runs in one `happy-dom` worker, and adjacent utility specs use typed, self-contained ProseMirror/Tiptap fixtures in `test/editor/utils/`.
- [x] The repository has unrelated working-tree modifications; this task must not modify, stage, revert, or absorb them.

## Scope
- [x] Add one focused Vitest specification for the public suggestion-plugin behavior requested: `dismissedRange`, delayed/cancelled item loading, and `minQueryLength`.
- [x] Exercise actual plugin state transitions and renderer callbacks through a lightweight Tiptap editor fixture rather than duplicating private state-machine logic in mocks.
- [x] Keep production code, Vue menu components, Floating UI mounting behavior, test setup/configuration, package metadata, and documentation unchanged unless a test fixture exposes a genuine isolated test-infrastructure blocker.

## Tasks

### Phase 1: Deterministic suggestion-plugin harness
- [x] **Task 1: Create `test/editor/utils/suggestion.test.ts` with an isolated Tiptap/ProseMirror fixture.**
  - [x] Deliverable: create a minimal editor with the document extensions needed for text input, a fresh `PluginKey` for every case, the `Suggestion()` plugin under test, and renderer spies that record `onStart`, `onUpdate`, `onExit`, and `onKeyDown` props.
  - [x] Deliverable: add helpers to insert/replace trigger text, inspect the keyed plugin state and decorations, dispatch the plugin exit transaction, and flush promise microtasks without mounting Vue suggestion menus.
  - [x] Expected behavior: every test destroys its editor and removes any attached DOM element; fake timers are enabled only in debounce cases, drained/cleared, and restored so the shared non-isolated Vitest worker cannot leak timers or renderer state.
  - [x] Files: `test/editor/utils/suggestion.test.ts`.
  - [x] Dependency notes: none; this fixture is the only new test infrastructure and stays local to the spec.
  - [x] Logging requirements: add no runtime logs. Use scenario-named helpers and descriptive assertions so Vitest identifies the trigger text, query, renderer phase, and asynchronous state that failed.

### Phase 2: `dismissedRange` state-machine coverage
- [x] **Task 2: Cover Escape dismissal, range persistence, mapping, and reset behavior in `test/editor/utils/suggestion.test.ts`.**
  - [x] Expected behavior: activating a trigger (for example, `@al`) creates an active match with its range/query and the expected inline suggestion decoration before dismissal.
  - [x] Expected behavior: pressing `Escape` is handled by the plugin, calls the renderer key handler, deactivates the match, clears the decoration, and stores the previous trigger range as `dismissedRange`.
  - [x] Expected behavior: edits that continue the same non-space query keep the suggestion hidden, including a document change before the trigger that proves the dismissed range is mapped through the transaction.
  - [x] Expected behavior: leaving the dismissed word through the default whitespace/reset path clears the dismissal so a subsequent valid trigger can become active again; preserve the distinction for the default `allowSpaces: false` configuration.
  - [x] Files: `test/editor/utils/suggestion.test.ts`.
  - [x] Dependency notes: depends on Task 1's real plugin-state fixture; do not reach into the private `SuggestionPluginState` implementation except through `PluginKey.getState()`.
  - [x] Logging requirements: add no runtime logs. Name cases by the lifecycle transition (`active → dismissed`, `dismissed → mapped`, `dismissed → reset`) and assert renderer/plugin outcomes together for actionable failures.

### Phase 3: Query threshold and cancellable debounce coverage
- [x] **Task 3: Cover `minQueryLength` and debounce cancellation in `test/editor/utils/suggestion.test.ts`.**
  - [x] Expected behavior: with a positive `minQueryLength`, trigger-only and shorter queries remain active but do not call `items`, expose non-loading renderer props, and retain `initialItems` when supplied; the query at the threshold invokes `items` and eventually publishes its resolved items with `loading: false`.
  - [x] Expected behavior: with a positive `debounce`, `items` is not called before the full delay and is called once with the active query after fake timers reach the configured delay.
  - [x] Expected behavior: changing the query before a delayed request fires aborts/cancels the stale request, prevents stale renderer updates, and allows only the latest query's result to populate the menu; assert the supplied abort signal where the fixture observes it.
  - [x] Expected behavior: an item-provider rejection resolves the renderer to `loading: false` without unhandled promise failures or stale items, preserving the plugin's error boundary.
  - [x] Files: `test/editor/utils/suggestion.test.ts`.
  - [x] Dependency notes: depends on Task 1; keep all timer advancement and deferred promises inside each case to avoid cross-test scheduling.
  - [x] Logging requirements: add no runtime logs. Label fake-timer and deferred-result assertions with query/delay values and rely on Vitest's focused failure output for debounce diagnostics.

### Phase 4: Focused verification and scope control
- [x] **Task 4: Run the new suite and verify the patch remains test-only.**
  - [x] Deliverable: run `npm test -- test/editor/utils/suggestion.test.ts`; run `npm run typecheck` only after the focused suite is green if the repository's existing command is practical in the current workspace.
  - [x] Expected behavior: the focused suite passes deterministically under `happy-dom` with no pending timers, unresolved deferred promises, residual decorations, DOM nodes, or editor instances.
  - [x] Expected behavior: inspect the final diff to confirm the functional change is limited to `test/editor/utils/suggestion.test.ts` and leaves pre-existing unrelated working-tree changes untouched.
  - [x] Files: `test/editor/utils/suggestion.test.ts`.
  - [x] Dependency notes: depends on Tasks 1–3; if the tests expose a product defect, retain the failing behavioral evidence and propose a separate source-fix task rather than expanding this test-only scope.
  - [x] Logging requirements: retain the exact focused Vitest/typecheck command output as implementation diagnostics; do not add application logging, snapshots, or test-report artifacts.

## Completion Criteria
- [x] `test/editor/utils/suggestion.test.ts` exists and uses a self-contained typed Tiptap/ProseMirror fixture compatible with the repository's Vitest + `happy-dom` setup.
- [x] The suite proves Escape saves and enforces `dismissedRange`, maps it through document edits, and resets it only after leaving the dismissed query under the default configuration.
- [x] The suite proves queries below `minQueryLength` do not fetch items, while threshold-reaching queries fetch and publish resolved results with the correct loading transitions.
- [x] The suite proves debounce delays the provider invocation and rapid query changes cancel/abort stale work without publishing stale items.
- [x] `npm test -- test/editor/utils/suggestion.test.ts` passes, and any optional typecheck result is recorded without modifying source code, documentation, test configuration, package files, or unrelated tests.

## Out of Scope
- [ ] Changes to `src/editor/utils/suggestion/suggestion.ts`, `SuggestionMenu.vue`, dropdown components, extension wiring, command insertion behavior, or Floating UI positioning/mounting.
- [ ] Direct coverage of `findSuggestionMatch`, `calculateStartPosition`, and `filterSuggestionItems` beyond what is required to drive the plugin scenarios.
- [ ] Component, visual, browser/e2e, accessibility, performance, coverage-threshold, CI, documentation, roadmap, or package/tooling changes.

## Final Commit
- [ ] `test: cover suggestion plugin state and async loading`
