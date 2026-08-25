import { getSchema, type Extensions, type JSONContent } from '@tiptap/core'
import type {
  AttributeSpec,
  ContentMatch,
  MarkType,
  NodeType,
  ParseRule,
  Schema,
} from '@tiptap/pm/model'
import { CURRENT_SCHEMA_VERSION } from '../migrations/index.js'
import { createRendererExtensionKit } from '../extensions/renderer-extension-kit.js'
import { createLogger } from '../utils/logger.js'
import { getAttributeMetadata, inferAttributeType } from './attribute-metadata.js'
import { schemaRuleDefinitions } from './rules.js'
import type {
  AttributeDefinition,
  HTMLMapping,
  HTMLParseRule,
  HTMLRenderRule,
  MarkDefinition,
  NodeDefinition,
  SchemaContract,
  SchemaContractJsonValue,
} from './types.js'

const logger = createLogger('SchemaContract')

function toJsonValue(value: unknown): SchemaContractJsonValue {
  if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) {
    return value as string | number | boolean | null
  }
  if (Array.isArray(value)) return value.map(toJsonValue)
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => typeof entry !== 'function' && entry !== undefined)
        .map(([key, entry]) => [key, toJsonValue(entry)]),
    )
  }
  return String(value)
}

function extractAttributes(
  attributes: Readonly<Record<string, AttributeSpec>> = {},
): Record<string, AttributeDefinition> {
  return Object.fromEntries(
    Object.entries(attributes).map(([name, attribute]) => {
      const metadata = getAttributeMetadata(name)
      const hasDefault = Object.hasOwn(attribute, 'default')
      const defaultValue = hasDefault ? toJsonValue(attribute.default) : null
      const definition: AttributeDefinition = {
        type: inferAttributeType(name, defaultValue),
        default: defaultValue,
        required: !hasDefault,
        ...(metadata?.enum ? { enum: metadata.enum } : {}),
      }
      return [name, definition]
    }),
  )
}

function serializeParseRule(rule: ParseRule): HTMLParseRule {
  const candidate = rule as ParseRule & {
    tag?: string
    style?: string
    priority?: number
    consuming?: boolean
    contentElement?: string | ((node: Node) => HTMLElement)
    getAttrs?: unknown
  }
  return {
    ...(candidate.tag ? { tag: candidate.tag } : {}),
    ...(candidate.style ? { style: candidate.style } : {}),
    ...(candidate.priority === undefined ? {} : { priority: candidate.priority }),
    ...(candidate.consuming === undefined ? {} : { consuming: candidate.consuming }),
    ...(typeof candidate.contentElement === 'string'
      ? { contentElement: candidate.contentElement }
      : {}),
    ...(typeof candidate.getAttrs === 'function'
      ? { getAttrs: candidate.getAttrs.toString() }
      : {}),
  }
}

function renderNode(type: NodeType): HTMLRenderRule {
  if (type.isText) return { strategy: 'text', output: '#text' }
  if (!type.spec.toDOM) return { strategy: 'none', output: null }

  try {
    const node = type.createAndFill() ?? type.create()
    return {
      strategy: 'dom-output-spec',
      output: toJsonValue(type.spec.toDOM(node)),
      source: type.spec.toDOM.toString(),
    }
  } catch (error) {
    logger.warn('unable to evaluate node render mapping', { node: type.name, error })
    return {
      strategy: 'dom-output-spec',
      output: null,
      source: type.spec.toDOM.toString(),
    }
  }
}

function renderMark(type: MarkType): HTMLRenderRule {
  if (!type.spec.toDOM) return { strategy: 'none', output: null }
  try {
    return {
      strategy: 'dom-output-spec',
      output: toJsonValue(type.spec.toDOM(type.create(), false)),
      source: type.spec.toDOM.toString(),
    }
  } catch (error) {
    logger.warn('unable to evaluate mark render mapping', { mark: type.name, error })
    return {
      strategy: 'dom-output-spec',
      output: null,
      source: type.spec.toDOM.toString(),
    }
  }
}

function htmlMapping(
  parseDOM: readonly ParseRule[] | undefined,
  render: HTMLRenderRule,
): HTMLMapping {
  return {
    parseRules: (parseDOM ?? []).map(serializeParseRule),
    render,
  }
}

function collectAllowedChildNames(contentMatch: ContentMatch): string[] {
  const names = new Set<string>()
  const visited = new Set<ContentMatch>()
  const pending = [contentMatch]

  while (pending.length > 0) {
    const match = pending.pop()
    if (!match || visited.has(match)) continue
    visited.add(match)

    for (let index = 0; index < match.edgeCount; index += 1) {
      const edge = match.edge(index)
      names.add(edge.type.name)
      pending.push(edge.next)
    }
  }

  return [...names].sort()
}

function allowedChildren(type: NodeType): string[] {
  if (type.isText || type.isLeaf) return []
  const names = collectAllowedChildNames(type.contentMatch)
  logger.debug('content model parsed', {
    node: type.name,
    expression: type.spec.content ?? null,
    allowedChildren: names,
  })
  return names
}

function allowedParents(type: NodeType, schema: Schema): string[] {
  if (type.name === schema.topNodeType.name) return []
  return Object.values(schema.nodes)
    .filter(
      (candidate) =>
        !candidate.isLeaf && collectAllowedChildNames(candidate.contentMatch).includes(type.name),
    )
    .map(({ name }) => name)
    .sort()
}

/**
 * Converts a live ProseMirror node type to JSON-safe public metadata.
 *
 * @example
 * const paragraph = extractNodeDefinition(schema.nodes.paragraph, schema)
 */
export function extractNodeDefinition(type: NodeType, schema: Schema): NodeDefinition {
  logger.debug('extract node definition', { node: type.name })
  const definition: NodeDefinition = {
    name: type.name,
    group: (type.spec.group ?? '').split(/\s+/).filter(Boolean),
    content: type.spec.content ?? null,
    kind: type.isText ? 'text' : type.isInline ? 'inline' : 'block',
    atom: type.isAtom,
    draggable: type.spec.draggable ?? false,
    selectable: type.spec.selectable ?? true,
    attributes: extractAttributes(type.spec.attrs),
    allowedParents: allowedParents(type, schema),
    allowedChildren: allowedChildren(type),
    html: htmlMapping(type.spec.parseDOM, renderNode(type)),
  }
  logger.debug('node definition extracted', {
    node: type.name,
    attributes: Object.keys(definition.attributes),
    allowedParents: definition.allowedParents,
    allowedChildren: definition.allowedChildren,
  })
  return definition
}

/** Converts a live ProseMirror mark type to JSON-safe public metadata. */
export function extractMarkDefinition(type: MarkType, schema: Schema): MarkDefinition {
  logger.debug('extract mark definition', { mark: type.name })
  return {
    name: type.name,
    group: (type.spec.group ?? '').split(/\s+/).filter(Boolean),
    attributes: extractAttributes(type.spec.attrs),
    applicableNodeTypes: Object.values(schema.nodes)
      .filter((nodeType) => nodeType.allowsMarkType(type))
      .map(({ name }) => name)
      .sort(),
    html: htmlMapping(type.spec.parseDOM, renderMark(type)),
  }
}

/**
 * Builds a fresh schema contract from registered Tiptap extensions.
 * Pass an explicit kit to audit a consumer-specific schema variant.
 *
 * @example
 * const contract = buildSchemaContract(createRendererExtensionKit())
 */
export function buildSchemaContract(
  extensions: Extensions = createRendererExtensionKit(),
): SchemaContract {
  logger.debug('build contract start', { extensionCount: extensions.length })
  const schema = getSchema(extensions)
  const contract: SchemaContract = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    nodes: Object.values(schema.nodes).map((type) => extractNodeDefinition(type, schema)),
    marks: Object.values(schema.marks).map((type) => extractMarkDefinition(type, schema)),
    rules: schemaRuleDefinitions,
  }
  logger.info('build contract complete', {
    schemaVersion: contract.schemaVersion,
    nodeCount: contract.nodes.length,
    markCount: contract.marks.length,
    ruleCount: contract.rules.length,
  })
  return contract
}

let cachedContract: SchemaContract | undefined

/**
 * Returns the cached canonical renderer contract.
 * Use {@link buildSchemaContract} when a fresh or custom-kit snapshot is required.
 *
 * @example
 * const version = getSchemaContract().schemaVersion
 */
export function getSchemaContract(): SchemaContract {
  if (!cachedContract) cachedContract = buildSchemaContract()
  return cachedContract
}

/** Utility used by tests and hosts that need a typed JSON clone. */
export function cloneSchemaDocument(document: JSONContent): JSONContent {
  return structuredClone(document)
}
