import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'

const repositoryRoot = resolve(import.meta.dirname, '..')
const localeRoot = join(repositoryRoot, 'packages/editor/src/i18n')
const baseLocale = 'en'
const logLevels = { debug: 10, info: 20, error: 30, silent: Number.POSITIVE_INFINITY }
const configuredLogLevel = process.env.LOG_LEVEL?.toLowerCase() ?? 'info'
const minimumLogLevel = logLevels[configuredLogLevel] ?? logLevels.info

class CatalogParseError extends Error {}

function log(level, message, context = {}) {
  if (logLevels[level] < minimumLogLevel) return

  const writer = level === 'error' ? console.error : console.log
  const serializedContext = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ''
  writer(`[${level.toUpperCase()}] ${message}${serializedContext}`)
}

function isIdentifierStart(character) {
  return /[A-Za-z_$]/.test(character)
}

function isIdentifierPart(character) {
  return /[A-Za-z0-9_$]/.test(character)
}

class TypeScriptTokenizer {
  constructor(source, position = 0) {
    this.source = source
    this.position = position
    this.bufferedToken = undefined
  }

  peek() {
    if (!this.bufferedToken) this.bufferedToken = this.next()
    return this.bufferedToken
  }

  next() {
    if (this.bufferedToken) {
      const token = this.bufferedToken
      this.bufferedToken = undefined
      return token
    }

    this.skipTrivia()

    if (this.position >= this.source.length) return { type: 'eof', value: '' }

    const character = this.source[this.position]

    if (character === "'" || character === '"') return this.readQuotedString(character)
    if (character === '`') return this.readTemplateString()
    if (isIdentifierStart(character)) return this.readIdentifier()
    if (/\d/.test(character)) return this.readNumber()

    this.position += 1
    return { type: 'punctuation', value: character }
  }

  skipTrivia() {
    while (this.position < this.source.length) {
      const character = this.source[this.position]
      const nextCharacter = this.source[this.position + 1]

      if (/\s/.test(character)) {
        this.position += 1
        continue
      }

      if (character === '/' && nextCharacter === '/') {
        this.position += 2
        while (this.position < this.source.length && this.source[this.position] !== '\n') {
          this.position += 1
        }
        continue
      }

      if (character === '/' && nextCharacter === '*') {
        const end = this.source.indexOf('*/', this.position + 2)
        if (end === -1) throw new CatalogParseError('unterminated comment')
        this.position = end + 2
        continue
      }

      break
    }
  }

  readIdentifier() {
    const start = this.position
    this.position += 1
    while (isIdentifierPart(this.source[this.position] ?? '')) this.position += 1
    return { type: 'identifier', value: this.source.slice(start, this.position) }
  }

  readNumber() {
    const start = this.position
    this.position += 1
    while (/[0-9._]/.test(this.source[this.position] ?? '')) this.position += 1
    return { type: 'number', value: this.source.slice(start, this.position) }
  }

  readEscapeSequence() {
    const escaped = this.source[this.position]
    this.position += 1

    if (escaped === undefined) {
      throw new CatalogParseError('unterminated escape sequence')
    }

    const escapeCharacters = {
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
      v: '\v',
    }

    if (escaped === 'x') {
      const codePoint = this.source.slice(this.position, this.position + 2)
      if (!/^[0-9A-Fa-f]{2}$/.test(codePoint)) {
        throw new CatalogParseError('invalid hexadecimal escape sequence')
      }
      this.position += 2
      return String.fromCharCode(Number.parseInt(codePoint, 16))
    }

    if (escaped === 'u') {
      const codePoint = this.source.slice(this.position, this.position + 4)
      if (!/^[0-9A-Fa-f]{4}$/.test(codePoint)) {
        throw new CatalogParseError('invalid Unicode escape sequence')
      }
      this.position += 4
      return String.fromCharCode(Number.parseInt(codePoint, 16))
    }

    return escapeCharacters[escaped] ?? escaped
  }

  readQuotedString(quote) {
    this.position += 1
    let value = ''

    while (this.position < this.source.length) {
      const character = this.source[this.position]
      this.position += 1

      if (character === quote) return { type: 'string', value }
      if (character !== '\\') {
        value += character
        continue
      }

      value += this.readEscapeSequence()
    }

    throw new CatalogParseError('unterminated string literal')
  }

  readTemplateString() {
    this.position += 1
    let value = ''

    while (this.position < this.source.length) {
      const character = this.source[this.position]
      this.position += 1

      if (character === '`') return { type: 'string', value }
      if (character === '$' && this.source[this.position] === '{') {
        throw new CatalogParseError('template expressions are not supported in locale catalogs')
      }
      if (character === '\\') {
        value += this.readEscapeSequence()
        continue
      }

      value += character
    }

    throw new CatalogParseError('unterminated template literal')
  }
}

function expectToken(tokenizer, expectedValue, reason) {
  const token = tokenizer.next()
  if (token.value !== expectedValue) throw new CatalogParseError(reason)
  return token
}

function parseMessageObject(tokenizer, openingToken = tokenizer.next()) {
  if (openingToken.value !== '{') throw new CatalogParseError('expected a message object')

  const properties = new Map()

  while (true) {
    const nextToken = tokenizer.peek()
    if (nextToken.value === '}') {
      tokenizer.next()
      return { kind: 'object', properties }
    }

    const keyToken = tokenizer.next()
    if (keyToken.type !== 'identifier' && keyToken.type !== 'string') {
      throw new CatalogParseError('expected a message key')
    }
    if (properties.has(keyToken.value)) {
      throw new CatalogParseError('duplicate message key')
    }

    expectToken(tokenizer, ':', 'expected a message key separator')
    const valueToken = tokenizer.next()

    let value
    if (valueToken.value === '{') {
      value = parseMessageObject(tokenizer, valueToken)
    } else if (valueToken.type === 'string') {
      value = { kind: 'string', value: valueToken.value }
    } else {
      value = { kind: 'invalid' }
    }

    properties.set(keyToken.value, value)

    const separator = tokenizer.next()
    if (separator.value === '}') return { kind: 'object', properties }
    if (separator.value !== ',')
      throw new CatalogParseError('expected a message property separator')
  }
}

function parseCatalogComposition(source, locale) {
  const declaration = new RegExp(`\\bexport\\s+const\\s+${locale}\\s*=`).exec(source)
  if (!declaration) throw new CatalogParseError('missing locale catalog export')

  const tokenizer = new TypeScriptTokenizer(source, declaration.index + declaration[0].length)
  expectToken(tokenizer, '{', 'expected a locale catalog object')

  const namespaces = new Map()

  while (true) {
    const nextToken = tokenizer.peek()
    if (nextToken.value === '}') {
      tokenizer.next()
      return namespaces
    }

    const keyToken = tokenizer.next()
    if (keyToken.type !== 'identifier' && keyToken.type !== 'string') {
      throw new CatalogParseError('expected a locale namespace key')
    }
    if (namespaces.has(keyToken.value)) {
      throw new CatalogParseError('duplicate locale namespace key')
    }

    const separator = tokenizer.next()
    let binding = keyToken.value

    if (separator.value === ':') {
      const bindingToken = tokenizer.next()
      if (bindingToken.type !== 'identifier') {
        throw new CatalogParseError('locale namespace must reference an imported module')
      }
      binding = bindingToken.value
    } else if (separator.value !== ',' && separator.value !== '}') {
      throw new CatalogParseError('expected a locale namespace property separator')
    }

    namespaces.set(keyToken.value, binding)

    if (separator.value === '}') return namespaces
    if (separator.value === ',') continue

    const propertySeparator = tokenizer.next()
    if (propertySeparator.value === '}') return namespaces
    if (propertySeparator.value !== ',') {
      throw new CatalogParseError('expected a locale namespace property separator')
    }
  }
}

function parseNamedImports(source) {
  const imports = new Map()
  const importPattern = /import\s*{\s*([^}]+)\s*}\s*from\s*(['"])(\.[^'"]+)\2\s*;?/g

  for (const match of source.matchAll(importPattern)) {
    for (const specifier of match[1].split(',')) {
      const importMatch = /^\s*([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*$/.exec(
        specifier,
      )
      if (!importMatch) continue

      const imported = importMatch[1]
      const local = importMatch[2] ?? imported
      imports.set(local, { imported, specifier: match[3] })
    }
  }

  return imports
}

function resolveTypeScriptModule(sourceFile, specifier) {
  const pathWithoutExtension = resolve(dirname(sourceFile), specifier)
  return extname(pathWithoutExtension) === '.ts'
    ? pathWithoutExtension
    : `${pathWithoutExtension}.ts`
}

function ensureModuleIsWithinLocaleDirectory(localeDirectory, modulePath) {
  const moduleRelativePath = relative(localeDirectory, modulePath)
  if (
    moduleRelativePath === '..' ||
    moduleRelativePath.startsWith(`..${sep}`) ||
    isAbsolute(moduleRelativePath)
  ) {
    throw new CatalogParseError('locale namespace import resolves outside its locale directory')
  }
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function parseNamespaceModule(modulePath, exportName) {
  const source = await readFile(modulePath, 'utf8')
  const declaration = new RegExp(
    `\\bexport\\s+const\\s+${escapeRegularExpression(exportName)}\\s*=`,
  ).exec(source)
  if (!declaration) throw new CatalogParseError('missing namespace object export')

  const tokenizer = new TypeScriptTokenizer(source, declaration.index + declaration[0].length)
  return parseMessageObject(tokenizer)
}

async function parseLocaleCatalog(locale) {
  const localeDirectory = resolve(localeRoot, locale)
  const indexPath = join(localeDirectory, 'index.ts')
  const indexSource = await readFile(indexPath, 'utf8')
  const imports = parseNamedImports(indexSource)
  const composition = parseCatalogComposition(indexSource, locale)
  const properties = new Map()

  for (const [namespace, binding] of composition) {
    const importedModule = imports.get(binding)
    if (!importedModule) {
      throw new CatalogParseError('locale namespace does not reference an imported module')
    }

    const modulePath = resolveTypeScriptModule(indexPath, importedModule.specifier)
    ensureModuleIsWithinLocaleDirectory(localeDirectory, modulePath)
    properties.set(namespace, await parseNamespaceModule(modulePath, importedModule.imported))
  }

  return { kind: 'object', properties }
}

function flattenCatalog(node, prefix = '', paths = new Map()) {
  if (node.kind !== 'object') {
    paths.set(prefix, node)
    return paths
  }

  for (const [key, value] of node.properties) {
    const path = prefix ? `${prefix}.${key}` : key
    paths.set(path, value)
    if (value.kind === 'object') flattenCatalog(value, path, paths)
  }

  return paths
}

function addDiagnostic(diagnostics, locale, keyPath, reason) {
  diagnostics.push({ locale, keyPath, reason })
}

function validateBaseCatalog(baseCatalog, diagnostics) {
  const paths = flattenCatalog(baseCatalog)
  const leaves = [...paths.values()].filter((entry) => entry.kind !== 'object')

  if (leaves.length === 0) {
    addDiagnostic(diagnostics, baseLocale, '<catalog>', 'base catalog has no message leaves')
  }

  for (const [keyPath, entry] of paths) {
    if (entry.kind === 'invalid') {
      addDiagnostic(diagnostics, baseLocale, keyPath, 'message leaf must be a string')
    }
    if (entry.kind === 'string' && entry.value.trim().length === 0) {
      addDiagnostic(diagnostics, baseLocale, keyPath, 'translation must not be blank')
    }
  }

  return paths
}

function compareCatalogs(baseNode, localeNode, locale, keyPath, diagnostics) {
  if (baseNode.kind === 'object') {
    if (!localeNode) {
      addDiagnostic(diagnostics, locale, keyPath || '<catalog>', 'missing namespace')
      return
    }
    if (localeNode.kind !== 'object') {
      addDiagnostic(diagnostics, locale, keyPath, 'expected an object namespace')
      return
    }

    for (const key of [...baseNode.properties.keys()].sort()) {
      const path = keyPath ? `${keyPath}.${key}` : key
      compareCatalogs(
        baseNode.properties.get(key),
        localeNode.properties.get(key),
        locale,
        path,
        diagnostics,
      )
    }

    for (const key of [...localeNode.properties.keys()].sort()) {
      if (!baseNode.properties.has(key)) {
        const path = keyPath ? `${keyPath}.${key}` : key
        addDiagnostic(diagnostics, locale, path, 'unexpected key')
      }
    }

    return
  }

  if (!localeNode) {
    addDiagnostic(diagnostics, locale, keyPath, 'missing translation')
    return
  }
  if (localeNode.kind !== 'string') {
    addDiagnostic(diagnostics, locale, keyPath, 'expected a string translation')
    return
  }
  if (localeNode.value.trim().length === 0) {
    addDiagnostic(diagnostics, locale, keyPath, 'translation must not be blank')
  }
}

async function discoverLocales() {
  const entries = await readdir(localeRoot, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

async function main() {
  log('info', 'Starting editor locale validation.', {
    catalogPath: 'packages/editor/src/i18n',
  })

  const locales = await discoverLocales()
  log('debug', 'Discovered editor locale catalogs.', {
    catalogPath: 'packages/editor/src/i18n',
    locales,
    localeCount: locales.length,
  })

  const diagnostics = []
  if (!locales.includes(baseLocale)) {
    addDiagnostic(diagnostics, baseLocale, '<catalog>', 'missing base locale directory')
  }

  let baseCatalog
  if (diagnostics.length === 0) {
    try {
      baseCatalog = await parseLocaleCatalog(baseLocale)
      const basePaths = validateBaseCatalog(baseCatalog, diagnostics)
      log('debug', 'Parsed base editor locale catalog.', {
        locale: baseLocale,
        messagePathCount: basePaths.size,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown parsing failure'
      addDiagnostic(diagnostics, baseLocale, '<catalog>', `catalog cannot be parsed: ${reason}`)
    }
  }

  if (baseCatalog && diagnostics.length === 0) {
    for (const locale of locales.filter((candidate) => candidate !== baseLocale)) {
      try {
        const catalog = await parseLocaleCatalog(locale)
        const paths = flattenCatalog(catalog)
        log('debug', 'Parsed editor locale catalog.', {
          locale,
          messagePathCount: paths.size,
        })
        compareCatalogs(baseCatalog, catalog, locale, '', diagnostics)
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown parsing failure'
        addDiagnostic(diagnostics, locale, '<catalog>', `catalog cannot be parsed: ${reason}`)
      }
    }
  }

  diagnostics.sort(
    (left, right) =>
      left.locale.localeCompare(right.locale) ||
      left.keyPath.localeCompare(right.keyPath) ||
      left.reason.localeCompare(right.reason),
  )

  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) {
      log('error', 'Editor locale validation error.', diagnostic)
    }
    log('error', 'Editor locale validation failed.', { failureCount: diagnostics.length })
    process.exitCode = 1
    return
  }

  log('info', 'Editor locale validation completed.', { localeCount: locales.length })
}

main().catch((error) => {
  const reason = error instanceof Error ? error.message : 'unknown validation failure'
  log('error', 'Editor locale validation failed.', { reason })
  process.exitCode = 1
})
