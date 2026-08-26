import { TOP_LEVEL_BLOCK_ID_NODE_TYPES } from '../extensions/block-id.js'
import { createLogger } from '../utils/logger.js'
import { isSchemaContractUrlSafe, validateSchemaDocument } from './document-validator.js'
import type { ExecutableValidationRule, ValidationRule } from './types.js'

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

/**
 * JSON-safe validation metadata embedded in {@link SchemaContract}.
 *
 * @example
 * const portableRules = JSON.stringify(schemaRuleDefinitions)
 */
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
    description:
      'Block IDs are allowed only on supported direct children of doc; mention.id is a separate reference attribute.',
    affectedNodes: [...TOP_LEVEL_BLOCK_ID_NODE_TYPES],
    affectedAttributes: ['id'],
    constraint: {
      parent: 'doc',
      depth: 1,
      valueType: 'string',
      semanticOwner: 'UniqueID',
      exceptions: [{ node: 'mention', semanticOwner: 'mention-reference' }],
    },
  },
  {
    id: 'block-role',
    description:
      'blockRole is allowed only on supported direct doc children and must match the host-provided editor initialization allowlist.',
    affectedNodes: [...TOP_LEVEL_BLOCK_ID_NODE_TYPES],
    affectedAttributes: ['blockRole'],
    constraint: {
      parent: 'doc',
      depth: 1,
      valueType: 'non-empty-string',
      allowlistSource: 'NotionEditorProps.blockRoles',
    },
  },
  {
    id: 'safe-url',
    description: 'Link href and image src must use an allowlisted URL scheme.',
    affectedNodes: ['image'],
    affectedMarks: ['link'],
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

export { isSchemaContractUrlSafe, validateSchemaDocument }

/**
 * Executable public validation rules for hosts that apply checks selectively.
 *
 * @example
 * const urlResult = schemaValidationRules
 *   .find(rule => rule.id === 'safe-url')
 *   ?.validate(candidateDocument)
 */
export const schemaValidationRules: readonly ExecutableValidationRule[] = schemaRuleDefinitions.map(
  (definition) => ({
    ...definition,
    validate(document, options) {
      const errors = validateSchemaDocument(document, options).errors.filter(
        ({ rule }) => rule === definition.id,
      )
      return { valid: errors.length === 0, errors }
    },
  }),
)

logger.debug('validation rules loaded', { ruleCount: schemaRuleDefinitions.length })
