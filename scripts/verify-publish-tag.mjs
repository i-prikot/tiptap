import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const repositoryRoot = process.cwd()
const packageDefinitions = [
  { file: 'packages/schema/package.json', name: '@i-prikot/editor-schema' },
  { file: 'packages/editor/package.json', name: '@i-prikot/editor' },
  { file: 'packages/renderer/package.json', name: '@i-prikot/editor-renderer' },
]
const expectedRegistry = 'https://npm.pkg.github.com'
const expectedNpmrc = '@i-prikot:registry=https://npm.pkg.github.com\n'
const logLevels = { debug: 10, info: 20, error: 30, silent: Number.POSITIVE_INFINITY }
const configuredLogLevel = process.env.LOG_LEVEL?.toLowerCase() ?? 'info'
const minimumLogLevel = logLevels[configuredLogLevel] ?? logLevels.info

function log(level, message, context = {}) {
  if (logLevels[level] < minimumLogLevel) {
    return
  }

  const serializedContext = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ''
  console.log(`[${level.toUpperCase()}] ${message}${serializedContext}`)
}

async function readJson(file) {
  const content = await readFile(resolve(repositoryRoot, file), 'utf8')
  return JSON.parse(content)
}

function parseReleaseTag(tag) {
  const match =
    /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(
      tag,
    )

  if (!match) {
    throw new Error('Release tag must use the v<semver> format.')
  }

  if (match[4]) {
    throw new Error('Release tag must not include a prerelease identifier.')
  }

  return tag.slice(1)
}

function validatePackage(packageJson, definition, expectedVersion) {
  if (packageJson.name !== definition.name) {
    throw new Error(`${definition.file} must declare ${definition.name}.`)
  }

  if (packageJson.version !== expectedVersion) {
    throw new Error(
      `${definition.name} version ${packageJson.version ?? '<missing>'} does not match ${expectedVersion}.`,
    )
  }

  if (Object.hasOwn(packageJson, 'private')) {
    throw new Error(`${definition.name} must not declare private before publishing.`)
  }

  if (packageJson.publishConfig?.registry !== expectedRegistry) {
    throw new Error(`${definition.name} must publish to ${expectedRegistry}.`)
  }

  log('debug', 'Validated release package version.', {
    package: definition.name,
    version: packageJson.version,
  })
}

async function validateRegistryConfiguration() {
  const npmrc = await readFile(resolve(repositoryRoot, '.npmrc'), 'utf8')
  if (npmrc !== expectedNpmrc) {
    throw new Error('.npmrc must contain only the @i-prikot GitHub Packages registry mapping.')
  }
}

async function main() {
  const [tag] = process.argv.slice(2)
  if (!tag || process.argv.length !== 3) {
    throw new Error('Usage: node scripts/verify-publish-tag.mjs v<version>.')
  }

  const expectedVersion = parseReleaseTag(tag)
  log('info', 'Starting release tag validation.', { tag })

  const rootPackage = await readJson('package.json')
  if (rootPackage.private !== true) {
    throw new Error('The root workspace must remain private.')
  }

  await validateRegistryConfiguration()

  const packageJsons = await Promise.all(
    packageDefinitions.map(async (definition) => ({
      definition,
      packageJson: await readJson(definition.file),
    })),
  )

  for (const { definition, packageJson } of packageJsons) {
    validatePackage(packageJson, definition, expectedVersion)
  }

  log('info', 'Release tag validation completed.', {
    tag,
    packageCount: packageDefinitions.length,
  })
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  log('error', 'Release tag validation failed.', { message })
  process.exitCode = 1
})
