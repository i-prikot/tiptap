import type { AttributeValueType, SchemaContractJsonValue } from './types.js'

interface AttributeMetadata {
  type: AttributeValueType
  enum?: readonly SchemaContractJsonValue[]
}

export const ATTRIBUTE_METADATA: Readonly<Record<string, AttributeMetadata>> = {
  id: { type: 'string' },
  blockRole: { type: 'string' },
  level: { type: 'number', enum: [1, 2, 3, 4, 5, 6] },
  start: { type: 'number' },
  checked: { type: 'boolean' },
  colspan: { type: 'number' },
  rowspan: { type: 'number' },
  colwidth: { type: 'array' },
  src: { type: 'string' },
  lqip: { type: 'string' },
  alt: { type: 'string' },
  title: { type: 'string' },
  width: { type: 'number' },
  height: { type: 'number' },
  showCaption: { type: 'boolean' },
  topOffset: { type: 'number' },
  maxShowCount: { type: 'number' },
  showTitle: { type: 'boolean' },
  latex: { type: 'string' },
  href: { type: 'string' },
  target: { type: 'string' },
  rel: { type: 'string' },
  class: { type: 'string' },
  color: { type: 'string' },
  backgroundColor: { type: 'string' },
  nodeTextAlign: { type: 'enum', enum: ['left', 'center', 'right', 'justify'] },
  nodeVerticalAlign: { type: 'enum', enum: ['top', 'middle', 'bottom'] },
  textAlign: { type: 'enum', enum: ['left', 'center', 'right', 'justify'] },
  indent: { type: 'number' },
  'data-align': { type: 'enum', enum: ['left', 'center', 'right'] },
  language: { type: 'string' },
  label: { type: 'string' },
  mentionSuggestionChar: { type: 'string' },
  'data-toc-id': { type: 'string' },
  accept: { type: 'string' },
  align: { type: 'string' },
  limit: { type: 'number' },
  maxSize: { type: 'number' },
  name: { type: 'string' },
  type: { type: 'string' },
}

export function getAttributeMetadata(name: string) {
  return ATTRIBUTE_METADATA[name]
}

export function inferAttributeType(name: string, defaultValue: unknown): AttributeValueType {
  const configured = getAttributeMetadata(name)?.type
  if (configured) return configured
  if (Array.isArray(defaultValue)) return 'array'
  if (defaultValue !== null && typeof defaultValue === 'object') return 'object'
  if (typeof defaultValue === 'number') return 'number'
  if (typeof defaultValue === 'boolean') return 'boolean'
  return 'string'
}
