<!-- handoff:task:b751187b-50cd-4b9d-af14-918a0e301768 -->
# Implementation Plan: Validate Locale Extensibility

Branch: `main`
Created: 2026-07-23

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no — no post-implementation documentation checkpoint; the contributor guidance required by this task remains in scope.

## Roadmap Linkage
Milestone: "none"
Rationale: Autonomous Handoff fast-mode defaults skip explicit roadmap linkage; this work supports the existing Stage 8 i18n extensibility objective.

## Scope and Constraints
- [ ] Keep localization editor-scoped and dependency-free: do not introduce `vue-i18n`, a global locale store, or a runtime i18n dependency.
- [ ] Treat `packages/editor/src/i18n/en/` as the canonical message tree. Bundled locale catalogs must remain structurally equivalent without restricting host applications from using arbitrary locale identifiers and partial `messages` overrides.
- [ ] Reconcile the active localization working-tree changes instead of reverting or overwriting them, especially the existing `EditorMessageKey`, `EditorMessageTree`, and interpolation typing work.
- [ ] Do not add or modify automated tests. Validation is a repository script and CI quality gate, not a test-suite task.
- [ ] Do not log translated strings, host message catalogs, interpolation values, or editor/document data.

## Tasks

### Phase 1: Stabilize the Locale Authoring Contract
- [x] **Task 1: Make the English catalog the explicit typed source for locale keys and complete bundled-catalog shape checking.**
  - [x] **Files:** modify `packages/editor/src/i18n/types.ts`, `packages/editor/src/i18n/index.ts`, `packages/editor/src/i18n/en/index.ts`, and `packages/editor/src/i18n/ru/index.ts`; adjust individual `packages/editor/src/i18n/{en,ru}/*.ts` only when required to retain the canonical catalog type contract.
  - [x] Preserve `EditorMessageKey` as the recursively derived union of dot-separated English leaf paths, and expose the canonical full-catalog type needed by locale authors from the public i18n barrel.
  - [x] Make every bundled non-base locale satisfy the exact recursive English message-tree shape so TypeScript rejects omitted leaves, object/leaf mismatches, and incompatible values at authoring time. Preserve readonly literal inference and the current host-facing `EditorLocale = string`, `EditorMessageCatalog`, and partial-override behavior.
  - [x] Keep the English catalog as the only key-definition source; do not duplicate manual key unions or require runtime registration merely to type a new locale.
  - [x] **Dependencies:** none; this contract is consumed by the verifier, CI, and contributor documentation.
  - [x] **Logging requirements:** add no runtime editor logs. Any helper or developer diagnostic introduced for catalog authoring must be development-only, `DEBUG`-level, key/path-only, and must never serialize translation values or host data.

### Phase 2: Add Deterministic Locale Completeness Verification
- [x] **Task 2: Create a repository verifier that compares every bundled locale against the English base catalog.**
  - [x] **Files:** create `scripts/validate-editor-locales.mjs`; modify `package.json` to expose the verifier through a root `validate:locales` script.
  - [x] Implement the verifier with the existing Node/TypeScript toolchain and no new production or development dependencies. Parse the established `packages/editor/src/i18n/<locale>/index.ts` composition and namespace object modules without executing application code.
  - [x] Discover locale directories, require the `en` base catalog, flatten nested message objects to dot paths, and fail with a non-zero exit status when a non-base locale has a missing namespace/key, an object-versus-leaf shape mismatch, a non-string leaf, or an empty/whitespace-only translation. Also reject unexpected keys so bundled locale trees stay exact.
  - [x] Produce deterministic, sorted diagnostics identifying only the locale, key path, and failure reason; include a concise error summary so CI failures are actionable without printing translated content. Validate that the base catalog itself is non-empty and internally parseable before comparing other locales.
  - [x] **Dependencies:** Task 1 establishes the canonical type and composition expectations; the script must tolerate every current namespace file rather than relying on a hard-coded key list.
  - [x] **Logging requirements:** follow repository verifier conventions with `LOG_LEVEL` (`info` by default, `debug` for discovery/count details, `error` for failures). Log catalog paths, locale identifiers, and key paths only; never log translation values, messages, overrides, or document data.

### Phase 3: Enforce the Gate in Pull-Request CI
- [x] **Task 3: Run locale completeness validation as an explicit CI quality check.**
  - [x] **Files:** modify `.github/workflows/ci.yml` and, if Task 2 requires script registration changes, `package.json` only.
  - [x] Add a clearly named locale-validation step to the existing `quality` job after dependency installation and before build completion, invoking `npm run validate:locales`. Keep existing typecheck, lint, coverage, build, and E2E steps unchanged.
  - [x] Ensure a catalog mismatch fails the PR workflow directly, with the verifier's deterministic output available in the job log; do not duplicate locale validation in a separate workflow or install extra tooling in CI.
  - [x] **Dependencies:** Task 2 must provide the root script and non-zero failure behavior.
  - [x] **Logging requirements:** preserve normal GitHub Actions output. CI may show the verifier's `INFO`/`ERROR` path-only diagnostics, but must not enable output that reveals translation text or host/editor data.

### Phase 4: Document the Supported New-Language Workflow
- [x] **Task 4: Add contributor-facing instructions for adding and validating a bundled editor locale.**
  - [x] **Files:** modify `README.md`; reference `packages/editor/src/i18n/` and the public exports rather than duplicating catalog definitions in documentation.
  - [x] Add a concise localization section near the package integration guidance that distinguishes bundled catalogs from host-supplied partial `messages` overrides. Show the supported public types/catalog imports and state that `en` defines the canonical key set.
  - [x] Document the exact bundled-language workflow: create a locale directory from the English namespace layout, translate every leaf with `satisfies` against the canonical message-tree type, export the locale from the package i18n barrel/public API when it is intended to ship, and run `npm run validate:locales` plus the existing typecheck before opening a PR.
  - [x] Explain that no locale may silently fall back because of an incomplete bundled catalog; missing, blank, malformed, or extra keys are CI failures. Keep API examples focused on key/type usage and avoid including copied full translation catalogs.
  - [x] **Dependencies:** Tasks 1–3 define the public type names, command, and CI behavior that this section documents.
  - [x] **Logging requirements:** documentation introduces no runtime logging. State only the verifier's safe path-only diagnostic behavior; do not document logging of message text or host-supplied catalogs.

## Completion Criteria
- [x] Public locale types provide typed canonical message keys while retaining arbitrary host locale identifiers and partial host overrides.
- [x] Every committed bundled locale is checked against English for exact nested structure and non-empty string leaves by `npm run validate:locales`.
- [x] Pull requests fail in the existing `quality` CI job when locale validation reports an incomplete or malformed catalog.
- [x] `README.md` gives maintainers a complete, dependency-free procedure for adding a shipped locale and running validation.
- [x] No automated tests, global i18n dependencies, or unsafe translation-content logs are introduced.

## Rework Record — 2026-07-23
- [x] **Finding `78c78d96d87c`:** Decode hexadecimal and standard escaped whitespace consistently in quoted strings and template literals, so blank escaped translations are rejected.
- [x] **Finding `3f58fad53b21`:** Reject locale namespace imports whose resolved TypeScript module path escapes that locale directory before reading the file.
- [x] **Verification:** Ran syntax, formatting, and bundled-catalog checks; exercised disposable fixtures for `\x20`, template `\t`, and `../` import traversal. No fixture files remain.

## Rework Record — 2026-07-23 (Public API)
- [x] **Finding `c20386d5d477`:** Re-export `EditorMessageKey` from the package root so consumers of `@i-prikot/editor` can use the canonical typed translation-key union.
- [x] **Verification:** `npm run typecheck --workspace=@i-prikot/editor`, `npm run build --workspace=@i-prikot/editor`, `npm run validate:locales`, and Prettier checks passed; generated `packages/editor/dist/index.d.ts` exposes the type.
