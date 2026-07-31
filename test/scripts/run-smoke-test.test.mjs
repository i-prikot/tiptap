// @vitest-environment node
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'vitest'

const projectRoot = process.cwd()
const temporaryDirectories = []

function createFixtureProject() {
  const fixtureRoot = mkdtempSync(resolve(projectRoot, '.tmp-run-smoke-test-'))
  const packageDirectory = join(fixtureRoot, 'node_modules/@playwright/test')
  const capturePath = join(fixtureRoot, 'playwright-arguments.json')

  temporaryDirectories.push(fixtureRoot)
  mkdirSync(join(fixtureRoot, 'scripts'), { recursive: true })
  mkdirSync(packageDirectory, { recursive: true })
  cpSync(
    resolve(projectRoot, 'scripts/run-smoke-test.mjs'),
    join(fixtureRoot, 'scripts/run-smoke-test.mjs'),
  )
  writeFileSync(
    join(packageDirectory, 'package.json'),
    `${JSON.stringify({
      exports: { './cli': './cli.mjs' },
      name: '@playwright/test',
      type: 'module',
    })}\n`,
  )
  writeFileSync(
    join(packageDirectory, 'cli.mjs'),
    [
      "import { writeFileSync } from 'node:fs'",
      'writeFileSync(process.env.SMOKE_CAPTURE_PATH, JSON.stringify(process.argv.slice(2)))',
      "process.exit(Number(process.env.SMOKE_EXIT_CODE ?? '0'))",
      '',
    ].join('\n'),
  )

  return { capturePath, fixtureRoot }
}

function runSmokeTest(fixtureRoot, capturePath, forwardedArguments = [], environment = {}) {
  return spawnSync(
    process.execPath,
    [join(fixtureRoot, 'scripts/run-smoke-test.mjs'), ...forwardedArguments],
    {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...environment,
        SMOKE_CAPTURE_PATH: capturePath,
      },
    },
  )
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('smoke test launcher', () => {
  it('forwards supplied Playwright arguments to the smoke target', () => {
    const { capturePath, fixtureRoot } = createFixtureProject()
    const result = runSmokeTest(fixtureRoot, capturePath, [
      '--grep',
      'critical path',
      '--reporter=line',
    ])

    assert.equal(result.status, 0)
    assert.deepEqual(JSON.parse(readFileSync(capturePath, 'utf8')), [
      'test',
      'e2e/smoke.spec.ts',
      '--grep',
      'critical path',
      '--reporter=line',
    ])
  })

  it('redacts sensitive forwarded arguments from debug logs', () => {
    const { capturePath, fixtureRoot } = createFixtureProject()
    const sensitiveArguments = [
      '--grep',
      'https://user:super-secret@example.test/path',
      'https://query-user:query-secret@example.test/path?attempt=1',
      '--grep=https://inline-user:inline-secret@example.test/path',
      '--token=playwright-token',
      '--api-key',
      'api-key-secret',
      '--headers',
      'Authorization: Bearer header-token',
      '--headers',
      'X-Api-Key: x-api-key-secret',
      '--headers',
      'Cookie: session=cookie-session-secret',
      '--headers=Set-Cookie: refresh=refresh-cookie-secret',
      '--grep',
      '{"password":"json-password-secret","token":"json-token-secret"}',
      '--grep',
      '{"Cookie":"json-cookie-session-secret","Set-Cookie":"json-refresh-cookie-secret"}',
    ]
    const sensitiveValues = [
      'super-secret',
      'query-secret',
      'inline-secret',
      'playwright-token',
      'api-key-secret',
      'header-token',
      'x-api-key-secret',
      'cookie-session-secret',
      'refresh-cookie-secret',
      'json-password-secret',
      'json-token-secret',
      'json-cookie-session-secret',
      'json-refresh-cookie-secret',
    ]
    const infoResult = runSmokeTest(fixtureRoot, capturePath, sensitiveArguments)

    assert.equal(infoResult.status, 0)
    for (const sensitiveValue of sensitiveValues) {
      assert.doesNotMatch(infoResult.stdout, new RegExp(sensitiveValue))
    }

    const debugResult = runSmokeTest(fixtureRoot, capturePath, sensitiveArguments, {
      LOG_LEVEL: 'debug',
    })

    assert.equal(debugResult.status, 0)
    for (const sensitiveValue of sensitiveValues) {
      assert.doesNotMatch(debugResult.stdout, new RegExp(sensitiveValue))
    }
    assert.match(debugResult.stdout, /--token=\[REDACTED\]/)
    assert.match(debugResult.stdout, /--grep=\[REDACTED\]/)
    assert.match(debugResult.stdout, /--headers/)
    assert.match(debugResult.stdout, /\[REDACTED\]/)
    assert.deepEqual(JSON.parse(readFileSync(capturePath, 'utf8')), [
      'test',
      'e2e/smoke.spec.ts',
      ...sensitiveArguments,
    ])
  })

  it('propagates the Playwright exit code', () => {
    const { capturePath, fixtureRoot } = createFixtureProject()
    const result = runSmokeTest(fixtureRoot, capturePath, ['--list'], { SMOKE_EXIT_CODE: '23' })

    assert.equal(result.status, 23)
    assert.match(result.stderr, /Playwright smoke test exited unsuccessfully/)
  })
})
