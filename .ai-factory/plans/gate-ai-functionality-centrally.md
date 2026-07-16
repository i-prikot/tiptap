<!-- handoff:task:ea3b0c15-0a3e-4410-93a7-84e163525abc -->
# Implementation Plan: Gate AI Functionality Centrally

Branch: `main`
Created: 2026-07-14

## Settings
- [x] Testing: reviewer-requested targeted coverage in `test/editor/components/ui/slash-menu-items.test.ts` (rework exception to the original no-test setting)
- [ ] Logging: verbose development diagnostics, with no AI credentials, token values, URLs, prompts, or document content logged
- [ ] Docs: no (warn-only; do not update documentation artifacts)

## Roadmap Linkage
Milestone: "none"
Rationale: Autonomous handoff mode skips roadmap linkage for this scoped compatibility change.

## Goal
Keep the existing AI provider, readiness code, UI-state behavior, and slash-command implementations available for a future first-party extension, but make them inert and hidden unless the host explicitly opts in through one shared editor feature flag.

## Decisions and Constraints
- [ ] Add `ai: false` to the existing `EditorFeatureFlags` and make `features.ai` the only host-facing switch for this work.
- [ ] AI becomes active only when both `features.ai === true` and valid `ai` configuration are supplied; configuration alone must not request a token, block editor readiness, or expose AI controls.
- [ ] Preserve the current AI types, commands, UI-state fields, and implementations rather than deleting or renaming them.
- [ ] Do not add a second public AI visibility/configuration flag, environment toggle, or direct playground opt-in; the existing `App.vue` configuration remains safely disabled by the new default.
- [x] Do not add unrelated tests or documentation changes; reviewer finding `c9327357452c` requires targeted slash-menu coverage despite the original no-test setting.

## Tasks

### Phase 1: Establish the Shared Contract
- [x] **Task 1: Add the default-disabled AI flag to the public editor feature contract.** Update `src/editor/components/notion/public-api.ts` so `EditorFeatureFlags` includes `ai: boolean` and `defaultEditorFeatureFlags` sets it to `false`; document in the local API comments that AI needs this opt-in in addition to `AiOptions`. Keep `AiOptions` exported and backward-compatible so future first-party extension work can reuse the current configuration shape. **Logging:** this declarative API/default change adds no runtime log; explicitly avoid logging `AiOptions` fields because they may contain credentials or token endpoints. **Dependencies:** none.

- [x] **Task 2: Gate AI provider initialization and editor readiness at the feature boundary.** Update `src/editor/components/notion/NotionEditor.vue` and `src/editor/composables/useAi.ts` so the resolved `features.ai` value is passed into the AI provider and disabled mode always supplies an inert context (`hasAi: false`, no token request, no setup error). Retain the existing token-fetch and error handling path only for explicit opt-in, and confirm `src/editor/components/notion/NotionEditorContent.vue` continues to use the context so disabled AI cannot show setup errors or delay local editor readiness. Add a development-diagnostics event through the existing `debugEditor` helper that reports only `{ enabled, configured }`; never include app IDs, tokens, URLs, prompts, or document content. **Logging:** emit the debug event only when `developmentDiagnostics` is enabled; retain the existing error-level token-fetch failure log only after opted-in token retrieval fails, with no secret values. **Dependencies:** Task 1.

### Phase 2: Gate AI-Dependent UI Behavior
- [x] **Task 3: Thread the shared flag through AI-sensitive UI branches.** Update `src/editor/components/notion/EditorContentArea.vue`, `src/editor/components/ui/DragContextMenu.vue`, and `src/editor/components/ui/NotionToolbarFloating.vue` to receive or derive the resolved `features.ai` value. When false, prevent selection-result auto-accept from calling `aiAccept()` and ignore `aiGenerationActive` when deciding whether drag or floating controls should hide; when true, preserve current behavior exactly. Give standalone UI components a false default for any new internal `aiEnabled` prop so they remain safe outside `EditorContentArea`. **Logging:** add no reactive/render-path logging, preventing repeated UI-state logs and accidental disclosure of editor state; the provider-level diagnostic from Task 2 remains the sole lifecycle signal. **Dependencies:** Task 1.

- [x] **Task 4: Filter AI slash commands at menu construction time.** Update `src/editor/components/ui/SlashDropdownMenu.vue` and `src/editor/components/ui/slash-menu-items.ts` so `EditorContentArea` passes the same `features.ai` value into the slash menu and `getSlashMenuItems` excludes `continue_writing` and `ai_ask_button` before availability checks or command bindings when AI is disabled. Preserve the existing extension checks and actions for the enabled path, ensure callers cannot re-enable these two items merely through `enabledItems`, and keep non-AI custom/menu-group behavior unchanged. **Logging:** do not log menu filtering, prompt construction, or command selections because these can expose user content; rely on the opt-in diagnostic defined in Task 2. **Dependencies:** Tasks 1 and 3.

### Rework: Reviewer Test Coverage (2026-07-15)
- [x] **Task 5: Cover the disabled default and explicit AI opt-in for slash menu entries.** Update `test/editor/components/ui/slash-menu-items.test.ts` so both AI commands are excluded when `getSlashMenuItems` uses its default `aiEnabled` value, and both remain available and executable when `aiEnabled` is explicitly `true`. This reviewer-required task supersedes the original no-test setting. **Dependencies:** Task 4.

**TDD evidence (Task 5):**
- **RED:** `npx vitest run test/editor/components/ui/slash-menu-items.test.ts` failed at `test/editor/components/ui/slash-menu-items.test.ts:85` before the AI slash-menu filter: expected 15 items but received 17, because `continue_writing` and `ai_ask_button` remained present by default.
- **GREEN:** `npx vitest run test/editor/components/ui/slash-menu-items.test.ts` passed after the filter was restored: 1 test file passed and all 3 tests passed.

## Completion Criteria
- [x] With no `features.ai` override, AI token fetching, AI setup errors/readiness waits, AI-specific UI-state branches, and the two AI slash menu items are inactive even if an `ai` prop is present.
- [x] With `features.ai: true` and valid `ai` configuration, the existing provider and AI UI/menu behavior remains available without duplicating configuration or feature flags.
- [x] `test/editor/components/ui/slash-menu-items.test.ts` proves both AI slash commands are disabled by default and available with `aiEnabled: true`, as required by reviewer finding `c9327357452c`.

### Rework: Review Gate Follow-up (2026-07-15)
- [x] **Task 6: Keep AI provider state synchronized with `features.ai`.** Pass a reactive AI feature source from `NotionEditor.vue` into `provideAi`, reset AI readiness and setup-error state whenever it turns off, and ignore stale token responses from earlier enabled states. Retain redacted development diagnostics containing only `{ enabled, configured }` for each feature-state change. **Addresses:** `d3d9bee28cd5`.
- [x] **Task 7: Restrict playground AI access to short-lived `tokenUrl` tokens.** Remove `VITE_TIPTAP_AI_TOKEN` from the runtime playground configuration and its type/example/documentation contract; retain the public `AiOptions.token` field for backward compatibility, but do not supply browser-exposed Vite tokens. **Addresses:** `5ec9cd5c2669`.
- [x] **Task 8: Restore the slash-menu test file mode.** Preserve `test/editor/components/ui/slash-menu-items.test.ts` contents while setting its Git working-tree mode to non-executable (`100644`). **Addresses:** `6987ee135e65`.
- [x] **Task 9: Add configured-but-disabled AI regression coverage.** Extend `test/editor/components/notion/notion-editor.graceful-degradation.integration.test.ts` to prove valid AI configuration does not fetch a token when `features.ai` is false; also verify disabling AI during a pending request releases editor readiness and ignores the stale response. **Addresses:** `636ae2f62b1b`, `d3d9bee28cd5`.
