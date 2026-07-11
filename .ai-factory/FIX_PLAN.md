<!-- handoff:task:55414a66-731b-49e0-8f56-ee9f03dd3bfc -->

# Fix Plan: Remove deprecated npm dependencies

**Problem:** `npm install` reports deprecation warnings for `lucide-vue-next@0.468.0` and `glob@10.5.0`. The first package is deprecated in favor of `@lucide/vue`; the second is an unsupported transitive package.  
**Created:** 2026-07-11 03:11 UTC

## Analysis

What was found during investigation:

- `lucide-vue-next@0.468.0` is declared directly in `package.json` and recorded as deprecated in `package-lock.json`.
- Searches of `src/` and `test/` found no imports of `lucide-vue-next` or `@lucide/vue`; the editor uses the local `src/editor/icons` module instead. Removing the unused dependency is safer than migrating an unused API.
- `glob@10.5.0` is transitive: `@vue/test-utils@2.4.11` depends on `js-beautify`, which declares `glob@^10.4.2`. It must be resolved through an upstream compatible update or a narrowly scoped npm override, rather than adding `glob` as an application dependency.
- `package.json` and `package-lock.json` already contain user changes. The fix must preserve those changes and avoid unrelated lockfile churn.

## Fix Steps

- [x] Capture the current deprecated-package list from the lockfile and check compatible releases for `@vue/test-utils`, `js-beautify`, and `glob`, including their Node.js engine requirements.
- [x] Remove the unused direct `lucide-vue-next` dependency from `package.json` and regenerate only the corresponding `package-lock.json` entries using npm.
- [x] Update the upstream test dependency chain to a compatible supported release that no longer resolves the deprecated `glob`; if no such upstream release exists, add the smallest scoped `overrides.glob` constraint that resolves a supported compatible version, then regenerate the lockfile.
- [x] Re-check the dependency tree and lockfile deprecation metadata to confirm that neither `lucide-vue-next` nor the deprecated `glob@10.5.0` remains; record the package-manager output as install diagnostics rather than adding runtime `[FIX]` logging for this metadata-only change.
- [x] Run focused validation (`npm ci` or a clean install, `npm run typecheck`, and `npm test`) and run `npm run build` if the focused checks pass, resolving only dependency-update regressions.

## Files to Modify

- [x] Update `package.json` to remove `lucide-vue-next`; update the test dependency or add a narrowly scoped npm override only if required to eliminate transitive `glob@10.5.0`.
- [x] Regenerate `package-lock.json` lock data for the selected supported dependency graph while preserving existing user dependency updates.

## Risks & Considerations

- A `glob` major-version override can affect `js-beautify`; validate its consumer through the existing Vitest/Vue Test Utils suite before retaining an override.
- Newer dependency versions can impose stricter Node.js engine requirements; select a version compatible with the project runtime and CI.
- Do not add `@lucide/vue` unless source code actually needs it; currently no production or test imports require an icon-library migration.
- Avoid unrelated package upgrades and do not discard staged or unstaged user changes in either manifest or lockfile.

## Test Coverage

- [x] Add or retain a dependency-install verification that fails when the lockfile contains known deprecated packages introduced by this project, if the repository has an appropriate CI/package-health check location.
- [x] In a clean dependency installation, verify `npm ls lucide-vue-next glob --all` has no deprecated direct icon dependency and no `glob@10.5.0` resolution.
- [x] Run `npm run typecheck`, `npm test`, and `npm run build` to cover editor imports, Vue component compilation, and test-tooling compatibility after the dependency graph changes.
