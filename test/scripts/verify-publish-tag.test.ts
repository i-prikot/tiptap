// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const temporaryDirectories: string[] = []

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
      `${JSON.stringify({ name: packageNames[index], version: '1.2.3' }, null, 2)}\n`,
    )
  })

  return fixtureRoot
}

function runTagVerifier(fixtureRoot: string) {
  return spawnSync(
    process.execPath,
    [join(fixtureRoot, 'scripts/verify-publish-tag.mjs'), 'v1.2.3'],
    {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        LOG_LEVEL: 'debug',
        TINYFY_PACKAGES_TOKEN: 'test-token-must-not-be-logged',
      },
    },
  )
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
      '@i-prikot/renderer',
    ])
    const result = runTagVerifier(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[DEBUG] Comparing package release metadata.')
    expect(result.stdout).toContain('[INFO] Publish tag verification completed.')
    expect(`${result.stdout}${result.stderr}`).not.toContain('test-token-must-not-be-logged')
  })

  it('rejects an obsolete @tinyfy package manifest', () => {
    const fixtureRoot = createFixtureProject([
      '@i-prikot/editor-schema',
      '@tinyfy/editor',
      '@i-prikot/renderer',
    ])
    const result = runTagVerifier(fixtureRoot)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('expected @i-prikot/editor, received @tinyfy/editor')
  })
})
