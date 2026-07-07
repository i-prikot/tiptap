<!-- handoff:task:f05fe89c-1625-4c4c-845a-c7eae47b8b0e -->
# Configure ESLint

Created: 2026-07-07
Mode: fast
Branch: current branch, no branch created

## Settings

- [x] Testing: no — do not add test tasks or test dependencies for this plan.
- [x] Documentation: no — do not add README/docs updates for this plan.
- [x] Logging: verbose for implementation diagnostics, but no runtime application logging is needed for ESLint configuration; rely on package manager and ESLint CLI output.
- [x] Scope: configure ESLint flat config for the existing Vue 3 + TypeScript app only.

## Roadmap Linkage

- [x] Milestone: none
- [x] Rationale: skipped by autonomous handoff defaults; the work still corresponds to the roadmap item “Подключить ESLint (flat config) с `eslint-plugin-vue` и `typescript-eslint`” under “Этап 0. Инфраструктура качества”.

## Current Context

- [x] Project stack: Vue 3, TypeScript, Vite, Tiptap v3, npm with `package-lock.json`.
- [x] Current scripts in `package.json`: `dev`, `build`, `typecheck`; no lint scripts exist yet.
- [x] Current TypeScript config: `tsconfig.json` extends `@vue/tsconfig/tsconfig.dom.json`, uses strict mode, `noImplicitAny: false`, and alias `@/* -> src/*`.
- [x] Existing code style: ESM imports, single quotes, no semicolons, Vue SFCs with `<script setup lang="ts">`, some intentional `console.error` error handling.
- [x] Existing source layout to cover: `src/**/*.ts` and `src/**/*.vue`; generated/build outputs should be ignored.

## Implementation Checklist

### Phase 1 — Add ESLint Dependencies

- [x] Add ESLint tooling dev dependencies in `package.json` and `package-lock.json`.
  - [x] Files: `package.json`, `package-lock.json`.
  - [x] Install target: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-vue`, `vue-eslint-parser`, `globals`.
  - [x] Expected behavior: `npm install --save-dev ...` updates the lockfile consistently with the existing npm workflow.
  - [x] Logging requirements: keep package manager output visible during install; do not add application logs.
  - [x] Dependencies: none.

### Phase 2 — Create Flat ESLint Config

- [x] Create `eslint.config.js` with flat config for Vue 3 + TypeScript.
  - [x] Files: `eslint.config.js`.
  - [x] Expected behavior: export an ESM flat config compatible with project `type: "module"` and ESLint 9 flat config loading.
  - [x] Include recommended bases: `@eslint/js` recommended, `typescript-eslint` recommended, and `eslint-plugin-vue` flat recommended config.
  - [x] Configure Vue parsing: use `vue-eslint-parser` for `.vue` files and delegate TypeScript parsing to `typescript-eslint` parser with `extraFileExtensions: ['.vue']`.
  - [x] Configure environment: browser globals and modern ESM syntax for Vite/Vue source files.
  - [x] Configure ignores: `node_modules/`, `dist/`, `coverage/`, build artifacts, local env files, and generated AI Factory artifacts if they would otherwise be scanned.
  - [x] Logging requirements: no runtime logs; keep ESLint config simple enough that failed config loading produces direct ESLint CLI diagnostics.
  - [x] Dependencies: depends on Phase 1.

### Phase 3 — Tune Rules to Current Source

- [x] Add project-specific rule overrides that match the existing source instead of forcing unrelated rewrites.
  - [x] Files: `eslint.config.js`.
  - [x] Expected behavior: the first lint run should surface actionable issues without failing on known project conventions.
  - [x] Preserve current style assumptions: no semicolon/stylistic enforcement unless already covered by recommended correctness rules; do not introduce Prettier or formatting rules in this task.
  - [x] Vue override: disable or narrowly scope `vue/multi-word-component-names` so root `src/App.vue` and current component naming patterns are not blocked.
  - [x] TypeScript overrides: keep `@typescript-eslint/no-explicit-any` relaxed if existing Tiptap/Vue integration code requires it; configure unused variables to allow intentionally ignored `_`-prefixed names.
  - [x] Console override: allow `console.warn` and `console.error` for existing setup/runtime error handling, while keeping accidental debug logging visible if `no-console` is enabled.
  - [x] Logging requirements: no application logs; document any rule relaxation through clear config structure and inline grouping names only if needed.
  - [x] Dependencies: depends on Phase 2.

### Phase 4 — Add npm Lint Scripts

- [x] Add ESLint scripts to `package.json`.
  - [x] Files: `package.json`.
  - [x] Expected behavior: `npm run lint` checks the project and `npm run lint:fix` applies safe fixes.
  - [x] Suggested scripts: `"lint": "eslint ."` and `"lint:fix": "eslint . --fix"`.
  - [x] Do not add `format`, Prettier, husky, lint-staged, or CI scripts in this task because docs/tests are disabled and the requested scope is ESLint only.
  - [x] Logging requirements: rely on npm and ESLint command output; do not add application logs.
  - [x] Dependencies: depends on Phases 1–3.

### Phase 5 — Validate and Adjust Configuration

- [x] Run the new lint command and make only ESLint-configuration or minimal source adjustments needed for a clean, useful baseline.
  - [x] Files: `eslint.config.js`, `package.json`, `package-lock.json`; source files under `src/**/*.ts` and `src/**/*.vue` only if required by correctness-oriented lint findings.
  - [x] Expected behavior: `npm run lint` executes without config/parser errors and reports either zero issues or a small set of intentional, documented follow-up findings.
  - [x] Preferred validation order: run `npm run lint`; if parser/config errors appear, fix `eslint.config.js`; if many noisy rule violations appear, tune rules before editing source.
  - [x] Do not run or add tests for this task; `npm run typecheck` may be used as a non-test safety check only if source changes are made.
  - [x] Logging requirements: keep command output visible in terminal; no runtime logs.
  - [x] Dependencies: depends on Phase 4.

## Acceptance Criteria

- [x] `package.json` contains `lint` and `lint:fix` scripts.
- [x] `package.json` and `package-lock.json` include the ESLint/Vue/TypeScript linting dev dependencies.
- [x] `eslint.config.js` uses flat config and supports both `.ts` and `.vue` files.
- [x] ESLint config ignores dependency/build/generated output directories.
- [x] Rules are aligned with the current Vue 3 + TypeScript structure and avoid unrelated formatting churn.
- [x] `npm run lint` runs successfully without ESLint config or parser errors.
- [x] No documentation files or test files are added or modified for this task.

## Commit Plan

- [x] Single commit after implementation: `chore: configure eslint for vue typescript`

## Notes for Implementer

- [x] Rework 2026-07-07: removed `.git/info/exclude` mask and deleted the suspicious shell-like `public/images" && cp ...` public asset path flagged by review gate `9f8260770101`.
- [x] Keep the implementation focused on ESLint; roadmap items for Prettier, pre-commit hooks, CI, and broader lint fixes are separate tasks.
- [x] Prefer rule tuning over large source rewrites for the initial baseline; the goal is a maintainable lint setup that fits the current codebase.
- [x] If dependency versions resolve to newer major versions, follow the current flat config APIs from the installed packages rather than legacy `.eslintrc` patterns.
- [x] Rework 2026-07-07: reverted unintended executable-bit changes and `.gitignore` line-ending churn flagged by review gate `f92ec144e597`.
- [x] Rework 2026-07-07: removed remaining unintended executable-bit changes from affected `src/**` files flagged by review gate `fe66688da4ff`.
- [x] Rework 2026-07-07: reverted review gate `afb214fc481e` executable-bit changes outside `src/**` and cleared review gate `e98068d90eec` public asset status noise.
