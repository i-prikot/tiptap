<!-- handoff:task:6128b8cc-12a0-47cb-9beb-dd2ca76d18f2 -->
# Implementation Plan: Настроить публикацию в приватный registry

Branch: `main`
Created: 2026-07-17
Mode: fast (Autonomous Handoff)

## Goal

Настроить публикацию трёх библиотечных workspace-пакетов в GitHub Packages как
приватный npm registry: `@i-prikot/editor-schema`, `@i-prikot/editor` и
`@i-prikot/renderer`. Пакеты должны сохранять существующие имена и публичные
export maps, публиковаться в порядке зависимостей по version tag, а CI должен
получать краткоживущий `GITHUB_TOKEN` с минимально необходимым правом
`packages: write` без записи токенов в репозиторий.

Текущий remote и целевой package scope принадлежат `i-prikot`: публикация
должна использовать только `@i-prikot/*`. Имя `TINYFY_PACKAGES_TOKEN` —
существующее имя GitHub secret, а не инструкция вернуть прежний npm scope.
Ни один будущий шаг не должен восстанавливать `@tinyfy/*` в manifest-файлах,
импортах, `.npmrc`, release verifier-ах или workflow; старый scope допустим
только как отрицательный тестовый пример.

## Settings

- [x] Testing: no — explicitly disabled by the handoff task; do not add or modify test cases.
- [x] Logging: verbose implementation diagnostics; do not add runtime logging because changes affect package metadata and CI only.
- [x] Docs: no — do not create documentation tasks or a documentation checkpoint.

## Roadmap Linkage

Milestone: "none"

Rationale: skipped for Autonomous Handoff mode; the plan implements one
focused registry-publication item without changing the roadmap artifact.

## Constraints

- [x] Use GitHub Packages npm endpoint `https://npm.pkg.github.com` only for the `@i-prikot` scope; leave the default npmjs registry available for all unscoped and third-party dependencies.
- [x] Retain exact package names `@i-prikot/editor-schema`, `@i-prikot/editor`, and `@i-prikot/renderer`; they already satisfy the target consumer contract.
- [x] Do not commit an npm access token, a `:_authToken` line, or a GitHub personal access token. Local publishing must rely on a developer-provided environment/user credential, and CI receives `NODE_AUTH_TOKEN` from the owner-managed `TINYFY_PACKAGES_TOKEN` secret only in its final publish step.
- [x] Keep the workspace root private and unpublished; only the three packages under `packages/` become publishable.
- [x] Publish schema before editor and renderer, because both consumers depend on `@i-prikot/editor-schema` at the release version.
- [x] Do not add changesets, version-bumping automation, release notes, tests, or documentation; those are separate roadmap work.

## Tasks

### Phase 1: Make package metadata publishable

- [x] **Task 1: Declare the GitHub Packages publication contract for all library packages.**
  - [x] Files: `packages/schema/package.json`, `packages/editor/package.json`, `packages/renderer/package.json`, `package-lock.json`.
  - [x] Remove `private: true` from exactly these three package manifests so npm can publish them; retain root `package.json` as `private: true` and do not alter the playground package.
  - [x] Add `publishConfig.registry: "https://npm.pkg.github.com"` to each publishable package. Keep their existing `name`, `version`, `exports`, `files`, dependency classifications, and package-specific build commands unchanged.
  - [x] Confirm `package-lock.json` requires no registry-publication metadata update. The previous concurrent dependency-resolution changes were removed, leaving no task-specific lockfile diff.
  - [ ] Before merging, remotely verify that `TINYFY_PACKAGES_TOKEN` is stored as a secret of the protected `tinyfy-private-package-publish` GitHub Environment and can write private `@i-prikot/*` packages for `i-prikot/tiptap`.
    **BLOCKED (rechecked 2026-07-18):** The repository cannot inspect GitHub Environment settings: `gh` is unavailable and no owner credential is present. An `i-prikot` release maintainer must confirm the environment secret and its package-write permission before creating a release tag; no cross-organization package authorization is required.
  - [x] **Logging:** print `INFO` lines naming each manifest whose publication contract was updated; use `DEBUG` diagnostics to compare the three names, versions, `private` flags, and registry URLs; emit `ERROR` with the affected scope/repository relationship if the GitHub ownership prerequisite is not satisfied. Do not add runtime logs.

### Phase 2: Configure scoped registry access without secrets

- [x] **Task 2: Add a repository-safe npm scope mapping for consumers and release tooling.**
  - [x] Files: `.npmrc`.
  - [x] Create the committed `.npmrc` with only `@i-prikot:registry=https://npm.pkg.github.com` so installs and publishes of the internal scope resolve to GitHub Packages while all other packages continue to use npmjs.
  - [x] Do not add `//npm.pkg.github.com/:_authToken=...`, `always-auth` with a literal token, or any personal credential. The committed file must remain safe to clone and must not override the global registry for unscoped packages.
  - [x] Confirm `.gitignore` does not need a new exception and that local authentication is supplied outside the repository through npm user configuration or `NODE_AUTH_TOKEN`.
  - [x] **Logging:** report the scoped registry mapping at `INFO`; use `DEBUG` output to show that no auth-token keys are present; classify any detected token-shaped value in `.npmrc` as `ERROR` and remove it before completion. Do not emit secrets in command output.

### Phase 3: Publish from CI on an explicit release tag

- [x] **Task 3: Add a least-privilege GitHub Actions publishing workflow with release consistency checks.**
  - [x] Files: `.github/workflows/prepare-publish-artifacts.yml`, `.github/workflows/publish.yml`, `scripts/verify-publish-tag.mjs`, `scripts/verify-publish-artifacts.mjs`.
  - [x] A dedicated `v*` tag workflow builds and packs the three release archives on an untrusted runner with no package-write credential. A separate `workflow_run` publishing workflow runs trusted tooling from the default branch on a fresh runner. Keep `.github/workflows/ci.yml` focused on pull-request quality checks; do not grant its jobs package-write permission.
  - [x] The artifact-preparation workflow has only `contents: read`; its checkout fetches full history and fails unless the release tag SHA is reachable from the protected default branch. The publishing workflow has `contents: read` and `actions: read`, checks the successful source run, source repository, and `v*` tag before downloading that run's artifacts; it checks out only the default branch with `persist-credentials: false` and sets up Node 22 without an auth config. The untrusted install sets `HUSKY=0` so local Git-hook setup cannot affect the release runner. `TINYFY_PACKAGES_TOKEN` is passed as `NODE_AUTH_TOKEN` only in the final publish step, after trusted validation. That step writes a temporary npm config that explicitly maps `@i-prikot` to `https://npm.pkg.github.com`, publishes from an empty directory, and removes the config afterward.
  - [x] Implement `scripts/verify-publish-tag.mjs` to fail before publishing unless the tag is `v<version>`, all three target package versions equal `<version>`, their names are exactly the expected `@i-prikot/*` names, and none remains private. Keep the script dependency-free and do not print credential environment variables.
  - [x] The untrusted workflow installs with `npm ci`, runs the existing workspace build and release-consistency script, then creates three `npm pack --ignore-scripts` archives in dependency order. The trusted workflow validates the archive filenames and embedded manifests against the triggering tag and publishes those exact archives in this order: `@i-prikot/editor-schema`, `@i-prikot/editor`, `@i-prikot/renderer`. Every `npm publish` uses `--ignore-scripts` and an explicit GitHub Packages registry; it never runs package scripts, checks out the tag, or publishes the root workspace/playground while the package-write credential is available.
  - [x] Add workflow concurrency scoped to the tag/ref so two releases cannot publish the same version concurrently. A re-run must fail safely if GitHub Packages rejects an already-existing immutable version rather than attempting to overwrite it.
  - [x] **Logging:** use `INFO` for checkout, build completion, packing, trusted artifact verification, and each package publication boundary; use `DEBUG` only for package names, versions, and archive names; emit `ERROR` with the failing package and command status on build, packing, validation, authentication, or publish failure. Mask tokens and never log `NODE_AUTH_TOKEN`.

### Phase 4: Validate distributable artifacts and release readiness

- [ ] **Task 4: Verify the publish set before creating the first release tag.**
  - [x] Files: inspect `.npmrc`, `packages/schema/package.json`, `packages/editor/package.json`, `packages/renderer/package.json`, `package-lock.json`, `scripts/verify-publish-tag.mjs`, `scripts/verify-publish-artifacts.mjs`, `.github/workflows/prepare-publish-artifacts.yml`, `.github/workflows/publish.yml`; modify only these files if validation exposes a configuration defect.
  - [x] Run `npm ci`, `npm run build`, and `node scripts/verify-publish-tag.mjs v<shared-package-version>` against the shared version presently declared in the three package manifests. Do not run or add tests because tests are explicitly out of scope.
    **VERIFIED (2026-07-18):** The current lockfile passes `npm ci --ignore-scripts --dry-run`; a release-equivalent `env -u NODE_ENV HUSKY=0 npm ci`, full `npm run build`, and `LOG_LEVEL=debug node scripts/verify-publish-tag.mjs v0.1.0` all complete successfully. `HUSKY=0` matches the isolated CI install, while unsetting this environment's production-only `NODE_ENV` ensures build-time dev dependencies are installed as they are on GitHub Actions.
  - [x] Run `npm pack --dry-run` separately for all three workspaces and verify their archives contain only declared distributable assets (`dist/**` plus the renderer's explicitly exported CSS), exclude workspace/application sources, and preserve the published names and export maps.
  - [x] Inspect the workflow YAML statically to confirm checkout does not persist credentials, `GITHUB_TOKEN` has no package-write permission, `TINYFY_PACKAGES_TOKEN` is referenced only as `NODE_AUTH_TOKEN` in the final publish step, and the release trigger is a `v*` tag.
  - [ ] Perform the first real publish only after the protected environment's secret and reviewer configuration is confirmed; verify in GitHub Packages that all three `@i-prikot/*` packages are private and linked to `i-prikot/tiptap`. Do not add documentation as part of this task.
    **BLOCKED (rechecked 2026-07-18):** Do not create a release tag or publish until an `i-prikot` release maintainer confirms that `TINYFY_PACKAGES_TOKEN` is available only through `tinyfy-private-package-publish` and can publish all three `@i-prikot` packages.
  - [x] **Logging:** retain verbose command output as implementation evidence; print `INFO` summaries for each archive and workflow gate; use `DEBUG` for archive file lists and version comparison; emit `ERROR` with the package name and missing/unsafe property for any preflight failure. Never include tokens in validation logs.

## Completion Criteria

- [x] The three library packages retain their current `@i-prikot/*` names, are no longer marked private, and each publishes to `https://npm.pkg.github.com`.
- [x] A committed `.npmrc` maps only the `@i-prikot` scope to GitHub Packages and contains no credentials.
- [ ] A `v<shared-version>` tag runs a dedicated Node 22 build workflow with only `contents: read` and fails unless its commit is reachable from the protected default branch; the publishing workflow runs separately from the default branch with `contents: read` and `actions: read`, does not check out the tag, and exposes an owner-managed `TINYFY_PACKAGES_TOKEN` as `NODE_AUTH_TOKEN` only after approval by the protected `tinyfy-private-package-publish` GitHub Environment.
- [x] The untrusted workflow validates tag/package-version consistency and creates three release archives; the trusted publishing workflow validates those archives, uses a generated npm config with the explicit GitHub Packages registry, and publishes schema before editor and renderer with lifecycle scripts disabled, without attempting to publish the root or playground.
- [x] `npm pack --dry-run` confirms each archive contains only its intended publishable files.
- [ ] The protected GitHub Environment requires release-maintainer approval and stores `TINYFY_PACKAGES_TOKEN` as an environment secret with write access for the three `@i-prikot/*` packages.
  **BLOCKED (rechecked 2026-07-18):** Repository files cannot verify GitHub Environment reviewers, secret scope, or tag rulesets. An `i-prikot` administrator must confirm these remote settings; cross-organization grants for `@tinyfy/*` are not part of this release contract.

### Rework: Release trust gate (2026-07-18)

- [x] **Task R1: Permit the trusted publish workflow to read the source run's artifacts.**
  - [x] Added `actions: read` alongside `contents: read` in `.github/workflows/publish.yml` for the cross-run `actions/download-artifact` invocation.
- [x] **Task R2: Reject release tags that do not originate from the protected default branch.**
  - [x] Added a full-history checkout and a `git merge-base --is-ancestor` check in `.github/workflows/prepare-publish-artifacts.yml`; no package archives are created when the tag commit is not reachable from the default branch.
- [ ] **Task R3: Verify environment-bound package credentials and approval.**
  - [ ] An `i-prikot` administrator must confirm that `tinyfy-private-package-publish` requires release-maintainer approval before a deployment may start.
  - [ ] Store `TINYFY_PACKAGES_TOKEN` only as a secret of that environment (not as a repository-level secret). The service identity must have only the package-write access required for `@i-prikot/editor-schema`, `@i-prikot/editor`, and `@i-prikot/renderer`.
  - [ ] Confirm a repository ruleset matching `v*` tags so only release maintainers may create, update, or delete them; do not add cross-organization package grants.
  - [ ] This remote GitHub configuration remains blocked in the current environment: `gh` is unavailable and no `i-prikot` administrator credential was provided.
- [x] **Task R4: Bind the secret-bearing publish job to the protected environment.**
  - [x] Added `environment: tinyfy-private-package-publish` to `.github/workflows/publish.yml`. GitHub holds environment secrets until its configured protection rules approve the job.
