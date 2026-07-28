// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const eslintCliPath = resolve(process.cwd(), 'node_modules/eslint/bin/eslint.js')

describe('ESLint flat-config compatibility', () => {
  it('loads the config with the legacy minimatch dependency tree', () => {
    const result = spawnSync(
      process.execPath,
      [eslintCliPath, '--no-error-on-unmatched-pattern', 'eslint.config.js'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    )

    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
  }, 60_000)
})
