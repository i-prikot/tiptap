import { Editor, getSchema, type JSONContent } from '@tiptap/core'
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest'
import * as Y from 'yjs'
import {
  CURRENT_SCHEMA_VERSION,
  BLOCK_ROLE_META,
  BlockRole,
  SCHEMA_CONTRACT_BLOCK_ROLES,
  TOP_LEVEL_BLOCK_ID_NODE_TYPES,
  buildSchemaContract,
  createExtensionKit,
  createRendererExtensionKit,
  getSchemaContract,
  getFixtureByKey,
  invalidDocuments,
  schemaValidationRules,
  validateSchemaDocument,
  validDocuments,
  type MarkDefinition,
  type NodeDefinition,
  type SchemaContract,
  type ValidationRule,
} from '@i-prikot/editor-schema'

let editor: Editor | undefined

function createContractValidationExtensionKit() {
  return createRendererExtensionKit().map((extension) =>
    extension.name === BlockRole.name
      ? BlockRole.configure({ roles: SCHEMA_CONTRACT_BLOCK_ROLES })
      : extension,
  )
}

function createInteractiveContractExtensionKit() {
  return createExtensionKit({
    provider: null,
    ydoc: new Y.Doc(),
    placeholder: '',
    user: { id: 'contract-test', name: 'Contract test', color: '#000000', avatar: '' },
    features: {
      tocSidebar: false,
      floatingMenus: false,
      mobileToolbar: false,
      tableControls: false,
    },
    imageUpload: async () => '',
    onImageUploadError: () => undefined,
    onTableOfContentsUpdate: () => undefined,
  })
}

afterEach(() => {
  editor?.destroy()
  editor = undefined
})

describe('schema contract', () => {
  it('exports the public contract types from the package root', () => {
    expectTypeOf(getSchemaContract()).toEqualTypeOf<SchemaContract>()
    expectTypeOf(getSchemaContract().nodes[0]).toEqualTypeOf<NodeDefinition>()
    expectTypeOf(getSchemaContract().marks[0]).toEqualTypeOf<MarkDefinition>()
    expectTypeOf(getSchemaContract().rules[0]).toEqualTypeOf<ValidationRule>()
  })

  it('is versioned, JSON serializable, and describes the live renderer schema', () => {
    const contract = getSchemaContract()
    const liveSchema = getSchema(createRendererExtensionKit())

    expect(contract.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(JSON.parse(JSON.stringify(contract))).toEqual(contract)
    expect(contract.nodes.map(({ name }) => name).sort()).toEqual(
      Object.keys(liveSchema.nodes).sort(),
    )
    expect(contract.marks.map(({ name }) => name).sort()).toEqual(
      Object.keys(liveSchema.marks).sort(),
    )
    expect(contract.nodes.map(({ name }) => name).sort()).toEqual([
      'blockMath',
      'blockquote',
      'bulletList',
      'codeBlock',
      'doc',
      'emoji',
      'hardBreak',
      'heading',
      'horizontalRule',
      'image',
      'imageUpload',
      'inlineMath',
      'listItem',
      'mention',
      'orderedList',
      'paragraph',
      'table',
      'tableCell',
      'tableHeader',
      'tableRow',
      'taskItem',
      'taskList',
      'text',
      'tocNode',
    ])
    expect(contract.marks.map(({ name }) => name).sort()).toEqual([
      'bold',
      'code',
      'highlight',
      'italic',
      'link',
      'strike',
      'subscript',
      'superscript',
      'textStyle',
      'underline',
    ])
  })

  it('describes attributes, relationships, and SSR HTML mappings', () => {
    const contract = buildSchemaContract()
    const heading = contract.nodes.find(({ name }) => name === 'heading')
    const image = contract.nodes.find(({ name }) => name === 'image')
    const paragraph = contract.nodes.find(({ name }) => name === 'paragraph')

    expect(heading?.attributes.level).toMatchObject({
      type: 'number',
      default: 1,
      enum: [1, 2, 3, 4, 5, 6],
    })
    expect(heading?.attributes['data-toc-id']).toMatchObject({
      type: 'string',
      default: null,
    })
    expect(paragraph?.attributes.id).toMatchObject({ type: 'string', default: null })
    expect(paragraph?.attributes.blockRole).toMatchObject({
      type: 'enum',
      default: null,
      enum: SCHEMA_CONTRACT_BLOCK_ROLES,
    })
    expect(image?.attributes).toMatchObject({
      src: { type: 'string', default: null },
      lqip: { type: 'string', default: null },
      width: { type: 'number', default: null },
      height: { type: 'number', default: null },
    })
    expect(paragraph?.allowedParents).toContain('doc')
    expect(paragraph?.allowedChildren).toContain('text')
    expect(contract.nodes.find(({ name }) => name === 'listItem')?.allowedChildren).toContain(
      'bulletList',
    )
    expect(contract.nodes.find(({ name }) => name === 'bulletList')?.allowedParents).toContain(
      'listItem',
    )
    expect(image?.html.parseRules).toEqual(
      expect.arrayContaining([expect.objectContaining({ tag: 'figure' })]),
    )
    expect(image?.html.render).toBeTruthy()

    for (const node of contract.nodes) {
      expect(node, node.name).toMatchObject({
        name: expect.any(String),
        group: expect.any(Array),
        attributes: expect.any(Object),
        allowedParents: expect.any(Array),
        allowedChildren: expect.any(Array),
        html: {
          parseRules: expect.any(Array),
          render: { strategy: expect.any(String) },
        },
      })
    }
    for (const mark of contract.marks) {
      expect(mark, mark.name).toMatchObject({
        name: expect.any(String),
        group: expect.any(Array),
        attributes: expect.any(Object),
        applicableNodeTypes: expect.any(Array),
        html: {
          parseRules: expect.any(Array),
          render: { strategy: expect.any(String) },
        },
      })
    }
  })

  it('publishes the canonical ownership rules for block attributes', () => {
    const contract = getSchemaContract()
    const expectedTopLevelTypes = [...TOP_LEVEL_BLOCK_ID_NODE_TYPES].sort()

    expect(
      contract.nodes
        .filter(({ attributes }) => 'id' in attributes)
        .map(({ name }) => name)
        .sort(),
    ).toEqual([...expectedTopLevelTypes, 'mention'].sort())
    expect(
      contract.nodes
        .filter(({ attributes }) => 'blockRole' in attributes)
        .map(({ name }) => name)
        .sort(),
    ).toEqual(expectedTopLevelTypes)
    expect(contract.nodes.every(({ attributes }) => !('blockId' in attributes))).toBe(true)
    expect(contract.rules.map(({ id }) => id)).toEqual([
      'schema-content',
      'top-level-id',
      'block-role',
      'safe-url',
      'legacy-block-id',
      'attribute-type',
    ])
    expect(contract.rules.find(({ id }) => id === 'safe-url')?.constraint).toEqual({
      schemes: ['http', 'https', 'ftp', 'ftps', 'mailto', 'tel', 'callto', 'sms', 'cid', 'xmpp'],
      relative: true,
    })
  })

  it('accepts every valid fixture against the live schema and contract rules', () => {
    const schema = getSchema(createRendererExtensionKit())

    for (const fixture of validDocuments) {
      const validation = validateSchemaDocument(fixture.document)
      expect(validation, fixture.key).toEqual({ valid: true, errors: [] })
      expect(() => schema.nodeFromJSON(fixture.document).check(), fixture.key).not.toThrow()
    }

    expect(getFixtureByKey(validDocuments[0].key)).toBe(validDocuments[0])
    expect(getFixtureByKey(invalidDocuments[0].key)).toBe(invalidDocuments[0])
    expect(getFixtureByKey('missing-fixture')).toBeUndefined()
  })

  it('loads and renders every valid fixture without contract normalization', async () => {
    const schema = getSchema(createRendererExtensionKit())

    for (const fixture of validDocuments) {
      const element = document.createElement('div')
      document.body.append(element)
      editor = new Editor({
        element,
        extensions: createContractValidationExtensionKit(),
        content: fixture.document,
      })
      let blockRoleNormalizations = 0
      editor.on('transaction', ({ transaction }) => {
        if (transaction.getMeta(BLOCK_ROLE_META)) blockRoleNormalizations += 1
      })

      await Promise.resolve()

      expect(blockRoleNormalizations, fixture.key).toBe(0)
      expect(validateSchemaDocument(editor.getJSON()), fixture.key).toEqual({
        valid: true,
        errors: [],
      })
      expect(editor.getJSON(), fixture.key).toEqual(schema.nodeFromJSON(fixture.document).toJSON())
      expect(() => editor?.getHTML(), fixture.key).not.toThrow()
      editor.destroy()
      element.remove()
      editor = undefined
    }
  })

  it('rejects every invalid fixture with its expected rule', () => {
    for (const fixture of invalidDocuments) {
      const validation = validateSchemaDocument(fixture.document)

      expect(validation.valid, fixture.key).toBe(false)
      expect(
        validation.errors.map(({ rule }) => rule),
        fixture.key,
      ).toContain(fixture.expectedError)
    }
  })

  it('sanitizes unsafe link and image URLs when invalid fixtures are rendered', () => {
    for (const key of ['unsafe-link-href', 'unsafe-image-src', 'file-image-src']) {
      const fixture = invalidDocuments.find((candidate) => candidate.key === key)
      expect(fixture).toBeTruthy()

      const element = document.createElement('div')
      document.body.append(element)
      editor = new Editor({
        element,
        extensions: createRendererExtensionKit(),
        content: fixture?.document,
      })

      const html = editor.getHTML()
      expect(html, key).not.toMatch(/(?:javascript|data|file):/i)
      expect(html, key).toMatch(/(?:href|src)="(?:#|)"/)
      editor.destroy()
      element.remove()
      editor = undefined
    }
  })

  it('does not preserve contract-owned attributes in invalid positions', async () => {
    for (const key of ['nested-id', 'unsupported-id-node', 'legacy-block-id']) {
      const fixture = invalidDocuments.find((candidate) => candidate.key === key)
      expect(fixture).toBeTruthy()

      const element = document.createElement('div')
      document.body.append(element)
      editor = new Editor({
        element,
        extensions: createRendererExtensionKit(),
        content: fixture?.document,
      })

      await Promise.resolve()
      const normalized = editor.getJSON()
      expect(JSON.stringify(normalized), key).not.toContain('blockId')
      if (key === 'nested-id') {
        expect(normalized.content?.[0].content?.[0].attrs?.id).toBeNull()
      }
      if (key === 'unsupported-id-node') {
        expect(normalized.content?.[0].attrs).not.toHaveProperty('id')
      }
      editor.destroy()
      element.remove()
      editor = undefined
    }
  })

  it('keeps contract attributes exactly aligned with live schema attributes', () => {
    const contract = getSchemaContract()
    const liveSchema = getSchema(createRendererExtensionKit())

    for (const definition of contract.nodes) {
      expect(Object.keys(definition.attributes).sort(), definition.name).toEqual(
        Object.keys(liveSchema.nodes[definition.name].spec.attrs ?? {}).sort(),
      )
    }
    for (const definition of contract.marks) {
      expect(Object.keys(definition.attributes).sort(), definition.name).toEqual(
        Object.keys(liveSchema.marks[definition.name].spec.attrs ?? {}).sort(),
      )
    }
  })

  it('keeps renderer and interactive document schemas aligned', async () => {
    const rendererSchema = getSchema(createRendererExtensionKit())
    const interactiveSchema = getSchema(await createInteractiveContractExtensionKit())

    expect(Object.keys(rendererSchema.nodes).sort()).toEqual(
      Object.keys(interactiveSchema.nodes).sort(),
    )
    expect(Object.keys(rendererSchema.marks).sort()).toEqual(
      Object.keys(interactiveSchema.marks).sort(),
    )

    for (const [name, nodeType] of Object.entries(interactiveSchema.nodes)) {
      expect(Object.keys(rendererSchema.nodes[name].spec.attrs ?? {}).sort(), name).toEqual(
        Object.keys(nodeType.spec.attrs ?? {}).sort(),
      )
    }
  })

  it('keeps generated IDs only on direct document children in the interactive editor', async () => {
    const element = document.createElement('div')
    document.body.append(element)
    editor = new Editor({
      element,
      extensions: await createInteractiveContractExtensionKit(),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nested' }] }],
              },
            ],
          },
        ],
      },
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    await Promise.resolve()

    const documentJson = editor.getJSON()
    expect(documentJson.content?.[0].attrs?.id).toEqual(expect.any(String))
    expect(documentJson.content?.[0].content?.[0].content?.[0].attrs?.id).toBeNull()
    editor.destroy()
    element.remove()
    editor = undefined
  })

  it('rejects legacy blockId even when it appears on an otherwise valid document', () => {
    const document: JSONContent = {
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { blockId: 'legacy' } }],
    }

    expect(validateSchemaDocument(document).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: 'legacy-block-id' })]),
    )
  })

  it('allows each executable validation rule to be applied independently', () => {
    const legacyFixture = invalidDocuments.find(({ key }) => key === 'legacy-block-id')
    const legacyRule = schemaValidationRules.find(({ id }) => id === 'legacy-block-id')
    const safeUrlRule = schemaValidationRules.find(({ id }) => id === 'safe-url')

    expect(legacyFixture).toBeTruthy()
    expect(legacyRule?.validate(legacyFixture?.document ?? {})).toMatchObject({ valid: false })
    expect(safeUrlRule?.validate(legacyFixture?.document ?? {})).toEqual({
      valid: true,
      errors: [],
    })
  })
})
