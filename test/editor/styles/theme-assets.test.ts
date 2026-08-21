// @vitest-environment node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../..')
const editorRoot = resolve(repositoryRoot, 'packages/editor')
const sourceRoot = resolve(editorRoot, 'src')

const themeAssets = [
  { name: 'light', path: resolve(sourceRoot, 'light-theme.css') },
  { name: 'dark', path: resolve(sourceRoot, 'dark-theme.css') },
] as const

const componentOwnedProperties = new Set([
  'appearance',
  '-webkit-appearance',
  'bottom',
  'box-sizing',
  'cursor',
  'display',
  'font',
  'font-family',
  'font-feature-settings',
  'font-size',
  'font-variation-settings',
  'font-weight',
  'height',
  'letter-spacing',
  'line-height',
  'list-style',
  'margin',
  'max-height',
  'max-width',
  'opacity',
  'outline',
  'outline-offset',
  'overflow-wrap',
  'padding',
  'position',
  'resize',
  'tab-size',
  'text-indent',
  'text-rendering',
  'text-transform',
  'top',
  'vertical-align',
  'width',
  '-moz-osx-font-smoothing',
  '-moz-text-size-adjust',
  '-webkit-font-smoothing',
  '-webkit-tap-highlight-color',
  '-webkit-text-size-adjust',
  'text-size-adjust',
])

const componentOwnedPropertyPrefixes = ['background', 'border', 'transition']

const nativeElements = new Set([
  'a',
  'abbr',
  'audio',
  'b',
  'blockquote',
  'button',
  'canvas',
  'code',
  'dd',
  'dialog',
  'dl',
  'embed',
  'fieldset',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'iframe',
  'img',
  'input',
  'kbd',
  'legend',
  'menu',
  'object',
  'ol',
  'optgroup',
  'p',
  'pre',
  'progress',
  'samp',
  'select',
  'small',
  'strong',
  'sub',
  'summary',
  'sup',
  'svg',
  'table',
  'textarea',
  'ul',
  'video',
])

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

function isComponentOwnedProperty(property: string) {
  return (
    componentOwnedProperties.has(property) ||
    componentOwnedPropertyPrefixes.some(
      (prefix) => property === prefix || property.startsWith(`${prefix}-`),
    )
  )
}

function isBroadThemeSelector(selector: string, themeRoot: string) {
  if (selector === themeRoot) return true
  if (!selector.startsWith(themeRoot)) return false

  const descendant = selector.slice(themeRoot.length).trim()
  if (/^(?:\*|::?|\[)/.test(descendant)) return true

  const nativeElement = descendant.match(/^([a-z][\w-]*)/i)?.[1].toLowerCase()
  return nativeElement !== undefined && nativeElements.has(nativeElement)
}

function findThemeBoundaryViolations(theme: (typeof themeAssets)[number]) {
  const styles = read(theme.path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@import\s+['"][^'"]+['"];?/g, '')
  const themeRoot = `[data-tiptap-theme='${theme.name}']`
  const violations: string[] = []

  for (const [, selectorList, declarationBlock] of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = selectorList
      .split(',')
      .map((selector) => selector.trim())
      .filter((selector) => isBroadThemeSelector(selector, themeRoot))

    for (const [, property] of declarationBlock.matchAll(/^\s*([\w-]+)\s*:/gm)) {
      const normalizedProperty = property.toLowerCase()
      const conflictsWithComponentStyles = isComponentOwnedProperty(normalizedProperty)
      const isNonTokenThemeRootDeclaration =
        selectors.includes(themeRoot) && !normalizedProperty.startsWith('--')

      if (!conflictsWithComponentStyles && !isNonTokenThemeRootDeclaration) continue

      for (const selector of selectors) {
        violations.push(`${theme.name}: ${selector} sets ${normalizedProperty}`)
      }
    }
  }

  return violations
}

describe('editor CSS theme entry points', () => {
  it.each(themeAssets)('$name theme does not own component or document layout', (theme) => {
    expect(findThemeBoundaryViolations(theme)).toEqual([])
  })

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
