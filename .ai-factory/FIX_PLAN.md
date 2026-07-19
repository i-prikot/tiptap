<!-- handoff:task:44df6cc0-f814-42be-877b-5e3240f31d3e -->

# Fix Plan: Restore pre-commit linting for Node ESM release scripts

**Problem:** `git commit` runs `lint-staged`, which sends the staged release verifier `.mjs` files through ESLint. ESLint reports eight `no-undef` errors for Node's `process` global and exits with code 1, so Husky aborts the commit.
**Created:** 2026-07-19 02:57 UTC

## Analysis

- Reproduced the failure with `npx eslint scripts/verify-publish-artifacts.mjs scripts/verify-publish-tag.mjs`: it exits with code 1 and reports the same eight `process is not defined` errors from the commit hook.
- `eslint.config.js` provides `globals.node` only for `scripts/**/*.cjs` in the `project/node-commonjs-scripts` override. The failing files are ESM scripts (`scripts/**/*.mjs`), so they inherit no Node globals.
- `lint-staged` correctly includes `.mjs` files. The remaining two `console.log` messages are `no-console` warnings, not errors, and do not cause ESLint to fail the pre-commit hook.
- The release verifier scripts already have structured `DEBUG`/`INFO`/`ERROR` logging. This lint-configuration fix should preserve that behavior rather than add unrelated runtime diagnostics.

## Rework Requirements (2026-07-19)

- [x] Stage `eslint.config.js` so the `project/node-esm-scripts` override is included in the next commit.
- [x] Require a separate, credential-free authorization job in `.github/workflows/publish.yml` to fail closed unless `tinyfy-private-package-publish` has at least one `required_reviewers` protection rule.
- [x] Verify that the authorization job runs before the environment-scoped publishing job and that the ESLint override remains staged.

## Fix Steps

- [x] Add a dedicated ESM Node-script override in `eslint.config.js` for `scripts/**/*.mjs`, setting `sourceType: 'module'` and `globals: globals.node` so standard Node APIs such as `process` are recognized.
- [x] Keep the existing CommonJS override limited to `scripts/**/*.cjs`, preserving its `sourceType: 'commonjs'` and `@typescript-eslint/no-require-imports` exception.
- [x] Leave the project-wide `no-console` policy unchanged: the verifier scripts may continue to emit the two existing informational warnings, which do not block commits, while accidental console calls elsewhere remain visible.
- [ ] Verify the targeted release scripts lint with zero errors and exit code 0, then run the pre-commit command against the current staged set before retrying the commit.

## Files to Modify

- [x] Modify `eslint.config.js` to define Node ESM language options for release-verifier `.mjs` scripts.

## Risks & Considerations

- Do not apply Node globals globally; browser-targeted Vue and TypeScript source must keep its current environment to avoid concealing browser/server boundary mistakes.
- Do not convert the scripts to CommonJS or change their logging implementation; both would expand scope beyond restoring the existing pre-commit check.
- The "Multiple projects found" message is a performance/configuration warning from the TypeScript import resolver, not the cause of the nonzero ESLint exit. It should remain out of this minimal fix unless it becomes a separate performance task.
- Existing staged changes are extensive. Validation must avoid unintentionally modifying unrelated files before the user retries `git commit`.

## Test Coverage

- [x] Capture RED evidence by running `npx eslint scripts/verify-publish-artifacts.mjs scripts/verify-publish-tag.mjs`; confirm it currently reports 8 errors and exits with code 1.
- [x] Run the GREEN check by rerunning the same command after the configuration change; it must exit with code 0 and report no `no-undef` errors for `process`.
- [ ] Run the hook-level regression check with `npm run precommit` (or retry the original commit command) while the verifier scripts are staged; it must pass ESLint and continue to type checking.
- No application unit test is needed for this ESLint-only configuration change; the targeted ESLint invocation is the direct regression test.
