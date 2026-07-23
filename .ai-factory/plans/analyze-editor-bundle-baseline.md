<!-- handoff:task:c0001321-4ac1-4549-8c1d-bc8db35d9e81 -->
# Implementation Plan: Analyze editor bundle baseline

Branch: `main`
Created: 2026-07-22
Mode: fast (Autonomous Handoff)

## Goal

Add an opt-in `rollup-plugin-visualizer` analysis path for the
`@i-prikot/editor` Vite library build, run it against the current source, and
commit a concise baseline for later size and composition comparisons. Normal
`build` behavior, the ESM-only output contract, package exports, CSS scoping,
and the existing external-dependency boundary must remain unchanged.

The baseline must distinguish publishable runtime payloads from declaration
artifacts: measure `dist/index.js` and `dist/styles.css`, while excluding
`.d.ts` files and source maps. Bundle composition must also make clear that
`vue`, `@tiptap/*`, the schema package, Floating UI, collaboration/Yjs modules,
and KaTeX are configured as Rollup externals rather than included bytes.

## Settings

- [x] Testing: no — explicitly disabled by the handoff task; do not add or modify test cases.
- [x] Logging: verbose terminal diagnostics for dependency installation, Vite analysis, artifact measurement, and report inspection; do not add permanent runtime logging or `console` calls.
- [x] Docs: no — do not add documentation tasks or a documentation checkpoint. The committed baseline is a required performance artifact, not user documentation.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped for Autonomous Handoff mode; this is focused build-analysis
instrumentation for the editor package.

## Constraints

- [x] Use the repository's npm workspace workflow and update `package-lock.json` only through the package-manager dependency change.
- [x] Keep analysis opt-in so `npm run build --workspace=@i-prikot/editor` does not generate visualizer files or change its output.
- [x] Preserve the existing Vite library entry, ESM format, output names, CSS prefixing, schema alias, and `rollupOptions.external` matcher.
- [x] Keep generated visualizer HTML/JSON out of version control; commit only the intentionally maintained baseline Markdown artifact.
- [x] Do not modify application/editor source behavior, package public exports, tests, or release/versioning metadata.

## Tasks

### Phase 1: Add reproducible analysis tooling

- [x] **Task 1: Add the visualizer dependency and an analysis-specific workspace command.**
  - [x] Files: `packages/editor/package.json`, `package-lock.json`.
  - [x] Add `rollup-plugin-visualizer` as an editor-only development dependency using npm workspace metadata; preserve all existing runtime, peer, and development dependency classifications.
  - [x] Add an `analyze` npm script that performs the same declaration generation and Vite library build as `build`, but invokes Vite with a dedicated analysis mode (for example, `bundle-analysis`) rather than relying on shell-specific environment-variable assignment.
  - [x] Ensure the analysis command follows the existing prebuild cleanup convention so the resulting `dist/` payload is a fresh build.
  - [x] **Logging:** retain npm/Vite stdout and stderr, identify the workspace and analysis command at start, and surface dependency-resolution or build failures at `ERROR` level in the implementation transcript. Do not add application logging because this task only changes tooling metadata.

- [x] **Task 2: Enable visualizer outputs only in the dedicated Vite analysis mode.**
  - [x] Files: `packages/editor/vite.config.ts`, `.gitignore`.
  - [x] Refactor the Vite configuration only as needed to read the active mode, while retaining the existing Vue plugin, PostCSS selector scoping, workspace alias, library settings, and external dependency predicate unchanged for normal and analysis builds.
  - [x] In analysis mode, add `rollup-plugin-visualizer` with gzip and Brotli size calculation enabled, browser auto-open disabled, and package-root-relative output paths under an ignored `packages/editor/.bundle-analysis/` directory.
  - [x] Emit an interactive treemap HTML report plus machine-readable raw-data JSON (or the equivalent supported templates) so later comparisons can reproduce both visual composition and exact module/chunk data without committing generated reports.
  - [x] Add a narrowly scoped `.gitignore` entry for `packages/editor/.bundle-analysis/`; do not ignore the committed baseline Markdown file.
  - [x] **Logging:** print or preserve the absolute report paths and analysis-mode selection in Vite output; log configuration/report-write failures as `ERROR`. Do not add runtime `console` statements to editor code.

### Phase 2: Capture the initial baseline

- [x] **Task 3: Run the editor analyzer and record the current composition and delivery-size baseline.** (depends on Tasks 1–2)
  - [x] Files: create `packages/editor/BUNDLE_BASELINE.md`; read generated `packages/editor/.bundle-analysis/` reports and `packages/editor/dist/{index.js,styles.css}`.
  - [x] Execute `npm run analyze --workspace=@i-prikot/editor` from the repository root and confirm it completes the declaration build, library build, treemap report, and raw-data output without altering the normal package export filenames.
  - [x] Record the exact command, date, Node/npm/Vite/visualizer versions, and the report location or regeneration instructions in the baseline artifact.
  - [x] Record raw, gzip, and Brotli byte sizes for the publishable JavaScript (`dist/index.js`) and CSS (`dist/styles.css`), plus their combined payload; state the compression method/tool used so future measurements are comparable.
  - [x] Summarize the visualizer's current bundle composition: output chunk names, the largest bundled source/module groups with their reported sizes, and the configured external dependency groups that are intentionally excluded from the bundle. Keep the values factual from the generated report—do not estimate or invent size numbers.
  - [x] Call out any dominant payload (especially CSS if applicable) as an observation only; do not perform bundle optimization within this task.
  - [x] **Logging:** capture the analyzer command, tool versions, emitted file paths, measured byte values, and the largest reported contributors in the implementation transcript at `INFO` level; treat missing reports, unexpected chunks, or failed compression measurements as `ERROR` and stop before writing an incomplete baseline.

### Phase 3: Validate reproducibility and repository hygiene

- [x] **Task 4: Verify the opt-in analysis path and baseline inputs without adding tests.** (depends on Task 3)
  - [x] Files: verify `packages/editor/package.json`, `packages/editor/vite.config.ts`, `.gitignore`, `packages/editor/BUNDLE_BASELINE.md`, and generated `packages/editor/.bundle-analysis/` files.
  - [x] Run `npm run build --workspace=@i-prikot/editor` after the analysis run to confirm the standard build still succeeds without creating or changing visualizer report files.
  - [x] Verify the baseline values map to fresh `dist/index.js` and `dist/styles.css` artifacts, the external modules remain excluded in the analyzer output, generated `.bundle-analysis/` files are ignored by Git, and `BUNDLE_BASELINE.md` is the only committed analysis artifact.
  - [x] Review the final diff for unrelated lockfile, generated `dist/`, or user-worktree changes and keep only task-scoped modifications.
  - [x] **Logging:** report each validation command and pass/fail result at `INFO`; use `ERROR` for changed normal-build behavior, unignored generated reports, mismatched measurements, or unrelated generated files. Do not add test files or invoke the test suite.
