<!-- handoff:task:a83f9bf1-50b4-4624-b13c-5b7134a8ccd7 -->
# Implementation Plan: Move the Demo Application to `apps/playground`

Branch: `main`
Created: 2026-07-17

## Settings
- [ ] Testing: no — explicitly excluded for this task; do not add or modify automated tests.
- [ ] Logging: verbose — use temporary migration diagnostics only; do not leave browser logs that expose document content, tokens, or user data.
- [ ] Docs: no — do not create documentation tasks or make documentation updates.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by autonomous Handoff defaults.

## Current Baseline and Scope
- [ ] The workspace migration in commit `9cbe2c0` already places the host application under `apps/playground`; the implementation must preserve this separation rather than move library code back into the app.
- [ ] `apps/playground/src/App.vue`, `apps/playground/src/utils/document-id.ts`, `apps/playground/src/composables/useDemoDocumentSeed.ts`, and `apps/playground/src/content/default-content.ts` are playground-owned behavior.
- [ ] `@tinyfy/editor` and `@tinyfy/editor-schema` remain reusable packages. The playground accesses them only through their public package exports.
- [ ] The root `.env.example` is not loaded by Vite when `npm run dev` starts the `@tinyfy/playground` workspace. Put the demo environment template where the playground Vite project loads it, without adding secrets to version control.

## Commit Plan
- [ ] **Commit 1** (after Tasks 1–3): `refactor(playground): move demo host application into workspace`
- [ ] **Commit 2** (after Tasks 4–5): `chore(playground): scope environment configuration to demo app`

## Tasks

### Phase 1: Establish the Playground Boundary
- [x] **Task 1: Make `@tinyfy/playground` the sole development-app entry point.**
  - [ ] **Files:** `package.json`, `apps/playground/package.json`, `apps/playground/tsconfig.json`, `apps/playground/vite.config.ts`, `apps/playground/index.html`.
  - [ ] **Deliverable:** Keep the npm workspace declaration and root `dev` script targeting `@tinyfy/playground`; ensure the app package owns its Vite entry, output directory, TypeScript config, and direct runtime dependencies. Retain Vite aliases only for local development resolution of public `@tinyfy/editor` and `@tinyfy/editor-schema` interfaces.
  - [ ] **Expected behavior:** `npm run dev` starts the playground, while editor and schema packages remain independently buildable and contain no app shell concerns.
  - [ ] **Logging:** During relocation only, use guarded `DEBUG` diagnostics around Vite/import resolution if needed; remove them before completion. Do not add permanent `console` output.
  - [ ] **Dependencies:** None.

- [x] **Task 2: Relocate and preserve the demo host shell.**
  - [ ] **Files:** `apps/playground/src/main.ts`, `apps/playground/src/App.vue`, `apps/playground/src/components/CtaPopup.vue`, `apps/playground/src/components/NotionEditorHeader.vue`, `apps/playground/src/components/ThemeToggle.vue`, `apps/playground/src/styles/**`; remove any obsolete root `src/main.ts`, `src/App.vue`, and host-only component/style copies if present.
  - [ ] **Deliverable:** Keep application bootstrap, stylesheet imports, header/theme controls, CTA UI, overlay target, editor lifecycle handling, URL synchronization, and collaboration/AI option assembly in the playground. Replace former internal editor imports with public `@tinyfy/editor` exports and retain relative imports only for app-owned files.
  - [ ] **Expected behavior:** Opening the playground creates the same editor session and host UI; changing URL/history state updates document context, and `?noCollab=1` remains a playground-only override.
  - [ ] **Logging:** If a relocation failure must be traced, emit temporary `DEBUG` messages at bootstrap/session recreation boundaries without including tokens or document JSON; keep existing error propagation through component callbacks/UI and remove temporary logs before merge.
  - [ ] **Dependencies:** Task 1.

- [x] **Task 3: Keep URL document identity and seed content app-owned.**
  - [ ] **Files:** `apps/playground/src/utils/document-id.ts`, `apps/playground/src/composables/useDemoDocumentSeed.ts`, `apps/playground/src/content/default-content.ts`, `apps/playground/src/App.vue`; remove legacy root copies if present.
  - [ ] **Deliverable:** Preserve `getDocumentId()` as URL-path parsing for the playground and continue passing the resulting document ID to the editor/collaboration host contract. Preserve default-content seeding only for an empty, not-yet-interacted local document; retain `hasInteracted-<documentId>` local-storage isolation, history exclusion for the seed insertion, update listener cleanup, and focus behavior.
  - [ ] **Expected behavior:** Each URL-derived document has isolated first-load seed behavior; returning to an interacted document does not overwrite its contents, and unmounting or recreating the editor removes the old listener.
  - [ ] **Logging:** Use temporary `DEBUG` diagnostics only for seed decision branches (`empty`, `previously interacted`, `cleanup`) and identify documents by a redacted/hash-safe label if needed; never log document content or local-storage values. Remove diagnostics before completion.
  - [ ] **Dependencies:** Task 2.

### Phase 2: Scope Runtime Configuration to the App
- [x] **Task 4: Move and type the playground environment configuration.**
  - [ ] **Files:** `.env.example`, `apps/playground/.env.example`, `apps/playground/src/env.d.ts`, `apps/playground/src/App.vue`, `apps/playground/vite.config.ts`, `.gitignore` only if an app-local ignore rule is required.
  - [ ] **Deliverable:** Move the checked-in Vite environment template into `apps/playground/.env.example` so it accompanies the Vite project that consumes it, and remove the obsolete root copy. Keep all currently consumed optional `VITE_TIPTAP_*` declarations typed in the app-local `ImportMetaEnv`; align the template, types, and runtime reads for collaboration app ID/token URL/static local token/document prefix and AI app ID/token URL. Do not put production secrets in the template or library package.
  - [ ] **Expected behavior:** A developer can copy the app-local template to `apps/playground/.env`; Vite loads the values when running the playground, collaboration/AI remain disabled when their app IDs are unset, and the editor package never reads `import.meta.env` directly.
  - [ ] **Logging:** Never log environment values, JWTs, or token URLs. Keep setup failures surfaced through existing UI/error paths; temporary `DEBUG` output may state only that a feature is configured or disabled, then must be removed.
  - [ ] **Dependencies:** Tasks 1–2.

### Phase 3: Remove Legacy Ownership and Perform Manual QA
- [x] **Task 5: Remove obsolete root app artifacts and confirm the playground remains the manual QA surface.**
  - [ ] **Files:** legacy root `src/**`, legacy root `public/**`, and root app entry files only when present; `apps/playground/**` for any import/path cleanup discovered during the audit.
  - [ ] **Deliverable:** Delete duplicate application-only artifacts after their playground replacements resolve, without deleting package source, generated artifacts, or workspace configuration. Run build/type validation only; do not introduce automated test files or test commands for this task.
  - [ ] **Manual acceptance checks:** Start `npm run dev`; open `/`, a URL ending in a custom document ID, and the same URL with `?noCollab=1`; confirm the header/theme/CTA render, document IDs change with browser navigation, the seed appears only for a new empty document, and unset environment variables leave cloud features disabled without exposing tokens.
  - [ ] **Logging:** Inspect development-server output for unresolved imports and setup errors. Treat any temporary diagnostics from earlier tasks as removal criteria; retain no permanent verbose browser logging.
  - [ ] **Dependencies:** Tasks 3–4.

## Completion Criteria
- [x] The only runnable demo host is `apps/playground`, started through the root workspace script.
- [x] `App.vue`, `getDocumentId`, demo seed content, and environment ownership live under `apps/playground`.
- [x] Reusable packages do not import app-owned modules or read Vite environment variables.
- [x] No duplicate root application entry/source files remain.
- [x] The requested no-test/no-docs constraints are respected.
