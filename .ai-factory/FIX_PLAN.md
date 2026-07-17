<!-- handoff:task:9f348eb1-3938-4c0e-bdce-742ca06a5928 -->

# Fix Plan: Make npm prepare cross-platform

**Problem:** `npm install` fails on Windows at the root `prepare` lifecycle script because it uses POSIX shell syntax (`if [ ... ]`, `${NODE_ENV:-}`, and `command -v`) while npm invokes that script through `cmd.exe`.
**Created:** 2026-07-17 03:37 UTC

## Analysis

What was found during investigation:

- Root cause: `package.json` currently defines `prepare` as `if [ "${NODE_ENV:-}" != "production" ] && command -v husky >/dev/null 2>&1; then husky; fi`. The shell expression is valid for POSIX shells but cannot be parsed by Windows `cmd.exe`, producing the reported error before Husky can run.
- Affected entry point: the root workspace `prepare` script in `package.json`. It runs automatically at the end of local `npm install`.
- Husky is already a root dev dependency (`husky` 9.1.7), and `.husky/pre-commit` already contains the expected pre-commit command. The defect is lifecycle invocation portability, not a missing hook configuration.
- The current guard intentionally avoids failing production installs or installs where dev dependencies (including Husky) are absent. Replacing the command with an unconditional `husky` command would restore Windows compatibility but could regress that safeguard.
- The worktree contains unrelated, in-progress workspace migration changes. The fix must not alter them beyond the lifecycle files required for this issue.

## Fix Steps

- [x] Add a small CommonJS Node lifecycle helper under `scripts/` that replaces shell-specific environment checks with `process.env` checks, exits successfully for production installs, and resolves the local Husky executable only when it is available.
- [x] Have the helper launch Husky through the current Node executable rather than relying on a shell command, propagate Husky's non-zero exit status, and emit context-gated `[FIX:prepare]` diagnostics for skip, success, and error paths without adding normal-install noise.
- [x] Change the root `prepare` script in `package.json` to invoke the Node helper so npm uses the same portable command on Windows, macOS, and Linux.
- [x] Add a focused Vitest test that runs the helper in child processes and verifies: production mode skips successfully, `HUSKY=0` development mode completes without mutating hooks, and a Husky launch failure is surfaced with the `[FIX:prepare]` error context.
- [x] Verify the new lifecycle command with `npm run prepare` and the focused Vitest test. Confirm that the package JSON stays valid and that no unrelated workspace-migration changes are modified.

## Files to Modify

- [x] `package.json` — replace the POSIX-only `prepare` command with a portable Node helper invocation.
- [x] `scripts/prepare-husky.cjs` — add the cross-platform Husky lifecycle wrapper and context-gated `[FIX:prepare]` logging.
- [x] `test/scripts/prepare-husky.test.ts` — cover lifecycle skip and failure-handling behavior through child-process execution.
- [x] `test/setup.ts` — make shared test cleanup safe for the Node-environment lifecycle test.

## Risks & Considerations

- Preserve the existing behavior for `NODE_ENV=production` and absent dev dependencies; production installs must not fail merely because Husky is unavailable.
- Keep the helper in `.cjs`, because the root package is configured as ESM and this script needs straightforward CommonJS execution from npm and tests.
- Do not run a full `npm install` as the primary verification in this dirty migration worktree; it could rewrite the lockfile or obscure the narrowly scoped fix. The final handoff should include a manual Windows `npm install` confirmation.
- Husky's own `HUSKY=0` convention should remain honored so CI and hook-disabled environments can bypass hook installation safely.

## Test Coverage

- [x] Assert that `NODE_ENV=production` exits with code 0 even when Husky is not executed.
- [x] Assert that the development path can invoke the installed Husky CLI with `HUSKY=0` and exits with code 0 on a valid repository.
- [x] Assert that a forced Husky invocation error exits non-zero and includes the `[FIX:prepare]` error diagnostic when debug logging is enabled.
- [ ] Manually verify on Windows PowerShell: run `npm install` in the project root and confirm no `cmd.exe` parsing error appears at the `prepare` stage.

## Validation

- GREEN: `npm exec vitest run test/scripts/prepare-husky.test.ts` — 3 tests passed.
- GREEN: `npm run prepare` — completed successfully with no `.husky` changes.
- GREEN: `node --check scripts/prepare-husky.cjs` and JSON parsing for `package.json` passed.
- Pending manual verification: run `npm install` in Windows PowerShell and confirm the `prepare` lifecycle no longer reports a `cmd.exe` parsing error.
