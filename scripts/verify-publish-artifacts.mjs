import { execFile } from 'node:child_process'
import { lstat, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const logLevels = Object.freeze({ debug: 10, info: 20, error: 30, silent: Infinity })
const configuredLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase()
const currentLevel = logLevels[configuredLevel] ?? logLevels.info
const registry = 'https://npm.pkg.github.com'
const expectedPackages = Object.freeze([
  { name: '@i-prikot/editor-schema', archivePrefix: 'i-prikot-editor-schema-' },
  { name: '@i-prikot/editor', archivePrefix: 'i-prikot-editor-' },
  { name: '@i-prikot/renderer', archivePrefix: 'i-prikot-renderer-' },
])

function log(level, message, context = {}) {
  if (logLevels[level] < currentLevel) {
    return
  }

  const serializedContext = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ''
  const writer = level === 'error' ? console.error : console.log
  writer(`[${level.toUpperCase()}] ${message}${serializedContext}`)
}

function getExpectedVersion(tag) {
  if (!/^v[^\s]+$/.test(tag)) {
    throw new Error(`Release tag must use the v<version> format; received ${tag || '<missing>'}.`)
  }

  return tag.slice(1)
}

async function listArchiveNames(artifactDirectory) {
  log('debug', 'Reading downloaded release artifact directory.', { artifactDirectory })
  const entries = await readdir(artifactDirectory, { withFileTypes: true })
  const archiveNames = entries.map((entry) => entry.name).sort()

  for (const entry of entries) {
    const archivePath = resolve(artifactDirectory, entry.name)
    const stats = await lstat(archivePath)

    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error(`Release artifact ${entry.name} must be a regular file.`)
    }
  }

  return archiveNames
}

async function readArchiveManifest(archivePath) {
  log('debug', 'Reading package manifest from release archive.', { archivePath })

  try {
    const { stdout } = await execFileAsync('tar', [
      '--extract',
      '--to-stdout',
      '--file',
      archivePath,
      'package/package.json',
    ])

    return JSON.parse(stdout)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to read package/package.json from ${archivePath}: ${message}`)
  }
}

async function verifyPublishArtifacts(artifactDirectory, tag) {
  log('info', 'Starting trusted release artifact verification.', { artifactDirectory, tag })
  const version = getExpectedVersion(tag)
  const expectedArchives = expectedPackages
    .map(({ archivePrefix }) => `${archivePrefix}${version}.tgz`)
    .sort()
  const archiveNames = await listArchiveNames(artifactDirectory)

  if (JSON.stringify(archiveNames) !== JSON.stringify(expectedArchives)) {
    throw new Error(
      `Release archives do not match the expected publish set; expected ${expectedArchives.join(', ')}, received ${archiveNames.join(', ') || '<none>'}.`,
    )
  }

  for (const expectedPackage of expectedPackages) {
    const archiveName = `${expectedPackage.archivePrefix}${version}.tgz`
    const archivePath = resolve(artifactDirectory, archiveName)
    const manifest = await readArchiveManifest(archivePath)

    log('debug', 'Comparing release archive metadata.', {
      archiveName,
      expectedName: expectedPackage.name,
      name: manifest.name,
      expectedVersion: version,
      version: manifest.version,
      private: manifest.private === true,
      registry: manifest.publishConfig?.registry,
    })

    if (manifest.name !== expectedPackage.name) {
      throw new Error(
        `Package name mismatch in ${archiveName}: expected ${expectedPackage.name}, received ${manifest.name ?? '<missing>'}.`,
      )
    }

    if (manifest.version !== version) {
      throw new Error(
        `Package version mismatch in ${archiveName}: expected ${version}, received ${manifest.version ?? '<missing>'}.`,
      )
    }

    if (manifest.private === true) {
      throw new Error(`Package ${expectedPackage.name} is still private and cannot be published.`)
    }

    if (manifest.publishConfig?.registry !== registry) {
      throw new Error(`Package ${expectedPackage.name} must publish to ${registry}.`)
    }
  }

  log('info', 'Trusted release artifact verification completed.', { tag, version })
}

const [artifactDirectory, tag, ...extraArguments] = process.argv.slice(2)

if (!artifactDirectory || !tag || extraArguments.length > 0) {
  log('error', 'Release artifact verification failed.', {
    reason: 'Expected exactly two arguments: <artifact-directory> <v<version>-tag>.',
  })
  process.exitCode = 1
} else {
  verifyPublishArtifacts(artifactDirectory, tag).catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    log('error', 'Release artifact verification failed.', { message })
    process.exitCode = 1
  })
}
