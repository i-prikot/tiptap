// @vitest-environment node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const editorRoot = resolve(repositoryRoot, 'packages/editor')
const sourceRoot = resolve(editorRoot, 'src')

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function readThemeStyles(path: string) {
  return read(path).replace(/@import\s+['"](.+)['"];?/g, (_, importedPath: string) =>
    readThemeStyles(resolve(dirname(path), importedPath)),
  )
}

function readThemeTokens(styles: string, selector: string) {
  const tokens = new Map<string, string>()
  const themeRule = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`,
    'g',
  )

  for (const [, declarations] of styles.matchAll(themeRule)) {
    for (const [, name, value] of declarations.matchAll(/^\s*(--tt-[\w-]+):\s*([^;]+);/gm)) {
      tokens.set(name, value.trim())
    }
  }

  if (tokens.size === 0) throw new Error(`Missing theme rule for ${selector}.`)

  return tokens
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

describe('editor CSS theme entry points', () => {
  it('keeps base styles independent from a consumer root and publishes opt-in themes', () => {
    const manifest = JSON.parse(read(resolve(editorRoot, 'package.json')))
    const baseStyles = read(resolve(sourceRoot, 'styles.css'))

    expect(manifest.exports['./styles.css']).toBe('./dist/styles.css')
    expect(manifest.exports['./style.css']).toBe('./dist/styles.css')
    expect(manifest.exports['./light-theme.css']).toBe('./dist/light-theme.css')
    expect(manifest.exports['./dark-theme.css']).toBe('./dist/dark-theme.css')
    expect(baseStyles).not.toContain('tinyfy-editor')
    expect(baseStyles).not.toContain('design-tokens.css')
    expect(read(resolve(sourceRoot, 'light-theme.css'))).toContain("[data-tiptap-theme='light']")
    expect(read(resolve(sourceRoot, 'dark-theme.css'))).toContain("[data-tiptap-theme='dark']")
  })

  it('does not retain the former consumer selector in editor source files', () => {
    const sourceFiles = [
      resolve(sourceRoot, 'styles.css'),
      resolve(sourceRoot, 'styles', 'design-tokens.css'),
      resolve(editorRoot, 'vite.config.ts'),
    ]

    for (const path of sourceFiles) {
      expect(read(path), path).not.toContain('tinyfy-editor')
    }
  })

  it('keeps component defaults in opt-in themes and animation definitions in the base asset', () => {
    const baseStyles = read(resolve(sourceRoot, 'styles.css'))
    const buttonStyles = read(resolve(sourceRoot, 'styles', 'button.css'))
    const keyframes = read(resolve(sourceRoot, 'styles', 'keyframes.css'))
    const lightTheme = readThemeStyles(resolve(sourceRoot, 'light-theme.css'))
    const darkTheme = readThemeStyles(resolve(sourceRoot, 'dark-theme.css'))

    expect(buttonStyles).not.toContain('--tt-button-default-bg-color:')
    expect(lightTheme).toContain("[data-tiptap-theme='light'] .tiptap-button")
    expect(baseStyles).toContain("@import './styles/keyframes.css';")
    expect(keyframes).toContain('@keyframes fadeIn')
    expect(keyframes).toContain('@keyframes spin')
    expect(lightTheme).not.toContain('@keyframes fadeIn')
    expect(darkTheme).not.toContain('@keyframes fadeIn')
  })

  it('documents every public token with exact defaults from both built-in themes', () => {
    const lightTheme = read(resolve(sourceRoot, 'light-theme.css'))
    const darkTheme = read(resolve(sourceRoot, 'dark-theme.css'))
    const readme = read(resolve(editorRoot, 'README.md'))
    const lightTokens = readThemeTokens(lightTheme, "[data-tiptap-theme='light']")
    const darkTokens = readThemeTokens(darkTheme, "[data-tiptap-theme='dark']")

    expect(lightTokens.size).toBeGreaterThan(0)
    expect([...lightTokens.keys()].sort()).toEqual([...darkTokens.keys()].sort())

    const normalizedReadme = normalizeWhitespace(readme)

    for (const [name, lightValue] of lightTokens) {
      const darkValue = darkTokens.get(name)
      expect(normalizedReadme, name).toContain(`| \`${name}\` |`)
      expect(normalizedReadme, name).toContain(
        normalizeWhitespace(`| \`${lightValue}\` | \`${darkValue}\` |`),
      )
    }
  })

  it('documents a component-default layer for custom themes', () => {
    const readme = read(resolve(editorRoot, 'README.md'))

    expect(readme).not.toContain(
      'Import only the base asset to provide all public values yourself.',
    )
    expect(readme).toContain('component-default layer')
    expect(readme).toContain("@import '@i-prikot/editor/light-theme.css';")
    expect(readme).toContain("@import '@i-prikot/editor/dark-theme.css';")
  })
})
