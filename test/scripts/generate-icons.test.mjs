import { spawnSync } from 'node:child_process'
import process from 'node:process'
import {
  cpSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

const projectRoot = process.cwd()
const temporaryDirectories = []

function createFixtureProject() {
  const fixtureRoot = mkdtempSync(resolve(projectRoot, '.tmp-generate-icons-'))
  const fixtureIconsDirectory = join(fixtureRoot, 'packages/editor/src/icons')

  temporaryDirectories.push(fixtureRoot)
  mkdirSync(join(fixtureRoot, 'scripts'), { recursive: true })
  mkdirSync(fixtureIconsDirectory, { recursive: true })
  cpSync(
    resolve(projectRoot, 'scripts/generate-icons.mjs'),
    join(fixtureRoot, 'scripts/generate-icons.mjs'),
  )
  cpSync(
    resolve(projectRoot, 'scripts/resolve-windows-icon-source-directory.mjs'),
    join(fixtureRoot, 'scripts/resolve-windows-icon-source-directory.mjs'),
  )
  writeFileSync(
    join(fixtureIconsDirectory, 'create-icon.ts'),
    'export const createIcon = () => null\n',
  )
  writeFileSync(
    join(fixtureIconsDirectory, 'alpha-icon.ts'),
    'export const AlphaIcon = () => null\n',
  )
  writeFileSync(join(fixtureIconsDirectory, 'beta-icon.ts'), 'export function BetaIcon() {}\n')
  writeFileSync(
    join(fixtureIconsDirectory, 'index.ts'),
    "export { StaleIcon } from './stale-icon'\n",
  )

  return { fixtureIconsDirectory, fixtureRoot }
}

function runIconGenerator(fixtureRoot, arguments_ = []) {
  return spawnSync(
    process.execPath,
    [join(fixtureRoot, 'scripts/generate-icons.mjs'), ...arguments_],
    {
      cwd: fixtureRoot,
      encoding: 'utf8',
    },
  )
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('generate icons script', () => {
  it('detects drift in check mode, rewrites the barrel, and then verifies it', () => {
    const { fixtureIconsDirectory, fixtureRoot } = createFixtureProject()
    const checkBeforeWrite = runIconGenerator(fixtureRoot, ['--check'])

    assert.equal(checkBeforeWrite.status, 1)
    assert.match(checkBeforeWrite.stderr, /Icon barrel is out of date/)

    const writeResult = runIconGenerator(fixtureRoot)

    assert.equal(writeResult.status, 0)
    assert.match(writeResult.stdout, /Icon barrel regenerated/)
    assert.equal(
      readFileSync(join(fixtureIconsDirectory, 'index.ts'), 'utf8'),
      "export { AlphaIcon } from './alpha-icon'\nexport { BetaIcon } from './beta-icon'\n",
    )

    const checkAfterWrite = runIconGenerator(fixtureRoot, ['--check'])

    assert.equal(checkAfterWrite.status, 0)
    assert.match(checkAfterWrite.stdout, /Icon barrel is up to date/)
  })

  it('refuses to overwrite a hard-linked barrel file', () => {
    const { fixtureIconsDirectory, fixtureRoot } = createFixtureProject()
    const barrelPath = join(fixtureIconsDirectory, 'index.ts')
    const linkedFilePath = join(fixtureRoot, 'hard-linked-output.ts')
    const linkedFileContents = "export { ProtectedIcon } from './protected-icon'\n"

    rmSync(barrelPath)
    writeFileSync(linkedFilePath, linkedFileContents)
    linkSync(linkedFilePath, barrelPath)

    const result = runIconGenerator(fixtureRoot)

    assert.equal(result.status, 1)
    assert.match(result.stderr, /must have exactly one link before it can be written/)
    assert.equal(readFileSync(linkedFilePath, 'utf8'), linkedFileContents)
  })

  it('refuses an icon directory reached through a symbolic-link ancestor', (t) => {
    const { fixtureRoot } = createFixtureProject()
    const sourceDirectory = join(fixtureRoot, 'packages/editor/src')
    const redirectedSourceDirectory = join(fixtureRoot, 'redirected-src')
    const redirectedBarrelPath = join(redirectedSourceDirectory, 'icons/index.ts')

    cpSync(sourceDirectory, redirectedSourceDirectory, { recursive: true })
    const redirectedBarrelContents = readFileSync(redirectedBarrelPath, 'utf8')
    rmSync(sourceDirectory, { force: true, recursive: true })
    try {
      symlinkSync(redirectedSourceDirectory, sourceDirectory, 'dir')
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'EPERM') {
        t.skip(
          'Creating directory symlinks requires Windows developer mode or elevated privileges.',
        )
        return
      }
      throw error
    }

    const result = runIconGenerator(fixtureRoot)

    assert.equal(result.status, 1)
    assert.match(result.stderr, /symbolic link/i)
    assert.equal(readFileSync(redirectedBarrelPath, 'utf8'), redirectedBarrelContents)
  })
})
