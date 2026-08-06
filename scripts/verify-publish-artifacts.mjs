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
  { name: '@i-prikot/editor-renderer', archivePrefix: 'i-prikot-editor-renderer-' },
])
const editorExportContract = Object.freeze({
  '.': Object.freeze({ types: './dist/types/index.d.ts', import: './dist/index.js' }),
  './style.css': './dist/index.css',
  './styles.css': './dist/index.css',
})

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
    throw new Error(`Unable to read package/package.json from ${archivePath}: ${message}`, {
      cause: error,
    })
  }
}

async function listArchiveFiles(archivePath) {
  log('debug', 'Listing release archive files.', { archivePath })

  try {
    const { stdout } = await execFileAsync('tar', ['--list', '--file', archivePath])
    return new Set(
      stdout
        .split(/\r?\n/)
        .filter(Boolean)
        .map((path) => path.replaceAll('\\', '/')),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to list files in ${archivePath}: ${message}`, { cause: error })
  }
}

function collectExportTargets(exportValue) {
  if (typeof exportValue === 'string') return [exportValue]
  if (!exportValue || typeof exportValue !== 'object' || Array.isArray(exportValue)) return []

  return Object.values(exportValue).flatMap(collectExportTargets)
}

function verifyExportTargets(archiveName, manifest, archiveFiles) {
  const exportTargets = collectExportTargets(manifest.exports)

  for (const exportTarget of exportTargets) {
    if (!exportTarget.startsWith('./')) {
      throw new Error(`Package ${manifest.name} has an invalid export target: ${exportTarget}.`)
    }

    const archivePath = `package/${exportTarget.slice(2)}`
    if (!archiveFiles.has(archivePath)) {
      throw new Error(
        `Package ${manifest.name} export target ${exportTarget} is missing from ${archiveName}.`,
      )
    }
  }
}

function verifyEditorManifestContract(manifest) {
  if (manifest.type !== 'module') {
    throw new Error('Package @i-prikot/editor must declare type: module.')
  }

  if (JSON.stringify(manifest.files) !== JSON.stringify(['dist'])) {
    throw new Error('Package @i-prikot/editor must publish only its dist directory.')
  }

  if (manifest.types !== './dist/types/index.d.ts') {
    throw new Error(
      'Package @i-prikot/editor must declare dist/types/index.d.ts as its types entry.',
    )
  }

  if (JSON.stringify(manifest.exports) !== JSON.stringify(editorExportContract)) {
    throw new Error(
      'Package @i-prikot/editor exports must preserve the root ESM entry and CSS aliases.',
    )
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
    const archiveFiles = await listArchiveFiles(archivePath)

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

    if (expectedPackage.name === '@i-prikot/editor') {
      verifyEditorManifestContract(manifest)
    }

    verifyExportTargets(archiveName, manifest, archiveFiles)
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
