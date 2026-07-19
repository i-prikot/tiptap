// @vitest-environment node

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const stylesheetPath = fileURLToPath(new URL('../../packages/renderer/styles.css', import.meta.url))
const packagePath = fileURLToPath(new URL('../../packages/renderer/package.json', import.meta.url))

const stylesheet = await readFile(stylesheetPath, 'utf8')
const packageMetadata = JSON.parse(await readFile(packagePath, 'utf8')) as {
  exports?: Record<string, string>
  files?: string[]
}

function declarationsForSelectorContaining(selectorFragment: string) {
  const rule = stylesheet.split('}').find((candidate) => candidate.includes(selectorFragment))

  return rule?.slice(rule.indexOf('{') + 1) ?? ''
}

describe('public renderer stylesheet', () => {
  it('publishes a standalone stylesheet subpath', () => {
    expect(packageMetadata.exports?.['./styles.css']).toBe('./styles.css')
    expect(packageMetadata.files).toContain('styles.css')
  })

  it('keeps task-list completion state available through the native checkbox', () => {
    const declarations = declarationsForSelectorContaining("input[type='checkbox']")

    expect(declarations).not.toMatch(/\bdisplay\s*:\s*none\b/)
    expect(declarations).toMatch(/\bclip-path\s*:\s*inset\(50%\)/)
    expect(declarations).toMatch(/\bposition\s*:\s*absolute\b/)
  })

  it('protects display MathML with spacing and horizontal overflow', () => {
    const declarations = declarationsForSelectorContaining("math[display='block']")

    expect(declarations).toMatch(/\bmargin-block\s*:\s*var\(--tinyfy-public-space\)/)
    expect(declarations).toMatch(/\bmax-width\s*:\s*100%/)
    expect(declarations).toMatch(/\boverflow-x\s*:\s*auto/)
    expect(declarations).toMatch(/\boverflow-y\s*:\s*hidden/)
  })
})
