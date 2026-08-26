import type { InvalidFixture } from '../types.js'
import { createLogger } from '../../utils/logger.js'

/**
 * Documents that each demonstrate a specific contract violation.
 *
 * @example
 * for (const fixture of invalidDocuments) {
 *   const rules = validateSchemaDocument(fixture.document).errors.map(error => error.rule)
 *   if (!rules.includes(fixture.expectedError)) throw new Error(fixture.key)
 * }
 */
export const invalidDocuments: readonly InvalidFixture[] = [
  {
    key: 'nested-id',
    description: 'A paragraph nested in a blockquote cannot carry id.',
    expectedError: 'top-level-id',
    document: {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', attrs: { id: 'nested' } }],
        },
      ],
    },
  },
  {
    key: 'unsupported-id-node',
    description: 'Image is not in the canonical top-level ID node list.',
    expectedError: 'top-level-id',
    document: {
      type: 'doc',
      content: [{ type: 'image', attrs: { id: 'image-id', src: 'https://example.com/a.png' } }],
    },
  },
  {
    key: 'nested-block-role',
    description: 'Nested blocks cannot carry blockRole.',
    expectedError: 'block-role',
    document: {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', attrs: { blockRole: 'cta' } }],
        },
      ],
    },
  },
  {
    key: 'unknown-block-role',
    description: 'A role outside the host-provided editor allowlist is rejected.',
    expectedError: 'block-role',
    validationOptions: { blockRoles: ['pricing', 'cta', 'cases'] },
    document: {
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { blockRole: 'legacy' } }],
    },
  },
  {
    key: 'unsupported-block-role-node',
    description: 'Image cannot carry blockRole.',
    expectedError: 'block-role',
    document: {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'https://example.com/a.png', blockRole: 'cases' } }],
    },
  },
  {
    key: 'unsafe-link-href',
    description: 'javascript href is outside the URL scheme allowlist.',
    expectedError: 'safe-url',
    document: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Unsafe',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'unsafe-image-src',
    description: 'data image source is outside the URL scheme allowlist.',
    expectedError: 'safe-url',
    document: {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'data:image/svg+xml;base64,PHN2Zy8+' } }],
    },
  },
  {
    key: 'file-image-src',
    description: 'file image source is outside the URL scheme allowlist.',
    expectedError: 'safe-url',
    document: {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'file:///etc/passwd' } }],
    },
  },
  {
    key: 'unknown-top-level-node',
    description: 'Unknown top-level nodes are rejected.',
    expectedError: 'schema-content',
    document: { type: 'doc', content: [{ type: 'unknownBlock' }] },
  },
  {
    key: 'unknown-nested-node',
    description: 'Unknown nested nodes are rejected.',
    expectedError: 'schema-content',
    document: {
      type: 'doc',
      content: [{ type: 'blockquote', content: [{ type: 'unknownNested' }] }],
    },
  },
  {
    key: 'invalid-inline-at-doc-root',
    description: 'Text cannot be a direct child of doc.',
    expectedError: 'schema-content',
    document: { type: 'doc', content: [{ type: 'text', text: 'orphan' }] },
  },
  {
    key: 'invalid-list-nesting',
    description: 'A bullet list requires listItem children.',
    expectedError: 'schema-content',
    document: {
      type: 'doc',
      content: [{ type: 'bulletList', content: [{ type: 'paragraph' }] }],
    },
  },
  {
    key: 'string-image-width',
    description: 'Intrinsic width must be numeric.',
    expectedError: 'attribute-type',
    document: {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'https://example.com/a.png', width: '320' } }],
    },
  },
  {
    key: 'invalid-heading-level',
    description: 'Heading level must be between one and six.',
    expectedError: 'attribute-type',
    document: { type: 'doc', content: [{ type: 'heading', attrs: { level: 9 } }] },
  },
  {
    key: 'legacy-block-id',
    description: 'New documents cannot serialize legacy blockId.',
    expectedError: 'legacy-block-id',
    document: { type: 'doc', content: [{ type: 'paragraph', attrs: { blockId: 'legacy' } }] },
  },
] as const

createLogger('SchemaContractFixtures').debug('invalid fixtures loaded', {
  count: invalidDocuments.length,
})
