<!-- handoff:task:019965eb-8957-487e-ab26-5f38817be84b -->
# Implementation Plan: Configure Dependency Update Automation

Branch: `main`
Created: 2026-07-28

## Settings
- [ ] Testing: no
- [ ] Logging: verbose
- [ ] Docs: no — the dependency-update policy document below is a required task deliverable; no separate post-implementation documentation checkpoint is required.

## Roadmap Linkage
Milestone: "none"
Rationale: Skipped by the autonomous Handoff default; the work corresponds to the dependency-automation item in the technical-debt milestone.

## Scope and Decisions
- [x] Use Renovate, rather than Dependabot, because its `packageRules` can group every `@tiptap/*` package across npm workspaces into one reviewable update PR.
- [x] Manage npm manifests and `package-lock.json`; keep automerge disabled for every dependency update.
- [x] Treat `@tiptap/*` as a coordinated dependency family: one grouped PR must update all matching entries in root, package, and playground manifests to a common target release line.
- [x] Preserve the current package boundary: `@i-prikot/editor` declares host-supplied Vue and editor-facing Tiptap modules as peer dependencies, while `@i-prikot/editor-schema` and `@i-prikot/editor-renderer` retain implementation dependencies.
- [x] Do not perform a bulk dependency upgrade as part of this setup. The initial Renovate PRs are the review vehicle for version changes.

## Tasks

### Phase 1: Configure the Update Bot
- [ ] **Task 1: Add a root Renovate configuration and enable repository access.**
  - [x] Create `renovate.json` with the Renovate schema, npm support for every workspace manifest and `package-lock.json`, a dependency dashboard, a dedicated `dependencies` label, a bounded open-PR rate, and explicit `automerge: false`.
  - [x] Add a package rule matching `@tiptap/**` that creates a single named group, covers `dependencies`, `devDependencies`, and `peerDependencies`, and uses a replacement range strategy so every affected range moves to the same target release. Do not split the group by package or update type; a major migration must remain one PR.
  - [x] Keep non-Tiptap npm updates reviewable in normal Renovate PRs and configure GitHub Actions updates only if the repository’s Renovate installation supports that manager without broader permissions.
  - [x] Run self-hosted Renovate from `.github/workflows/renovate.yml` on weekdays and by manual dispatch. The workflow uses a dedicated GitHub App installation token with only `contents`, `pull requests`, and `issues` write access; its own ephemeral `GITHUB_TOKEN` remains `contents: read` only.
    - `scripts/renovate-workflow-config.json` binds the runner to only `i-prikot/tiptap` and requires this repository's committed `renovate.json`, so every run reads the root lockfile and workspace manifests under the same policy.
    - `actions/create-github-app-token` exchanges `vars.RENOVATE_APP_ID` and `secrets.RENOVATE_APP_PRIVATE_KEY` for the app installation token used only by Renovate. GitHub App-created pull requests run the repository's normal `pull_request` CI workflow, including the `dependencies`-label release-verifier gate.
    - The Renovate App must not receive administration, Actions/workflow, or branch-protection-bypass permissions. Keep the repository-wide GitHub Actions pull-request-approval setting disabled and require an independent human or CODEOWNER approval in default-branch protection.
  - [x] **Logging/audit trail:** no application runtime logging applies. Configure Renovate PR labels, titles, and the dependency dashboard as the operational audit trail; do not add a project logger or logging dependency.
  - [x] **Files:** `renovate.json`, `scripts/renovate-workflow-config.json`, `.github/workflows/renovate.yml`.
  - [ ] **Required external activation:** commit and push the Renovate configuration, workflow, and GitHub App-token update to the default branch. A repository administrator must create and install a dedicated GitHub App only on `i-prikot/tiptap`, grant it only `Contents`, `Pull requests`, and `Issues` read/write permissions, set `RENOVATE_APP_ID` as an Actions variable, set `RENOVATE_APP_PRIVATE_KEY` as an Actions secret, and run `Renovate` once using `workflow_dispatch`.
    - Keep **Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests** disabled. The workflow's `GITHUB_TOKEN` is read-only; Renovate's separate app token supplies the required write authorization without enabling repository-wide bot approvals.
    - Confirm that the default branch's protection rule or ruleset requires an independent human or CODEOWNER approval and grants no bypass to the Renovate App. Verify and record a successful manually dispatched run that creates or updates the Dependency Dashboard and a Renovate pull request whose normal CI checks and `dependencies`-label release verifier run.
    - Rework check on 2026-07-29: the public default branch returned `404` for `renovate.json`, `.github/workflows/renovate.yml`, and `scripts/renovate-workflow-config.json`, and the Renovate workflow-runs endpoint also returned `404`. This environment has no `gh` CLI, no `GH_TOKEN`, `GITHUB_TOKEN`, or `RENOVATE_TOKEN`, and no `ssh` executable, so it cannot push the files, enable workflow permissions, or dispatch the first authorized run.
    - Rework attempt on 2026-07-29: commit `fee7646` added the tracked workflow and runner configuration, but `git push origin main` failed with `error: cannot run ssh: No such file or directory`. The remote default branch and first workflow run therefore remain unverified from this environment.
    - Rework update on 2026-07-29: replaced Renovate's write-capable `GITHUB_TOKEN` with a least-privilege GitHub App installation token and removed the unsafe instruction to enable repository-wide GitHub Actions pull-request approvals. This environment still has no `ssh` executable or GitHub credential, so it cannot push the commits, set the App variable/secret, inspect branch protection, or dispatch the first run.
    - Rework deployment attempt on 2026-07-29: the focused local commit passed its pre-commit formatting and typecheck gates, but `git push origin main` again failed with `error: cannot run ssh: No such file or directory`. The local branch remains ahead of `origin/main`; repository activation is not complete.

### Phase 2: Define the Package and Host Compatibility Policy
- [x] **Task 2: Document coordinated Tiptap updates and host peer-dependency rules.**
  - [x] Create `docs/dependency-updates.md` and link it from the development section of `README.md` so maintainers can find the policy from the repository landing page.
  - [x] Define the review cadence and owner workflow: triage the Renovate dashboard, allow patch/minor PRs through normal CI review, and require explicit compatibility review for majors before merging or creating a Changeset release.
  - [x] State that all direct `@tiptap/*` entries in `packages/editor/package.json`, `packages/schema/package.json`, `packages/renderer/package.json`, and `apps/playground/package.json` are reviewed as one family. The current `3.27.x`/`3.28.x` lower-bound difference is not changed by this setup; the next grouped Renovate update establishes the selected common target.
  - [x] Define the host contract for `@i-prikot/editor`: Vue and the editor-facing `@tiptap/*` modules remain in `peerDependencies` with a verified baseline-to-next-major range (`^<verified-version>`, equivalent to `>=<verified-version> <next-major`); matching `devDependencies` must use the same range for local build and CI validation. Never use `*`, an unbounded `>=` range, or a cross-major peer range.
  - [x] Define the release rule for peer-range expansion: after validating a new Tiptap major, update every related peer range together, document any host migration requirements, and publish the editor package with the appropriate Changeset. Keep schema and renderer dependencies as normal dependencies unless their public API begins requiring the host to provide the package.
  - [x] **Logging/audit trail:** no application runtime logging applies. The Markdown policy must identify Renovate PRs, the dependency dashboard, CI results, and Changesets as the review and release record.
  - [x] **Files:** `docs/dependency-updates.md`, `README.md`, `packages/editor/package.json` (inspection; peer and development ranges already match), `packages/schema/package.json` (inspection), `packages/renderer/package.json` (inspection), `apps/playground/package.json` (inspection).
  - [x] **Depends on:** Task 1.

### Phase 3: Verify the Automation Contract
- [ ] **Task 3: Validate Renovate behavior and the published policy without adding tests.**
  - [x] Validate `renovate.json` against Renovate’s configuration validator or an equivalent repository dry run, then confirm it discovers the root npm lockfile and all four workspace manifests.
    - Configuration validation and local workspace discovery passed. Workspace manifest and root lockfile presence were verified locally; live GitHub discovery remains pending the first scheduled or manually dispatched workflow run.
  - [x] Inspect the dependency dashboard or first dry-run output to confirm that direct `@tiptap/*` updates are emitted as one non-automerge group and that ordinary dependency updates remain independently reviewable.
    - Verified on 2026-07-29 with Renovate 42.87.0 in local `--dry-run=full` mode. The real repository scan (using a temporary alternate Git index containing `HEAD` plus `renovate.json`) discovered all five npm manifests and generated 15 ordinary dependency branches from 17 non-Tiptap updates. It produced no Tiptap range update because the existing caret ranges already cover the registry release.
    - A disposable five-manifest workspace fixture pinned to Tiptap 3.28.0 produced nine flattened `@tiptap/*` updates, exactly one `renovate/tiptap-dependency-family` proposal, and the title `Update Tiptap dependency family to v3.29.2`. The evaluated configuration reports `automerge: false`; all temporary logs, cache, index, and fixture files were removed after recording this result.
    - Live Dependency Dashboard verification remains pending the first scheduled or manually dispatched Renovate run after this workflow reaches the default branch.
  - [x] Verify the documented peer contract against `packages/editor/package.json`: all host-facing Tiptap peer ranges and their mirrored development ranges must be identical and constrained to one major; Vue must follow the same bounded-peer rule.
  - [x] Confirm the update PR path executes the existing `npm ci`, typecheck, lint, coverage, build, and release-verifier CI gates rather than adding new test files or test scripts.
    - Completed on 2026-07-29: `.github/workflows/ci.yml` runs `npm run test:release-verifiers` in the Quality Checks job when a pull request carries the `dependencies` label that Renovate applies.
  - [ ] **Logging/audit trail:** capture validation outcomes in the Renovate dashboard/PR checks and CI run; include evidence that the dedicated GitHub App created the pull request, its normal CI and release-verifier checks ran, and an independent human or CODEOWNER approved it. Report configuration errors through Renovate’s existing failure output. Do not add runtime logs.
  - [x] **Files:** `renovate.json`, `scripts/renovate-workflow-config.json`, `.github/workflows/renovate.yml`, `docs/dependency-updates.md`, `README.md`, `packages/editor/package.json`, `.github/workflows/ci.yml` (release-verifier gate).
  - [x] **Depends on:** Tasks 1 and 2.

## Completion Criteria
- [ ] Renovate is authorized through the scheduled repository-scoped GitHub Actions workflow and has a committed root configuration with automerge disabled.
  - Pending the external activation recorded in Task 1; this must be verified by the dedicated GitHub App installation, a successful manually dispatched run that creates or updates the Dependency Dashboard issue, a Renovate pull request whose normal CI/release-verifier gates run, and an independent human or CODEOWNER approval.
- [x] A dry run or live dashboard shows npm workspace discovery and one grouped `@tiptap/*` update proposal.
- [x] The policy is discoverable from `README.md`, documents the major-upgrade process, and specifies bounded, mirrored host peer ranges.
- [x] No dependency versions are bulk-updated and no new tests are added as part of this automation setup.
