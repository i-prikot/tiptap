<!-- handoff:task:5415704d-5806-4f97-a845-dcbce80d8a67 -->

# Fix Plan: Allow the shared logger sink to safely ignore console failures

**Problem:** The pre-commit hook fails because ESLint reports `no-empty` at `packages/schema/src/utils/logger.ts:39`. The empty `catch` currently suppresses exceptions thrown while forwarding a message to the host console.  
**Created:** 2026-07-24 05:01 UTC

## Analysis

- `writeLog` is the dedicated direct-console sink for the shared browser-safe logger; `eslint.config.js` explicitly permits console access only in this file.
- Calling a console method can throw in constrained or instrumented runtimes. The logger must not propagate that failure to application code.
- The `catch {}` at line 39 intentionally swallows this non-critical sink failure, but violates ESLint's `no-empty` rule and blocks all staged changes from committing.
- The logger is newly introduced and has no existing targeted test. The repository's Vitest configuration discovers `*.test.ts` files under `test/`.

## Fix Steps

- [x] Add a failing Vitest regression test under `test/schema/utils/` that replaces a console method with a throwing implementation, invokes the corresponding namespaced logger method, and asserts the caller does not receive an exception. Restore the console spy after the test.
- [x] Replace the empty `catch` body in `writeLog` with an explicit no-op return so the intentional failure isolation remains clear and passes `no-empty`; do not change log-level filtering, namespaces, or the public logger API.
- [x] Run the targeted logger test, ESLint against `packages/schema/src/utils/logger.ts`, and `npm run typecheck`.
- [x] Stage the intended files and re-run the pre-commit command to confirm lint-staged no longer blocks the commit.

## Files to Modify

- [x] Modify `packages/schema/src/utils/logger.ts` to make the intentional console-sink error suppression non-empty without changing observable logger behavior.
- [x] Add `test/schema/utils/logger.test.ts` with regression coverage proving logger calls remain safe when the host console method throws.

## Risks & Considerations

- Do not remove the `try`/`catch` or surface console errors: logging must never break editor or schema execution.
- Do not add `[FIX]` diagnostics inside `writeLog`; that would recurse through the failing console sink and violate the logger's silent-failure contract.
- Keep the ESLint exception narrowly scoped to the logger sink; no lint configuration change is necessary for this defect.
- Ensure the test restores the mocked console method so unrelated tests retain normal logging behavior.

## Test Coverage

- [x] Verify `createLogger('test').warn(...)` does not throw when `console.warn` throws.
- [x] Retain a normal-path assertion that the logger forwards a namespaced message and metadata when the console method succeeds.
- [x] Run `npx vitest run test/schema/utils/logger.test.ts`, `npx eslint packages/schema/src/utils/logger.ts --no-fix`, and `npm run typecheck` before retrying the commit.
