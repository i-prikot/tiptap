// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const prepareHelperPath = resolve(process.cwd(), 'scripts/prepare-husky.cjs')
const hookPath = resolve(process.cwd(), '.husky/pre-commit')
const temporaryDirectories: string[] = []

function runPrepareHelper(environment: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [prepareHelperPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      ...environment,
    },
  })
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('prepare Husky lifecycle helper', () => {
  it('skips successfully in production mode', () => {
    const result = runPrepareHelper({ NODE_ENV: 'production' })

    expect(result.status).toBe(0)
  })

  it('honors HUSKY=0 without mutating configured hooks', () => {
    const hookBeforePrepare = readFileSync(hookPath, 'utf8')
    const result = runPrepareHelper({ HUSKY: '0', NODE_ENV: '' })

    expect(result.status).toBe(0)
    expect(readFileSync(hookPath, 'utf8')).toBe(hookBeforePrepare)
  })

  it('surfaces Husky failures with debug error context', () => {
    const temporaryDirectory = mkdtempSync(resolve(process.cwd(), '.tmp-prepare-husky-'))
    temporaryDirectories.push(temporaryDirectory)
    const failingHuskyPath = join(temporaryDirectory, 'failing-husky.cjs')

    writeFileSync(failingHuskyPath, 'process.exit(17)\n')

    const result = runPrepareHelper({
      HUSKY_BIN: failingHuskyPath,
      LOG_LEVEL: 'debug',
      NODE_ENV: '',
    })

    expect(result.status).toBe(17)
    expect(result.stderr).toContain('[FIX:prepare] Husky exited with a non-zero status')
  })
})
