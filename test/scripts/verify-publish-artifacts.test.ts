// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const artifactVerifierPath = resolve(projectRoot, 'scripts/verify-publish-artifacts.mjs')
const temporaryDirectories: string[] = []

function createArchive(
  artifactDirectory: string,
  archiveName: string,
  packageName: string,
  version = '1.2.3',
) {
  const fixtureRoot = mkdtempSync(resolve(projectRoot, '.tmp-verify-publish-artifacts-'))
  temporaryDirectories.push(fixtureRoot)
  const packageDirectory = join(fixtureRoot, 'package')
  mkdirSync(packageDirectory, { recursive: true })
  writeFileSync(
    join(packageDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: packageName,
        version,
        publishConfig: { registry: 'https://npm.pkg.github.com' },
      },
      null,
      2,
    )}\n`,
  )

  execFileSync('tar', [
    '--create',
    '--gzip',
    '--file',
    join(artifactDirectory, archiveName),
    '--directory',
    fixtureRoot,
    'package',
  ])
}

function createArtifactDirectory(packageNames: string[]) {
  const artifactDirectory = mkdtempSync(resolve(projectRoot, '.tmp-release-artifacts-'))
  temporaryDirectories.push(artifactDirectory)
  const archiveNames = [
    'i-prikot-editor-schema-1.2.3.tgz',
    'i-prikot-editor-1.2.3.tgz',
    'i-prikot-renderer-1.2.3.tgz',
  ]

  archiveNames.forEach((archiveName, index) => {
    createArchive(artifactDirectory, archiveName, packageNames[index])
  })

  return artifactDirectory
}

function runArtifactVerifier(artifactDirectory: string) {
  return spawnSync(process.execPath, [artifactVerifierPath, artifactDirectory, 'v1.2.3'], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      LOG_LEVEL: 'debug',
      TINYFY_PACKAGES_TOKEN: 'test-token-must-not-be-logged',
    },
  })
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('verify publish artifacts script', () => {
  it('accepts @i-prikot archives with npm-generated archive prefixes', () => {
    const artifactDirectory = createArtifactDirectory([
      '@i-prikot/editor-schema',
      '@i-prikot/editor',
      '@i-prikot/renderer',
    ])
    const result = runArtifactVerifier(artifactDirectory)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[DEBUG] Comparing release archive metadata.')
    expect(result.stdout).toContain('[INFO] Trusted release artifact verification completed.')
    expect(`${result.stdout}${result.stderr}`).not.toContain('test-token-must-not-be-logged')
  })

  it('rejects an archive containing an obsolete @tinyfy package manifest', () => {
    const artifactDirectory = createArtifactDirectory([
      '@i-prikot/editor-schema',
      '@tinyfy/editor',
      '@i-prikot/renderer',
    ])
    const result = runArtifactVerifier(artifactDirectory)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('expected @i-prikot/editor, received @tinyfy/editor')
  })
})
