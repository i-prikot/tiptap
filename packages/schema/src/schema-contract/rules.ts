import { getSchema, type JSONContent } from '@tiptap/core'
import { TOP_LEVEL_BLOCK_ID_NODE_TYPES } from '../extensions/block-id.js'
import { CANONICAL_BLOCK_ROLES } from '../extensions/block-role.js'
import { createRendererExtensionKit } from '../extensions/renderer-extension-kit.js'
import { createLogger } from '../utils/logger.js'
import { sanitizeUrl } from '../utils/tiptap-utils.js'
import type {
  SchemaValidationError,
  SchemaValidationResult,
  ExecutableValidationRule,
  ValidationRule,
} from './types.js'

/** Canonical roles serialized by new editor and renderer instances. */
export const SCHEMA_CONTRACT_BLOCK_ROLES = CANONICAL_BLOCK_ROLES

const SAFE_URL_SCHEMES = [
  'http',
  'https',
  'ftp',
  'ftps',
  'mailto',
  'tel',
  'callto',
  'sms',
  'cid',
  'xmpp',
] as const

const logger = createLogger('SchemaContractRules')
const supportedTopLevelNodes = new Set<string>(TOP_LEVEL_BLOCK_ID_NODE_TYPES)

/** JSON-safe validation metadata embedded in {@link SchemaContract}. */
export const schemaRuleDefinitions: readonly ValidationRule[] = [
  {
    id: 'schema-content',
    description: 'Node and mark names and their nesting must satisfy the registered schema.',
    affectedNodes: ['*'],
    affectedAttributes: [],
    constraint: { source: 'registered-renderer-schema' },
  },
  {
    id: 'top-level-id',
    description: 'id is allowed only on supported direct children of doc.',
    affectedNodes: [...TOP_LEVEL_BLOCK_ID_NODE_TYPES],
    affectedAttributes: ['id'],
    constraint: { parent: 'doc', depth: 1, valueType: 'string' },
  },
  {
    id: 'block-role',
    description: 'blockRole is allowed only on supported direct doc children and canonical roles.',
    affectedNodes: [...TOP_LEVEL_BLOCK_ID_NODE_TYPES],
    affectedAttributes: ['blockRole'],
    constraint: { parent: 'doc', depth: 1, enum: [...SCHEMA_CONTRACT_BLOCK_ROLES] },
  },
  {
    id: 'safe-url',
    description: 'Link href and image src must use an allowlisted URL scheme.',
    affectedNodes: ['image'],
    affectedAttributes: ['href', 'src'],
    constraint: { schemes: [...SAFE_URL_SCHEMES], relative: true },
  },
  {
    id: 'legacy-block-id',
    description: 'Legacy blockId is rejected and is never created or serialized by new editors.',
    affectedNodes: ['*'],
    affectedAttributes: ['blockId'],
    constraint: { forbidden: true },
  },
  {
    id: 'attribute-type',
    description: 'Known attributes must use their published JSON primitive type and enum.',
    affectedNodes: ['*'],
    affectedAttributes: ['*'],
    constraint: { source: 'schema-contract-attributes' },
  },
] as const

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

/** Returns true when a URL is relative or uses the published safe-scheme allowlist. */
export function isSchemaContractUrlSafe(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) return false
  return sanitizeUrl(value, 'https://schema-contract.invalid/') !== '#'
}

const attributeTypes: Record<
  string,
  { type: 'string' | 'number' | 'boolean' | 'array'; enum?: readonly unknown[] }
> = {
  id: { type: 'string' },
  blockRole: { type: 'string', enum: SCHEMA_CONTRACT_BLOCK_ROLES },
  level: { type: 'number', enum: [1, 2, 3, 4, 5, 6] },
  checked: { type: 'boolean' },
  colspan: { type: 'number' },
  rowspan: { type: 'number' },
  colwidth: { type: 'array' },
  src: { type: 'string' },
  lqip: { type: 'string' },
  width: { type: 'number' },
  height: { type: 'number' },
  showCaption: { type: 'boolean' },
  topOffset: { type: 'number' },
  maxShowCount: { type: 'number' },
  showTitle: { type: 'boolean' },
  indent: { type: 'number' },
}

function valueMatchesType(value: unknown, type: (typeof attributeTypes)[string]['type']): boolean {
  if (value === null) return true
  if (type === 'array') return Array.isArray(value)
  return typeof value === type
}

function validateAttributes(
  node: DocumentObject,
  nodeType: string,
  parentType: string | null,
  path: string,
  errors: SchemaValidationError[],
): void {
  const attrs = isObject(node.attrs) ? node.attrs : {}
  if ('blockId' in attrs) {
    addError(errors, 'legacy-block-id', `${path}.attrs.blockId`, 'blockId is deprecated.')
  }

  if (attrs.id != null) {
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

  if (attrs.blockRole != null) {
    if (parentType !== 'doc' || !supportedTopLevelNodes.has(nodeType)) {
      addError(
        errors,
        'block-role',
        `${path}.attrs.blockRole`,
        'blockRole is allowed only on supported direct children of doc.',
      )
    } else if (!SCHEMA_CONTRACT_BLOCK_ROLES.includes(attrs.blockRole as never)) {
      addError(
        errors,
        'block-role',
        `${path}.attrs.blockRole`,
        `blockRole must be one of ${SCHEMA_CONTRACT_BLOCK_ROLES.join(', ')}.`,
      )
    }
  }

  for (const [name, metadata] of Object.entries(attributeTypes)) {
    const value = attrs[name]
    if (value === undefined || !valueMatchesType(value, metadata.type)) {
      if (value !== undefined) {
        addError(
          errors,
          'attribute-type',
          `${path}.attrs.${name}`,
          `${name} must be ${metadata.type}.`,
        )
      }
      continue
    }
    if (value !== null && metadata.enum && !metadata.enum.includes(value)) {
      addError(
        errors,
        name === 'blockRole' ? 'block-role' : 'attribute-type',
        `${path}.attrs.${name}`,
        `${name} is outside its published enum.`,
      )
    }
  }

  if (nodeType === 'image' && attrs.src != null && !isSchemaContractUrlSafe(attrs.src)) {
    addError(errors, 'safe-url', `${path}.attrs.src`, 'Image src uses an unsafe URL scheme.')
  }
}

function validateMarks(node: DocumentObject, path: string, errors: SchemaValidationError[]): void {
  if (!Array.isArray(node.marks)) return
  node.marks.forEach((mark, index) => {
    if (!isObject(mark)) return
    if (mark.type !== 'link') return
    const attrs = isObject(mark.attrs) ? mark.attrs : {}
    if (!isSchemaContractUrlSafe(attrs.href)) {
      addError(
        errors,
        'safe-url',
        `${path}.marks[${index}].attrs.href`,
        'Link href uses an unsafe URL scheme.',
      )
    }
  })
}

function walkDocument(
  node: unknown,
  parentType: string | null,
  path: string,
  errors: SchemaValidationError[],
): void {
  if (!isObject(node)) return
  const nodeType = typeof node.type === 'string' ? node.type : ''
  validateAttributes(node, nodeType, parentType, path, errors)
  validateMarks(node, path, errors)

  if (!Array.isArray(node.content)) return
  node.content.forEach((child, index) => {
    walkDocument(child, nodeType, `${path}.content[${index}]`, errors)
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
export function validateSchemaDocument(document: JSONContent): SchemaValidationResult {
  logger.debug('validate document start', { rootType: document.type ?? null })
  const errors: SchemaValidationError[] = []
  validateSchemaContent(document, errors)
  walkDocument(document, null, '$', errors)
  const result = { valid: errors.length === 0, errors }
  logger.debug('validate document complete', {
    valid: result.valid,
    errorCount: result.errors.length,
    rules: result.errors.map(({ rule }) => rule),
  })
  return result
}

/** Executable public validation rules for hosts that apply checks selectively. */
export const schemaValidationRules: readonly ExecutableValidationRule[] = schemaRuleDefinitions.map(
  (definition) => ({
    ...definition,
    validate(document) {
      const errors = validateSchemaDocument(document).errors.filter(
        ({ rule }) => rule === definition.id,
      )
      return { valid: errors.length === 0, errors }
    },
  }),
)

logger.debug('validation rules loaded', { ruleCount: schemaRuleDefinitions.length })
