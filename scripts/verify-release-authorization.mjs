import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const logLevels = Object.freeze({ debug: 10, info: 20, error: 30, silent: Infinity })
const configuredLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase()
const currentLevel = logLevels[configuredLevel] ?? logLevels.info
const releaseTagDeploymentPolicy = 'v*'
const releaseTagRefPattern = 'refs/tags/v*'
const releaseMaintainerLogin = process.env.RELEASE_MAINTAINER_LOGIN ?? 'i-prikot'
const publishEnvironment = process.env.PUBLISH_ENVIRONMENT ?? 'tinyfy-private-package-publish'
const requiredTagRules = Object.freeze(['creation', 'update', 'deletion'])

function log(level, message, context = {}) {
  if (logLevels[level] < currentLevel) {
    return
  }

  const serializedContext = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ''
  const output = `[${level.toUpperCase()}] ${message}${serializedContext}`
  const writer = level === 'error' ? process.stderr : process.stdout
  writer.write(`${output}\n`)
}

async function readJson(filePath) {
  log('debug', 'Reading release authorization configuration.', { filePath })

  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error) {
    throw new Error(
      `Could not parse release authorization configuration ${filePath}: ${String(error)}`,
    )
  }
}

async function readRulesetDetails(directoryPath) {
  log('debug', 'Reading repository ruleset details.', { directoryPath })

  let entries
  try {
    entries = await readdir(directoryPath, { withFileTypes: true })
  } catch (error) {
    throw new Error(`Could not read repository ruleset details ${directoryPath}: ${String(error)}`)
  }

  const rulesetFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(directoryPath, entry.name))
    .sort()

  if (rulesetFiles.length === 0) {
    throw new Error('Repository must define one active v* tag ruleset before publishing.')
  }

  return Promise.all(rulesetFiles.map(readJson))
}

function getReviewerRules(environment) {
  if (!Array.isArray(environment?.protection_rules)) {
    return []
  }

  return environment.protection_rules.filter((rule) => rule?.type === 'required_reviewers')
}

function verifyEnvironment(environment, releaseMaintainerUser) {
  const reviewerRules = getReviewerRules(environment)
  const reviewerRule = reviewerRules[0]
  const reviewers = reviewerRules.flatMap((rule) =>
    Array.isArray(rule.reviewers) ? rule.reviewers : [],
  )
  const releaseMaintainerReviewer = reviewers[0]
  const hasOnlyReleaseMaintainerReviewer =
    reviewerRules.length === 1 &&
    reviewers.length === 1 &&
    releaseMaintainerReviewer?.type === 'User' &&
    releaseMaintainerReviewer?.reviewer?.id === releaseMaintainerUser.id &&
    releaseMaintainerReviewer?.reviewer?.login === releaseMaintainerUser.login
  const allowsReleaseMaintainerSelfApproval = reviewerRule?.prevent_self_review === false

  log('debug', 'Validating publishing environment reviewers.', {
    environment: publishEnvironment,
    reviewerRuleCount: reviewerRules.length,
    reviewerCount: reviewers.length,
  })

  if (!hasOnlyReleaseMaintainerReviewer) {
    throw new Error(
      `${publishEnvironment} must require only the ${releaseMaintainerLogin} user as its deployment reviewer.`,
    )
  }

  if (!allowsReleaseMaintainerSelfApproval) {
    throw new Error(
      `${publishEnvironment} must allow the ${releaseMaintainerLogin} release owner to approve their own deployment because that account creates v* release tags.`,
    )
  }

  if (environment?.can_admins_bypass !== false) {
    throw new Error(
      `${publishEnvironment} must not allow administrators to bypass deployment reviewers.`,
    )
  }

  const deploymentBranchPolicy = environment?.deployment_branch_policy
  log('debug', 'Validating publishing environment deployment policy mode.', {
    customBranchPolicies: deploymentBranchPolicy?.custom_branch_policies,
    protectedBranches: deploymentBranchPolicy?.protected_branches,
  })

  if (
    deploymentBranchPolicy?.custom_branch_policies !== true ||
    deploymentBranchPolicy?.protected_branches !== false
  ) {
    throw new Error(
      `${publishEnvironment} must use only custom deployment branch or tag policies for v* releases.`,
    )
  }

  log('debug', 'Validated personal release-owner deployment reviewer policy.', {
    releaseMaintainerLogin,
    allowsReleaseMaintainerSelfApproval,
  })
}

function verifyReleaseMaintainerUser(user) {
  if (
    !Number.isInteger(user?.id) ||
    user?.login !== releaseMaintainerLogin ||
    user?.type !== 'User'
  ) {
    throw new Error(`Could not verify the ${releaseMaintainerLogin} release-maintainer user.`)
  }

  return user.id
}

function isActiveReleaseTagRuleset(ruleset) {
  const refName = ruleset?.conditions?.ref_name

  return (
    ruleset?.target === 'tag' &&
    ruleset?.enforcement === 'active' &&
    Array.isArray(refName?.include) &&
    refName.include.length === 1 &&
    refName.include[0] === releaseTagRefPattern &&
    Array.isArray(refName?.exclude) &&
    refName.exclude.length === 0
  )
}

function verifyTagRulesets(rulesets, releaseMaintainerUserId) {
  const releaseTagRulesets = rulesets.filter(isActiveReleaseTagRuleset)

  log('debug', 'Validating active v* tag rulesets.', {
    rulesetCount: rulesets.length,
    releaseTagRulesetCount: releaseTagRulesets.length,
  })

  if (releaseTagRulesets.length !== 1) {
    throw new Error('Repository must define one active v* tag ruleset before publishing.')
  }

  const [releaseTagRuleset] = releaseTagRulesets
  const configuredRules = new Set(
    Array.isArray(releaseTagRuleset.rules) ? releaseTagRuleset.rules.map((rule) => rule?.type) : [],
  )
  const isMissingRequiredRule = requiredTagRules.some((rule) => !configuredRules.has(rule))

  if (isMissingRequiredRule) {
    throw new Error('The active v* tag ruleset must protect tag creation, updates, and deletion.')
  }

  const bypassActors = Array.isArray(releaseTagRuleset.bypass_actors)
    ? releaseTagRuleset.bypass_actors
    : []
  const bypassActor = bypassActors[0]
  const hasOnlyReleaseMaintainerBypass =
    bypassActors.length === 1 &&
    bypassActor?.actor_type === 'User' &&
    bypassActor?.actor_id === releaseMaintainerUserId &&
    bypassActor?.bypass_mode === 'always'

  if (!hasOnlyReleaseMaintainerBypass) {
    throw new Error(
      `The active v* tag ruleset must bypass only for the ${releaseMaintainerLogin} user.`,
    )
  }

  log('debug', 'Validated active v* tag ruleset protection.', {
    rulesetId: releaseTagRuleset.id,
    releaseMaintainerUserId,
  })
}

function getDeploymentBranchPolicies(response) {
  const pages = Array.isArray(response) ? response : [response]
  const branchPolicies = pages.flatMap((page) =>
    Array.isArray(page?.branch_policies) ? page.branch_policies : [],
  )

  if (branchPolicies.length === 0) {
    throw new Error('Publishing environment must define a v* deployment policy before publishing.')
  }

  if (pages.some((page) => !Array.isArray(page?.branch_policies))) {
    throw new Error('Publishing environment deployment policies returned an invalid response.')
  }

  return branchPolicies
}

function verifyDeploymentBranchPolicies(response) {
  const branchPolicies = getDeploymentBranchPolicies(response)
  const policyNames = branchPolicies.map((policy) => policy?.name)

  log('debug', 'Validating publishing environment deployment branch and tag policies.', {
    policyCount: branchPolicies.length,
    policyNames,
  })

  if (branchPolicies.length !== 1 || policyNames[0] !== releaseTagDeploymentPolicy) {
    throw new Error(
      `${publishEnvironment} must allow only the v* deployment policy before publishing.`,
    )
  }
}

async function main() {
  const [
    environmentFile,
    releaseMaintainerUserFile,
    rulesetDetailsDirectory,
    deploymentBranchPoliciesFile,
  ] = process.argv.slice(2)
  if (
    !environmentFile ||
    !releaseMaintainerUserFile ||
    !rulesetDetailsDirectory ||
    !deploymentBranchPoliciesFile
  ) {
    throw new Error(
      'Usage: node scripts/verify-release-authorization.mjs <environment.json> <release-maintainer-user.json> <ruleset-details-directory> <deployment-branch-policies.json>.',
    )
  }

  log('debug', 'Starting release authorization verification.', {
    environment: publishEnvironment,
    releaseMaintainerLogin,
  })

  const [environment, releaseMaintainerUserDetails, rulesets, deploymentBranchPolicies] =
    await Promise.all([
      readJson(environmentFile),
      readJson(releaseMaintainerUserFile),
      readRulesetDetails(rulesetDetailsDirectory),
      readJson(deploymentBranchPoliciesFile),
    ])
  const releaseMaintainerUserId = verifyReleaseMaintainerUser(releaseMaintainerUserDetails)
  verifyEnvironment(environment, releaseMaintainerUserDetails)
  verifyTagRulesets(rulesets, releaseMaintainerUserId)
  verifyDeploymentBranchPolicies(deploymentBranchPolicies)
  log('info', 'Release authorization verification completed.')
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  log('error', 'Release authorization verification failed.', { message })
  process.exitCode = 1
})
