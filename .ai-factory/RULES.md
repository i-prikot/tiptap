# Project Rules

## Test-Driven Development

For every new feature and refactoring change, test-driven development is
mandatory.

1. **RED:** Before changing production code, write and run a targeted test for
   the intended behavior. Its assertion must fail because the behavior is
   missing or incorrect; setup, type-checking, or unrelated failures do not
   satisfy this step.
2. **GREEN:** Make the smallest production change that makes the same relevant
   test command pass.
3. **REFACTOR:** Refactor only after the relevant tests are green, and keep
   them green throughout the refactoring. Before refactoring existing behavior,
   establish or add a behavioral test that protects that behavior.
4. **Evidence:** The implementation or pull-request summary must record the
   relevant test command and its observed RED and GREEN outcomes. A feature or
   refactoring task is not complete without this evidence.

This rule applies to new features and refactoring. Purely editorial
documentation, formatting-only, and metadata-only changes are outside its
scope.
