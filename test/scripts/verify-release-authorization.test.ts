// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const fixturesRoot = resolve(projectRoot, 'test/fixtures/verify-release-authorization')
const acceptedFixtureRoot = resolve(fixturesRoot, 'accepted')

function runAuthorizationVerifier(
  environmentFixtureRoot = acceptedFixtureRoot,
  releaseMaintainerUserFixtureRoot = acceptedFixtureRoot,
  tagRulesetFixtureRoot = acceptedFixtureRoot,
  deploymentPolicyFixtureRoot = acceptedFixtureRoot,
) {
  return spawnSync(
    process.execPath,
    [
      resolve(projectRoot, 'scripts/verify-release-authorization.mjs'),
      resolve(environmentFixtureRoot, 'environment.json'),
      resolve(releaseMaintainerUserFixtureRoot, 'release-maintainer-user.json'),
      resolve(tagRulesetFixtureRoot, 'rulesets'),
      resolve(deploymentPolicyFixtureRoot, 'deployment-branch-policies.json'),
    ],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      env: { ...process.env, LOG_LEVEL: 'debug' },
    },
  )
}

describe('release authorization verification', () => {
  it('accepts the protected publishing environment where the release owner can self-approve', () => {
    const result = runAuthorizationVerifier()

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[INFO] Release authorization verification completed.')
  })

  it.each(['rejected-wrong-user-reviewer', 'rejected-additional-team-reviewer'])(
    'rejects an environment without exactly the i-prikot reviewer (%s)',
    (fixtureName) => {
      const result = runAuthorizationVerifier(resolve(fixturesRoot, fixtureName))

      expect(result.status).toBe(1)
      expect(result.stderr).toContain(
        'must require only the i-prikot user as its deployment reviewer',
      )
    },
  )

  it('rejects an environment that prevents the sole release owner from approving a v* deployment', () => {
    const result = runAuthorizationVerifier(
      resolve(fixturesRoot, 'rejected-self-review-prevention'),
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'must allow the i-prikot release owner to approve their own deployment',
    )
  })

  it('rejects an environment where administrators can bypass deployment reviewers', () => {
    const result = runAuthorizationVerifier(resolve(fixturesRoot, 'rejected-admin-bypass'))

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('must not allow administrators to bypass deployment reviewers')
  })

  it('rejects an environment deployment policy that permits refs besides v*', () => {
    const result = runAuthorizationVerifier(
      acceptedFixtureRoot,
      acceptedFixtureRoot,
      acceptedFixtureRoot,
      resolve(fixturesRoot, 'rejected-additional-deployment-policy'),
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('must allow only the v* deployment policy')
  })

  it('rejects an inactive v* tag ruleset', () => {
    const result = runAuthorizationVerifier(
      acceptedFixtureRoot,
      acceptedFixtureRoot,
      resolve(fixturesRoot, 'rejected-inactive-tag-ruleset'),
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('must define one active v* tag ruleset')
  })

  it('rejects a v* tag ruleset that does not prevent tag deletion', () => {
    const result = runAuthorizationVerifier(
      acceptedFixtureRoot,
      acceptedFixtureRoot,
      resolve(fixturesRoot, 'rejected-missing-tag-deletion'),
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('must protect tag creation, updates, and deletion')
  })

  it('rejects a v* tag ruleset with an additional bypass actor', () => {
    const result = runAuthorizationVerifier(
      acceptedFixtureRoot,
      acceptedFixtureRoot,
      resolve(fixturesRoot, 'rejected-unrestricted-tag-bypass'),
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('must bypass only for the i-prikot user')
  })

  it('runs trusted authorization tooling after prepared release artifacts succeed', () => {
    const workflow = readFileSync(resolve(projectRoot, '.github/workflows/publish.yml'), 'utf8')
    const verifier = readFileSync(
      resolve(projectRoot, 'scripts/verify-release-authorization.mjs'),
      'utf8',
    )

    expect(workflow).toContain('scripts/verify-release-authorization.mjs')
    expect(workflow).toContain('workflow_run:')
    expect(workflow).toContain('Prepare GitHub Packages release artifacts')
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'")
    expect(workflow).toContain(
      'github.event.workflow_run.head_repository.full_name == github.repository',
    )
    expect(workflow).toContain('ref: ${{ github.event.repository.default_branch }}')
    expect(workflow).toContain('actions: read')
    expect(workflow).toContain('RELEASE_MAINTAINER_LOGIN: i-prikot')
    expect(workflow).toContain('NODE_AUTH_TOKEN: ${{ secrets.TINYFY_PACKAGES_TOKEN }}')
    expect(workflow).toContain('TINYFY_PACKAGES_TOKEN_SCOPE_ATTESTATION')
    expect(workflow).toContain('/deployment-branch-policies')
    expect(workflow).toContain('/rulesets')
    expect(workflow).toContain('ruleset_details_dir')
    expect(workflow).toContain('release_maintainer_user_file')
    expect(workflow).toContain('users/${RELEASE_MAINTAINER_LOGIN}')
    expect(workflow).not.toContain('orgs/${GITHUB_REPOSITORY_OWNER}/teams/')
    expect(workflow).toContain('actions/download-artifact')
    expect(workflow).toContain('run-id: ${{ github.event.workflow_run.id }}')
    expect(workflow).toContain('scripts/verify-publish-artifacts.mjs')
    expect(workflow).toContain('npm publish --ignore-scripts')
    expect(workflow).toContain('"${artifact_dir}/${archive_name}"')
    expect(workflow).not.toContain('"--workspace=${package_name}"')
    expect(workflow).toContain('node scripts/verify-release-authorization.mjs \\')
    expect(workflow).toContain('"${release_maintainer_user_file}" \\')
    expect(workflow).toContain('"${ruleset_details_dir}" \\')
    expect(workflow).toContain('"${deployment_branch_policies_file}"; then')
    expect(verifier).toContain('verifyTagRulesets')
  })

  it('runs repository-write Changesets automation only from main', () => {
    const workflow = readFileSync(resolve(projectRoot, '.github/workflows/changesets.yml'), 'utf8')

    expect(workflow).toContain('branches:\n      - main')
    expect(workflow).not.toContain('workflow_dispatch:')
    expect(workflow).toContain('contents: write')
    expect(workflow).toContain('pull-requests: write')
  })
})
