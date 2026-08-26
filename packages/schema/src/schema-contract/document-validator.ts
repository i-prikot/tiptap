import { getSchema, type JSONContent } from '@tiptap/core'
import { TOP_LEVEL_BLOCK_ID_NODE_TYPES } from '../extensions/block-id.js'
import { isValidBlockRole } from '../extensions/block-role.js'
import { createRendererExtensionKit } from '../extensions/renderer-extension-kit.js'
import { createLogger } from '../utils/logger.js'
import { sanitizeUrl } from '../utils/tiptap-utils.js'
import { ATTRIBUTE_METADATA } from './attribute-metadata.js'
import type {
  AttributeValueType,
  SchemaDocumentValidationOptions,
  SchemaValidationError,
  SchemaValidationResult,
} from './types.js'

const logger = createLogger('SchemaContractRules')
const supportedTopLevelNodes = new Set<string>(TOP_LEVEL_BLOCK_ID_NODE_TYPES)

type DocumentObject = Record<string, unknown>

function isObject(value: unknown): value is DocumentObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function addError(
  errors: SchemaValidationError[],
  rule: string,
  path: string,
  message: string,
): void {
  errors.push({ rule, path, message })
}

/**
 * Returns true when a URL is relative or uses the published safe-scheme allowlist.
 *
 * @example
 * isSchemaContractUrlSafe('https://example.com/image.png') // true
 * isSchemaContractUrlSafe('javascript:alert(1)') // false
 */
export function isSchemaContractUrlSafe(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) return false
  return sanitizeUrl(value, 'https://schema-contract.invalid/') !== '#'
}

function valueMatchesType(value: unknown, type: AttributeValueType): boolean {
  if (value === null) return true
  if (type === 'array') return Array.isArray(value)
  if (type === 'object') return isObject(value)
  if (type === 'enum') return ['string', 'number', 'boolean'].includes(typeof value)
  return typeof value === type
}

function validateOwnedAttributes(
  attrs: DocumentObject,
  nodeType: string,
  parentType: string | null,
  path: string,
  errors: SchemaValidationError[],
  blockRoles: readonly string[] | undefined,
): void {
  if ('blockId' in attrs) {
    addError(errors, 'legacy-block-id', `${path}.attrs.blockId`, 'blockId is deprecated.')
  }

  if (attrs.id != null && nodeType !== 'mention') {
    if (parentType !== 'doc' || !supportedTopLevelNodes.has(nodeType)) {
      addError(
        errors,
        'top-level-id',
        `${path}.attrs.id`,
        'id is allowed only on supported direct children of doc.',
      )
    } else if (typeof attrs.id !== 'string' || attrs.id.trim().length === 0) {
      addError(errors, 'attribute-type', `${path}.attrs.id`, 'id must be a non-empty string.')
    }
  }

  if (attrs.blockRole == null) return
  if (parentType !== 'doc' || !supportedTopLevelNodes.has(nodeType)) {
    addError(
      errors,
      'block-role',
      `${path}.attrs.blockRole`,
      'blockRole is allowed only on supported direct children of doc.',
    )
  } else if (!isValidBlockRole(attrs.blockRole, blockRoles)) {
    addError(
      errors,
      'block-role',
      `${path}.attrs.blockRole`,
      blockRoles
        ? 'blockRole must be included in the host-provided blockRoles configuration.'
        : 'blockRole must be a non-empty string.',
    )
  }
}

function validateAttributeTypes(
  attrs: DocumentObject,
  path: string,
  errors: SchemaValidationError[],
): void {
  for (const [name, metadata] of Object.entries(ATTRIBUTE_METADATA)) {
    const value = attrs[name]
    if (value === undefined) continue
    if (!valueMatchesType(value, metadata.type)) {
      addError(
        errors,
        'attribute-type',
        `${path}.attrs.${name}`,
        `${name} must be ${metadata.type}.`,
      )
      continue
    }
    if (
      value !== null &&
      metadata.enum &&
      !metadata.enum.some((candidate) => Object.is(candidate, value))
    ) {
      addError(
        errors,
        name === 'blockRole' ? 'block-role' : 'attribute-type',
        `${path}.attrs.${name}`,
        `${name} is outside its published enum.`,
      )
    }
  }
}

function validateAttributes(
  node: DocumentObject,
  nodeType: string,
  parentType: string | null,
  path: string,
  errors: SchemaValidationError[],
  blockRoles: readonly string[] | undefined,
): void {
  const attrs = isObject(node.attrs) ? node.attrs : {}
  validateOwnedAttributes(attrs, nodeType, parentType, path, errors, blockRoles)
  validateAttributeTypes(attrs, path, errors)

  if (nodeType === 'image' && attrs.src != null && !isSchemaContractUrlSafe(attrs.src)) {
    addError(errors, 'safe-url', `${path}.attrs.src`, 'Image src uses an unsafe URL scheme.')
  }
}

function validateMarks(node: DocumentObject, path: string, errors: SchemaValidationError[]): void {
  if (!Array.isArray(node.marks)) return
  node.marks.forEach((mark, index) => {
    if (!isObject(mark)) return
    const attrs = isObject(mark.attrs) ? mark.attrs : {}
    const markPath = `${path}.marks[${index}]`
    validateAttributeTypes(attrs, markPath, errors)
    if (mark.type !== 'link') return
    if (!isSchemaContractUrlSafe(attrs.href)) {
      addError(errors, 'safe-url', `${markPath}.attrs.href`, 'Link href uses an unsafe URL scheme.')
    }
  })
}

function walkDocument(
  node: unknown,
  parentType: string | null,
  path: string,
  errors: SchemaValidationError[],
  blockRoles: readonly string[] | undefined,
): void {
  if (!isObject(node)) return
  const nodeType = typeof node.type === 'string' ? node.type : ''
  validateAttributes(node, nodeType, parentType, path, errors, blockRoles)
  validateMarks(node, path, errors)

  if (!Array.isArray(node.content)) return
  node.content.forEach((child, index) => {
    walkDocument(child, nodeType, `${path}.content[${index}]`, errors, blockRoles)
  })
}

function validateSchemaContent(document: JSONContent, errors: SchemaValidationError[]): void {
  try {
    const schema = getSchema(createRendererExtensionKit())
    schema.nodeFromJSON(document).check()
  } catch (error) {
    addError(
      errors,
      'schema-content',
      '$',
      error instanceof Error ? error.message : 'Document does not satisfy the registered schema.',
    )
  }
}

/**
 * Validates Tiptap JSON without creating an editor instance.
 *
 * @example
 * const result = validateSchemaDocument(document)
 * if (!result.valid) console.error(result.errors)
 */
export function validateSchemaDocument(
  document: JSONContent,
  options: SchemaDocumentValidationOptions = {},
): SchemaValidationResult {
  logger.debug('validate document start', {
    rootType: document.type ?? null,
    configuredBlockRoleCount: options.blockRoles?.length ?? null,
  })
  const errors: SchemaValidationError[] = []
  validateSchemaContent(document, errors)
  walkDocument(document, null, '$', errors, options.blockRoles)
  const result = { valid: errors.length === 0, errors }
  logger.debug('validate document complete', {
    valid: result.valid,
    errorCount: result.errors.length,
    rules: result.errors.map(({ rule }) => rule),
  })
  return result
}
