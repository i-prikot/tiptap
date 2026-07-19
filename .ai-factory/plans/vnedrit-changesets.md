<!-- handoff:task:a461d22f-3a6d-45d6-9c51-b025a81670aa -->
# Implementation Plan: Внедрить Changesets

Branch: `main`
Created: 2026-07-17
Mode: fast (Autonomous Handoff)

## Goal

Подключить Changesets как единый источник semver-версий и package-level
changelog для публикуемых пакетов монорепозитория: `@i-prikot/editor-schema`,
`@i-prikot/editor` и `@i-prikot/renderer`. Изменения, затрагивающие любой из этих
взаимозависимых пакетов, должны выпускаться в согласованной общей версии,
которая остаётся совместимой с будущей публикацией по тегу `v<version>`.

## Settings

- [ ] Testing: no — explicitly disabled by the handoff task; do not add, modify, or run test cases.
- [ ] Logging: verbose release-tooling diagnostics; do not add application runtime logging because scope is package metadata and CI only.
- [ ] Docs: no — do not add user/developer documentation tasks or a documentation checkpoint. Generated package `CHANGELOG.md` files are an explicit release artifact, not documentation work.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped for Autonomous Handoff mode; this focused plan must not
modify the roadmap artifact.

## Constraints

- [ ] Keep the root workspace and `@i-prikot/playground` private and excluded from release versioning and publication.
- [ ] Treat `@i-prikot/editor-schema`, `@i-prikot/editor`, and `@i-prikot/renderer` as one fixed Changesets group so their versions are always identical; this preserves the release-tag consistency contract from `.ai-factory/plans/nastroit-publikatsiyu-v-privatnyy-registry.md`.
- [ ] Generate changelog entries through the Changesets built-in changelog generator; do not introduce a separate changelog library or hand-maintained release-note process.
- [ ] Use `main` as the Changesets base branch and leave all existing CI quality jobs in `.github/workflows/ci.yml` unchanged.
- [ ] The Changesets workflow creates or updates a version PR only. It must not publish packages, create tags, or require package-write credentials; publication remains the responsibility of the dedicated tag-based publish workflow planned separately.
- [ ] Do not commit credentials, tokens, or registry auth configuration as part of this task.

## Tasks

### Phase 1 — Install and configure the release engine

- [ ] **Task 1: Add the Changesets CLI and root release-management commands.**
  - [ ] Files: `package.json`, `package-lock.json`.
  - [ ] Install `@changesets/cli` as a root development dependency using npm so the lockfile is reproducible.
  - [ ] Add explicit root scripts for creating a changeset, inspecting pending release status, and applying version/changelog updates (for example `changeset`, `changeset:status`, and `version:packages`). Keep the existing workspace build, lint, typecheck, test, and publish-related scripts unchanged.
  - [ ] Expected behavior: a contributor can add a semver change declaration locally; CI can determine whether a release is pending; a controlled versioning step updates package versions, internal dependency ranges, lockfile, and generated changelogs.
  - [ ] Logging: do not add runtime logs. Preserve npm/Changesets command output; use `INFO` for install and command boundaries, `DEBUG` only for package/version lists, and `ERROR` with the failing command status while never printing environment secrets.
  - [ ] Dependencies: none.

- [ ] **Task 2: Add deterministic Changesets configuration for the publishable package set.**
  - [ ] Files: `.changeset/config.json`.
  - [ ] Configure the base branch as `main`, the default built-in Changesets changelog generator, and non-committing behavior so version-PR commits are controlled by the GitHub action.
  - [ ] Configure a `fixed` group containing exactly `@i-prikot/editor-schema`, `@i-prikot/editor`, and `@i-prikot/renderer`; leave the `linked` group empty. Configure internal dependency propagation at patch level so dependency metadata remains release-compatible even when future package topology changes.
  - [ ] Exclude `@i-prikot/playground` from Changesets processing and configure private-package behavior deliberately so the three libraries can receive version/changelog updates during the transition to the separate GitHub Packages publication setup, while no private package is tagged or published by Changesets.
  - [ ] Expected behavior: a changeset requesting any semver bump for one library causes all three library packages to receive the same resulting version and package changelog update; the application workspace never appears in the release set.
  - [ ] Logging: configuration has no runtime logging. At `INFO`, report the fixed group and excluded workspace; at `DEBUG`, show only package names and calculated versions; at `ERROR`, stop on an unknown package, an incomplete fixed group, or an attempted playground release.
  - [ ] Dependencies: Task 1.

### Phase 2 — Automate version pull requests

- [ ] **Task 3: Add a least-privilege Changesets version-PR workflow.**
  - [ ] Files: `.github/workflows/changesets.yml`.
  - [ ] Trigger a dedicated workflow on pushes to `main` and manual dispatch. Install dependencies with `npm ci`, then run `changesets/action@v1` with the root versioning script so it creates or updates one release/version PR when pending changesets exist.
  - [ ] Grant only the permissions required to update repository contents and pull requests; authenticate the action with the repository `GITHUB_TOKEN`. Do not grant `packages: write`, do not set `NODE_AUTH_TOKEN`, and do not call `npm publish` or push a release tag.
  - [ ] Add concurrency for the release-PR lifecycle so overlapping pushes do not race to create divergent version PRs. Keep the workflow independent from `.github/workflows/ci.yml` and preserve CI's read-only permissions.
  - [ ] Expected behavior: merged feature changesets on `main` produce one maintainable version PR containing synchronized manifest versions, refreshed internal dependency ranges, `package-lock.json`, and generated per-package `CHANGELOG.md` entries. With no pending changesets, the workflow exits without creating a publish operation.
  - [ ] Logging: workflow step names must identify checkout, dependency installation, Changesets status/version processing, and PR update boundaries at `INFO`; retain package/version details only in `DEBUG`-style command output; report the failed step and exit status at `ERROR`; never echo tokens.
  - [ ] Dependencies: Tasks 1 and 2.

### Phase 3 — Validate the release contract without tests

- [ ] **Task 4: Statically validate the Changesets integration and release boundaries.**
  - [ ] Files: inspect `package.json`, `package-lock.json`, `.changeset/config.json`, `.github/workflows/changesets.yml`, and the three package manifests; modify only these planned files if validation reveals a configuration defect.
  - [ ] Run the new pending-release status command and inspect its output for an empty baseline; run a non-mutating CLI help/configuration check as needed. Do not create a synthetic changeset, execute `changeset version`, run `npm test`, or alter existing test files.
  - [ ] Statically verify that the fixed group contains exactly the three library packages, `@i-prikot/playground` is excluded, generated changelog support is enabled, root/app packages remain outside publication, and the workflow has repository/PR permissions only with no package publication command or credential.
  - [ ] Confirm that the planned tag-based publishing flow can continue to validate one shared `v<version>` across the same three packages after its separate implementation; record any mismatch as a release blocker rather than weakening the fixed-version rule.
  - [ ] Logging: retain command and static-review output as implementation evidence; emit `INFO` summaries for each gate, `DEBUG` only for package names/versions, and `ERROR` identifying the unsafe configuration or failed command. Never log tokens or package archive contents.
  - [ ] Dependencies: Task 3.

## Validation Criteria

- [ ] `@changesets/cli` is lockfile-pinned at the workspace root, with clear npm scripts for authoring, inspecting, and applying release changes.
- [ ] `.changeset/config.json` makes schema, editor, and renderer a single fixed version group, excludes the playground, uses `main`, and enables generated package changelogs.
- [ ] A valid changeset for any release package resolves to identical semver versions and changelog updates for all three library packages.
- [ ] `.github/workflows/changesets.yml` creates/updates a version PR only; it never publishes packages, creates tags, or receives package-write credentials.
- [ ] No automated tests or test files are added, modified, or run, and no separate documentation work is introduced.

## Risks and Mitigations

- [ ] **Fixed-group over-release:** every release-package change bumps all three packages by design; retain this rule because the existing tag-based publisher requires a shared version.
- [ ] **Premature publication:** keep Changesets limited to version PR creation and retain package publishing in the separate protected tag workflow.
- [ ] **Private-package transition:** make the `privatePackages` behavior explicit so version/changelog generation remains predictable until the registry-publication plan removes `private` from the three library manifests.
- [ ] **Release PR races:** use a workflow concurrency key and a single action-managed version PR instead of allowing each push to produce independent version commits.

## Implementation Handoff

- [ ] Implement tasks strictly in phase order; the workflow must consume finalized scripts and `.changeset/config.json` from Phases 1–2.
- [ ] When shipping a consumer-visible change later, add a short `.changeset/<unique-name>.md` that names the affected library package and its required semver level; do not add a changeset for root-only or playground-only changes.
- [ ] Merge the action-created version PR before creating the matching `v<version>` tag in the separate registry-publication process.
