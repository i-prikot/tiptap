# Dependency Update Policy

Renovate manages npm dependency updates for the root `package.json`, every npm
workspace manifest, and the root `package-lock.json`. It creates the
**Dependency Dashboard** and labels update pull requests with `dependencies`.
Automerge is disabled for every update: the dashboard, Renovate pull request,
CI result, and any Changeset together form the review and release record.

## Renovate workflow

1. The maintainer responsible for dependency maintenance triages the
   Dependency Dashboard on a regular review cadence.
2. Review patch and minor update pull requests through the normal CI gates,
   then merge only after those gates pass.
3. Treat major updates as compatibility changes. Before merging, explicitly
   review upstream migration guidance, the package boundary, host-application
   compatibility, and any required release notes.
4. Add a Changeset before releasing a dependency-driven public-package change.
   The Changeset must describe host migration work when the change affects a
   peer dependency or the editor's public behavior.

## Coordinated Tiptap updates

All direct `@tiptap/*` entries are one dependency family. Renovate groups their
updates from the following workspace manifests into one non-automerge pull
request and replaces each declared range with the selected target range:

- `packages/editor/package.json`
- `packages/schema/package.json`
- `packages/renderer/package.json`
- `apps/playground/package.json`

This includes normal, development, and peer dependencies. Do not split a
Tiptap major migration into package-specific or dependency-type-specific pull
requests. Review and merge the family only when every affected direct
dependency targets the same chosen release line.

The current lower-bound difference between the `3.27.x` declarations in the
editor, schema, and playground packages and the `3.28.x` renderer declaration
is intentional for this setup. Do not make a standalone bulk upgrade to erase
it; the next grouped Renovate pull request establishes the reviewed common
target.

## Editor host peer contract

`@i-prikot/editor` relies on the consuming application to provide Vue and its
editor-facing `@tiptap/*` packages. Those modules must remain in
`peerDependencies`; their matching `devDependencies` are the local-build and
CI validation mirrors.

For each host-supplied package:

- Use a verified baseline-to-next-major range such as `^3.27.1`, equivalent to
  `>=3.27.1 <4.0.0`.
- Keep the peer range byte-for-byte identical to its matching development
  range, including Vue.
- Never use `*`, an unbounded `>=` range, or a range spanning multiple majors.

After validating a new Vue or Tiptap major, update every related peer and
matching development range together. Document host migration requirements,
include the appropriate Changeset, and publish the resulting editor release.

`@i-prikot/editor-schema` and `@i-prikot/editor-renderer` keep their Tiptap
packages as normal implementation dependencies. Move one to a peer dependency
only if its public API starts requiring the host application to provide that
exact package.

## Required checks

Dependency update pull requests use the repository's existing CI gates:

- `npm ci`
- locale validation, typecheck, lint, coverage, and build
- `npm run test:release-verifiers` when the pull request carries Renovate's
  `dependencies` label
- end-to-end smoke coverage

Changeset version pull requests also run `npm ci`, typecheck, lint, and build.
Run `npm run test:release-verifiers` before a release when applicable if the
Changeset pull request is not also a dependency-update pull request.

Do not add a separate dependency-update test suite. Renovate reports
configuration failures in its existing check output; resolve those failures
before relying on the dashboard or merging update pull requests.
