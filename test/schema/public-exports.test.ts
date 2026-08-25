// @vitest-environment node

import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('schema package public exports', () => {
  it('loads the contract and fixtures from the built package entry point', async () => {
    execFileSync('npm', ['run', 'build', '--workspace=@i-prikot/editor-schema'], {
      cwd: resolve(import.meta.dirname, '../..'),
      stdio: 'pipe',
    })

    const entryUrl = pathToFileURL(
      resolve(import.meta.dirname, '../../packages/schema/dist/index.js'),
    )
    entryUrl.searchParams.set('public-exports-test', String(Date.now()))
    const packageEntry = await import(entryUrl.href)

    expect(packageEntry.getSchemaContract()).toBeTruthy()
    expect(packageEntry.validDocuments.length).toBeGreaterThan(0)
    expect(packageEntry.invalidDocuments.length).toBeGreaterThan(0)
    expect(packageEntry.schemaValidationRules.length).toBeGreaterThan(0)
  }, 120_000)
})
