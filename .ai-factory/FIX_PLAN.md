<!-- handoff:task:5ab697b3-532c-4dfc-9638-bd5f0240d4b2 -->

# Fix Plan: Restore ESLint pre-commit compatibility

**Problem:** The pre-commit hook fails before linting with `TypeError: expand is not a function` while ESLint resolves flat-config file patterns.  
**Created:** 2026-07-28 04:48 UTC

## Analysis

The failure is a transitive dependency API mismatch introduced by the current root-level `brace-expansion` override:

- `package.json` overrides `brace-expansion` to `5.0.8`; this override is present in the index and working tree, but not in `HEAD`.
- ESLint `9.39.5` and `@eslint/config-array` `0.21.2` resolve `minimatch@3.1.5`, which declares `brace-expansion@^1.1.7` and invokes its CommonJS export directly as a function.
- The global override instead installs `brace-expansion@5.0.8`, whose CommonJS export is an object with an `expand` property. Calling that object reproduces the reported `expand is not a function` error.
- The override also forces `5.0.8` into other `minimatch` major versions, so retaining it as a global override risks further incompatible dependency resolution.

Impact is limited to tooling that loads ESLint configuration or other packages that resolve legacy `minimatch`; application runtime behavior is not affected.

## Fix Steps

- [x] Remove only the global `brace-expansion: "5.0.8"` entry from the root `overrides` block in `package.json`, retaining the existing `glob: "13.0.6"` override and all unrelated staged changes.
- [x] Regenerate `package-lock.json` with `npm install --package-lock-only --ignore-scripts` so legacy `minimatch@3` resolves a compatible `brace-expansion@1.x`, while packages requiring newer APIs retain their own compatible nested versions.
- [x] Inspect `npm ls minimatch brace-expansion --all` to confirm the dependency tree has no invalid or overridden peer/dependency relationships and that the root legacy `minimatch` no longer receives `brace-expansion@5`.
- [ ] Run the focused ESLint reproduction against `eslint.config.js`, then run the actual staged-file pre-commit path (`npx lint-staged --concurrent 1`) and `npm run typecheck` to verify the commit hook proceeds past configuration loading.
- [x] Preserve the existing line-ending convention while updating manifest and lockfile metadata, avoiding an all-file diff caused solely by CRLF/LF normalization.

## Files to Modify

- `package.json` — remove the incompatible global `brace-expansion` override only.
- `package-lock.json` — record npm’s compatible transitive dependency resolution without unrelated lockfile churn.

## Risks & Considerations

- The override may have been added to address a dependency advisory. Before removal, check the relevant security requirement and replace it only with a dependency-scoped compatible override if an advisory mandates a version floor.
- Do not pin `brace-expansion@5` beneath `minimatch@3`; that version expects the legacy callable CommonJS export.
- The repository currently has many staged and unstaged edits. Restrict the fix to semantic changes in the two dependency files and do not modify user work.
- This is a build-tool dependency correction, so runtime `[FIX]` application logging is not appropriate. The dependency-tree and pre-commit command output provide the required diagnostics for validation.

## Test Coverage

- [x] Add or document a lightweight dependency-compatibility regression check if this repository has an established tooling-test location; it should load the ESLint flat config and assert the command exits successfully.
- [ ] Exercise the regression with `npx eslint --no-error-on-unmatched-pattern eslint.config.js` and the complete `lint-staged` pre-commit command.
- [x] Verify `npm run typecheck` still succeeds after the lockfile change, since the hook runs it after linting.
