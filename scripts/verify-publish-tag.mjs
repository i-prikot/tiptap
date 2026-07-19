import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const logLevels = Object.freeze({ debug: 10, info: 20, error: 30, silent: Infinity })
const configuredLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase()
const currentLevel = logLevels[configuredLevel] ?? logLevels.info
const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const expectedPackages = Object.freeze([
  { name: '@i-prikot/editor-schema', manifestPath: 'packages/schema/package.json' },
  { name: '@i-prikot/editor', manifestPath: 'packages/editor/package.json' },
  { name: '@i-prikot/renderer', manifestPath: 'packages/renderer/package.json' },
])

function log(level, message, context = {}) {
  if (logLevels[level] < currentLevel) {
    return
  }

  const prefix = level.toUpperCase()
  const serializedContext = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ''
  const output = `[${prefix}] ${message}${serializedContext}`
  const writer = level === 'error' ? console.error : console.log
  writer(output)
}

async function readManifest(manifestPath) {
  const absolutePath = resolve(projectRoot, manifestPath)
  log('debug', 'Reading package manifest.', { manifestPath })

  try {
    return JSON.parse(await readFile(absolutePath, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to read ${manifestPath}: ${message}`)
  }
}

async function verifyPublishTag(tag) {
  log('info', 'Starting publish tag verification.', { tag })

  if (!tag) {
    throw new Error('Expected exactly one release tag argument in the form v<version>.')
  }

  const manifests = await Promise.all(
    expectedPackages.map(async ({ name, manifestPath }) => ({
      expectedName: name,
      manifestPath,
      manifest: await readManifest(manifestPath),
    })),
  )

  const versions = manifests.map(({ manifest }) => manifest.version)
  const sharedVersion = versions[0]
  const expectedTag = `v${sharedVersion}`

  log('debug', 'Comparing package release metadata.', {
    packages: manifests.map(({ expectedName, manifest }) => ({
      expectedName,
      name: manifest.name,
      version: manifest.version,
      private: manifest.private === true,
    })),
    expectedTag,
  })

  if (!/^v[^\s]+$/.test(tag)) {
    throw new Error(`Release tag must use the v<version> format; received ${tag}.`)
  }

  if (!sharedVersion || !versions.every((version) => version === sharedVersion)) {
    throw new Error(`Target package versions must match; received ${versions.join(', ')}.`)
  }

  if (tag !== expectedTag) {
    throw new Error(`Release tag ${tag} does not match package version ${sharedVersion}.`)
  }

  for (const { expectedName, manifestPath, manifest } of manifests) {
    if (manifest.name !== expectedName) {
      throw new Error(
        `Package name mismatch in ${manifestPath}: expected ${expectedName}, received ${manifest.name ?? '<missing>'}.`,
      )
    }

    if (manifest.private === true) {
      throw new Error(`Package ${expectedName} is still private and cannot be published.`)
    }
  }

  log('info', 'Publish tag verification completed.', { tag, version: sharedVersion })
}

const [tag, ...extraArguments] = process.argv.slice(2)

if (extraArguments.length > 0) {
  log('error', 'Publish tag verification failed.', { reason: 'Too many release tag arguments.' })
  process.exitCode = 1
} else {
  verifyPublishTag(tag).catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    log('error', 'Publish tag verification failed.', { message })
    process.exitCode = 1
  })
}
