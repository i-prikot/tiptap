import type { JSONContent } from '@tiptap/core'

/** JSON values accepted by the published machine-readable contract. */
export type SchemaContractJsonValue =
  | string
  | number
  | boolean
  | null
  | SchemaContractJsonValue[]
  | { [key: string]: SchemaContractJsonValue }

/** Primitive shape enforced for a JSON document attribute. */
export type AttributeValueType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum'

/**
 * Machine-readable attribute metadata derived from the live Tiptap schema.
 *
 * @example
 * const level: AttributeDefinition = {
 *   type: 'number',
 *   default: 1,
 *   required: false,
 *   enum: [1, 2, 3, 4, 5, 6],
 * }
 */
export interface AttributeDefinition {
  /** JSON primitive expected for non-null values. */
  type: AttributeValueType
  /** ProseMirror default, or null when the attribute is required. */
  default: SchemaContractJsonValue
  /** Whether the underlying schema omits a default. */
  required: boolean
  /** Closed set of values when the attribute is enumerated. */
  enum?: readonly SchemaContractJsonValue[]
}

/** Serializable representation of a Tiptap HTML parse rule. */
export interface HTMLParseRule {
  tag?: string
  style?: string
  priority?: number
  consuming?: boolean
  contentElement?: string
  getAttrs?: string
}

/** Serializable representation of a Tiptap render rule. */
export interface HTMLRenderRule {
  strategy: 'dom-output-spec' | 'text' | 'none'
  output: SchemaContractJsonValue
  source?: string
}

/**
 * HTML parsing and rendering metadata intended for SSR integrations.
 *
 * @example
 * const paragraphMapping = contract.nodes.find(node => node.name === 'paragraph')?.html
 */
export interface HTMLMapping {
  parseRules: readonly HTMLParseRule[]
  render: HTMLRenderRule
}

/**
 * Public description of one node in the registered renderer schema.
 *
 * @example
 * const image = contract.nodes.find(node => node.name === 'image') satisfies
 *   | NodeDefinition
 *   | undefined
 */
export interface NodeDefinition {
  /** ProseMirror node type name. */
  name: string
  /** ProseMirror groups declared by the node spec. */
  group: readonly string[]
  /** Original ProseMirror content expression. */
  content: string | null
  /** Coarse document placement category. */
  kind: 'block' | 'inline' | 'text'
  /** Whether ProseMirror treats the node as an indivisible unit. */
  atom: boolean
  /** Whether the node is directly draggable. */
  draggable: boolean
  /** Whether the node supports node selection. */
  selectable: boolean
  /** Attributes registered by node and global extensions. */
  attributes: Readonly<Record<string, AttributeDefinition>>
  /** Node types that can accept this node as their first child. */
  allowedParents: readonly string[]
  /** Node types that this node can accept as their first child. */
  allowedChildren: readonly string[]
  /** Serializable HTML parse and render description. */
  html: HTMLMapping
}

/**
 * Public description of one mark in the registered renderer schema.
 *
 * @example
 * const link = contract.marks.find(mark => mark.name === 'link') satisfies
 *   | MarkDefinition
 *   | undefined
 */
export interface MarkDefinition {
  /** ProseMirror mark type name. */
  name: string
  /** ProseMirror groups declared by the mark spec. */
  group: readonly string[]
  /** Attributes registered by the mark and global extensions. */
  attributes: Readonly<Record<string, AttributeDefinition>>
  /** Nodes whose mark sets permit this mark. */
  applicableNodeTypes: readonly string[]
  /** Serializable HTML parse and render description. */
  html: HTMLMapping
}

/**
 * Serializable validation rule metadata embedded in the contract.
 *
 * @example
 * const safeUrlRule = contract.rules.find(rule => rule.id === 'safe-url') satisfies
 *   | ValidationRule
 *   | undefined
 */
export interface ValidationRule {
  /** Stable identifier returned in validation errors. */
  id: string
  /** Human-readable rule intent. */
  description: string
  /** Node types affected by this rule; `*` means all nodes. */
  affectedNodes: readonly string[]
  /** Attributes affected by this rule; `*` means all attributes. */
  affectedAttributes: readonly string[]
  /** Data-only rule parameters for non-JavaScript hosts. */
  constraint: Readonly<Record<string, SchemaContractJsonValue>>
}

/** A validation rule with the JavaScript validator attached. */
export interface ExecutableValidationRule extends ValidationRule {
  validate(document: JSONContent): SchemaValidationResult
}

/**
 * Root of the published, JSON-serializable schema contract.
 *
 * @example
 * const contract: SchemaContract = getSchemaContract()
 * const portableJson = JSON.stringify(contract)
 */
export interface SchemaContract {
  /** Persisted JSON schema version, equal to CURRENT_SCHEMA_VERSION. */
  schemaVersion: number
  /** Complete registered node catalog. */
  nodes: readonly NodeDefinition[]
  /** Complete registered mark catalog. */
  marks: readonly MarkDefinition[]
  /** JSON-safe contract validation metadata. */
  rules: readonly ValidationRule[]
}

/** One document validation failure. */
export interface SchemaValidationError {
  rule: string
  path: string
  message: string
}

/** Result returned by {@link validateSchemaDocument}. */
export interface SchemaValidationResult {
  valid: boolean
  errors: readonly SchemaValidationError[]
}

/**
 * Document known to satisfy the published schema contract.
 *
 * @example
 * const fixture: ValidFixture = validDocuments[0]
 */
export interface ValidFixture {
  key: string
  description: string
  document: JSONContent
}

/**
 * Document intentionally violating one published validation rule.
 *
 * @example
 * const fixture: InvalidFixture = invalidDocuments[0]
 * validateSchemaDocument(fixture.document).errors.some(
 *   error => error.rule === fixture.expectedError,
 * )
 */
export interface InvalidFixture extends ValidFixture {
  expectedError: string
}
