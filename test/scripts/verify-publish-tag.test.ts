// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const temporaryDirectories: string[] = []
const verifierTimeoutMs = 4_000

function createFixtureProject(packageNames: string[]) {
  const fixtureRoot = mkdtempSync(resolve(projectRoot, '.tmp-verify-publish-tag-'))
  temporaryDirectories.push(fixtureRoot)
  cpSync(
    resolve(projectRoot, 'scripts/verify-publish-tag.mjs'),
    join(fixtureRoot, 'scripts/verify-publish-tag.mjs'),
  )

  const manifestPaths = [
    'packages/schema/package.json',
    'packages/editor/package.json',
    'packages/renderer/package.json',
  ]

  manifestPaths.forEach((manifestPath, index) => {
    const absolutePath = join(fixtureRoot, manifestPath)
    mkdirSync(resolve(absolutePath, '..'), { recursive: true })
    writeFileSync(
      absolutePath,
      `${JSON.stringify(
        {
          name: packageNames[index],
          version: '1.2.3',
          publishConfig: { registry: 'https://npm.pkg.github.com' },
        },
        null,
        2,
      )}\n`,
    )
  })

  writeFileSync(join(fixtureRoot, 'package.json'), '{\n  "private": true\n}\n')
  writeFileSync(join(fixtureRoot, '.npmrc'), '@i-prikot:registry=https://npm.pkg.github.com\n')

  return fixtureRoot
}

function runTagVerifier(fixtureRoot: string, tag = 'v1.2.3') {
  const result = spawnSync(
    process.execPath,
    [join(fixtureRoot, 'scripts/verify-publish-tag.mjs'), tag],
    {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        LOG_LEVEL: 'debug',
        TINYFY_PACKAGES_TOKEN: 'test-token-must-not-be-logged',
      },
      timeout: verifierTimeoutMs,
    },
  )

  if (result.error) {
    throw new Error(
      `verify-publish-tag.mjs did not complete within ${verifierTimeoutMs}ms: ${result.error.message}`,
    )
  }

  if (result.signal) {
    throw new Error(`verify-publish-tag.mjs exited unexpectedly with signal ${result.signal}.`)
  }

  return result
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('verify publish tag script', () => {
  it('accepts the @i-prikot publishable package set without logging credentials', () => {
    const fixtureRoot = createFixtureProject([
      '@i-prikot/editor-schema',
      '@i-prikot/editor',
      '@i-prikot/editor-renderer',
    ])
    const result = runTagVerifier(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[INFO] Starting release tag validation.')
    expect(result.stdout).toContain('[INFO] Release tag validation completed.')
    expect(`${result.stdout}${result.stderr}`).not.toContain('test-token-must-not-be-logged')
  })

  it('rejects a legacy @tinyfy package manifest', () => {
    const fixtureRoot = createFixtureProject([
      '@i-prikot/editor-schema',
      '@tinyfy/editor',
      '@i-prikot/editor-renderer',
    ])
    const result = runTagVerifier(fixtureRoot)

    expect(result.status).toBe(1)
    expect(result.stdout).toContain('packages/editor/package.json must declare @i-prikot/editor.')
  })
  it('rejects prerelease tags so they cannot publish under the latest dist-tag', () => {
    const fixtureRoot = createFixtureProject([
      '@i-prikot/editor-schema',
      '@i-prikot/editor',
      '@i-prikot/editor-renderer',
    ])
    const result = runTagVerifier(fixtureRoot, 'v1.2.3-rc.1')

    expect(result.status).toBe(1)
    expect(result.stdout).toContain('Release tag must not include a prerelease identifier.')
  })
})
