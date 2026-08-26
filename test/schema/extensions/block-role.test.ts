import { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BLOCK_ID_ATTRIBUTE,
  BLOCK_ROLE_ATTRIBUTE,
  BLOCK_ROLE_META,
  BlockId,
  BlockRole,
  TOP_LEVEL_BLOCK_ID_NODE_TYPES,
  isValidBlockRole,
  normalizeBlockRole,
  setBlockRoleAtPos,
} from '@i-prikot/editor-schema'
import { TocNode } from '../../../packages/schema/src/nodes/toc/toc'
import {
  createExtensionEditor,
  destroyExtensionEditor,
  findNodePosition,
  getNodeAttributes,
} from '../../editor/extensions/extension-test-utils'

let editor: Editor | undefined
const TEST_ROLES = ['pricing', 'cta', 'cases'] as const

afterEach(() => {
  if (editor) destroyExtensionEditor(editor)
  editor = undefined
  vi.restoreAllMocks()
})

function createBlockRoleEditor(content: unknown, includeTables = false, roles = TEST_ROLES) {
  editor = createExtensionEditor({
    content,
    extensions: [BlockRole.configure({ roles })],
    includeLists: true,
    includeTables,
  })
  return editor
}

describe('BlockRole', () => {
  it('has no package-owned roles before the host configures the editor', () => {
    expect(BlockRole.options.roles).toEqual([])
  })

  it('accepts host-defined configured roles and rejects roles outside that configuration', async () => {
    editor = createExtensionEditor({
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { [BLOCK_ROLE_ATTRIBUTE]: 'price' },
            content: [{ type: 'text', text: 'Price' }],
          },
        ],
      },
      extensions: [BlockRole.configure({ roles: ['price'] })],
    })

    const pos = findNodePosition(editor, 'paragraph')

    await Promise.resolve()

    expect(isValidBlockRole('price', ['price'])).toBe(true)
    expect(isValidBlockRole('price', TEST_ROLES)).toBe(false)
    expect(normalizeBlockRole('price', ['price'])).toBe('price')
    expect(getNodeAttributes(editor, 'paragraph')[BLOCK_ROLE_ATTRIBUTE]).toBe('price')
    expect(setBlockRoleAtPos(editor, pos, 'pricing')).toMatchObject({
      ok: false,
      reason: 'invalid-role',
    })
    expect(setBlockRoleAtPos(editor, pos, 'price')).toMatchObject({
      ok: false,
      reason: 'unchanged-role',
    })
  })

  it('persists every configured role on direct document children', () => {
    expect(BLOCK_ID_ATTRIBUTE).toBe('id')
    expect(BlockId.options.attributeName).toBe(BLOCK_ID_ATTRIBUTE)
    expect(TOP_LEVEL_BLOCK_ID_NODE_TYPES).toEqual([
      'table',
      'paragraph',
      'bulletList',
      'orderedList',
      'taskList',
      'heading',
      'blockquote',
      'codeBlock',
      'tocNode',
    ])
    expect(isValidBlockRole('pricing', TEST_ROLES)).toBe(true)
    expect(isValidBlockRole('legacy', TEST_ROLES)).toBe(false)
    expect(normalizeBlockRole('cases', TEST_ROLES)).toBe('cases')
    expect(normalizeBlockRole({ role: 'pricing' })).toBeNull()

    const instance = createBlockRoleEditor({
      type: 'doc',
      content: TEST_ROLES.map((role) => ({
        type: 'paragraph',
        attrs: { [BLOCK_ROLE_ATTRIBUTE]: role },
        content: [{ type: 'text', text: role }],
      })),
    })

    expect(instance.getJSON().content?.map((node) => node.attrs?.[BLOCK_ROLE_ATTRIBUTE])).toEqual(
      TEST_ROLES,
    )
    expect(instance.getHTML()).toContain('data-block-role="pricing"')
    expect(instance.getHTML()).toContain('data-block-role="cta"')
    expect(instance.getHTML()).toContain('data-block-role="cases"')
  })

  it('persists roles on every supported direct document child type', () => {
    const expectedRoles = TOP_LEVEL_BLOCK_ID_NODE_TYPES.map(
      (_, index) => TEST_ROLES[index % TEST_ROLES.length],
    )
    const instance = createExtensionEditor({
      content: {
        type: 'doc',
        content: [
          {
            type: 'table',
            attrs: { [BLOCK_ROLE_ATTRIBUTE]: expectedRoles[0] },
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Table' }] }],
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            attrs: { [BLOCK_ROLE_ATTRIBUTE]: expectedRoles[1] },
            content: [{ type: 'text', text: 'Paragraph' }],
          },
          {
            type: 'bulletList',
            attrs: { [BLOCK_ROLE_ATTRIBUTE]: expectedRoles[2] },
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bullet' }] }],
              },
            ],
          },
          {
            type: 'orderedList',
            attrs: { [BLOCK_ROLE_ATTRIBUTE]: expectedRoles[3] },
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ordered' }] }],
              },
            ],
          },
          {
            type: 'taskList',
            attrs: { [BLOCK_ROLE_ATTRIBUTE]: expectedRoles[4] },
            content: [
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task' }] }],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2, [BLOCK_ROLE_ATTRIBUTE]: expectedRoles[5] },
            content: [{ type: 'text', text: 'Heading' }],
          },
          {
            type: 'blockquote',
            attrs: { [BLOCK_ROLE_ATTRIBUTE]: expectedRoles[6] },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quote' }] }],
          },
          {
            type: 'codeBlock',
            attrs: { language: null, [BLOCK_ROLE_ATTRIBUTE]: expectedRoles[7] },
            content: [{ type: 'text', text: 'const value = 1' }],
          },
          { type: 'tocNode', attrs: { [BLOCK_ROLE_ATTRIBUTE]: expectedRoles[8] } },
        ],
      },
      extensions: [TocNode, BlockRole.configure({ roles: TEST_ROLES })],
      includeLists: true,
      includeTables: true,
    })
    editor = instance

    expect(instance.getJSON().content?.map((node) => node.attrs?.[BLOCK_ROLE_ATTRIBUTE])).toEqual(
      expectedRoles,
    )
  })

  it('normalizes every malformed JSON and HTML value to null', async () => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const malformedValues = ['legacy', false, 0, ['pricing'], { role: 'pricing' }]
    const instance = createBlockRoleEditor({
      type: 'doc',
      content: malformedValues.map((blockRole, index) => ({
        type: 'paragraph',
        attrs: { [BLOCK_ROLE_ATTRIBUTE]: blockRole },
        content: [{ type: 'text', text: `block ${index}` }],
      })),
    })

    await Promise.resolve()

    expect(instance.getJSON().content?.map((node) => node.attrs?.[BLOCK_ROLE_ATTRIBUTE])).toEqual(
      malformedValues.map(() => null),
    )

    destroyExtensionEditor(instance)
    editor = undefined
    const parsed = createBlockRoleEditor('<p data-block-role="legacy">Legacy</p>')
    expect(getNodeAttributes(parsed, 'paragraph')[BLOCK_ROLE_ATTRIBUTE]).toBeNull()
    expect(parsed.getHTML()).not.toContain('data-block-role')
  })

  it('round-trips canonical interactive HTML and JSON without repairs', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const initial = createBlockRoleEditor({
      type: 'doc',
      content: TEST_ROLES.map((role) => ({
        type: 'paragraph',
        attrs: { [BLOCK_ROLE_ATTRIBUTE]: role },
        content: [{ type: 'text', text: role }],
      })),
    })
    const html = initial.getHTML()
    const json = initial.getJSON()

    destroyExtensionEditor(initial)
    editor = undefined
    const reloaded = createBlockRoleEditor(html)

    expect(reloaded.getJSON()).toEqual(json)
    expect(debug).not.toHaveBeenCalled()
  })

  it('does not dispatch a scheduled repair after destruction', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const instance = createBlockRoleEditor({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { [BLOCK_ROLE_ATTRIBUTE]: 'legacy' },
          content: [{ type: 'text', text: 'Legacy' }],
        },
      ],
    })

    destroyExtensionEditor(instance)
    editor = undefined
    await Promise.resolve()

    expect(debug).not.toHaveBeenCalled()
  })

  it('strips roles nested in task-list and table wrappers', async () => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const instance = createBlockRoleEditor(
      {
        type: 'doc',
        content: [
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    attrs: { [BLOCK_ROLE_ATTRIBUTE]: 'cta' },
                    content: [{ type: 'text', text: 'Task' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        attrs: { [BLOCK_ROLE_ATTRIBUTE]: 'cases' },
                        content: [{ type: 'text', text: 'Cell' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      true,
    )

    await Promise.resolve()

    expect(getNodeAttributes(instance, 'paragraph', 0)[BLOCK_ROLE_ATTRIBUTE]).toBeNull()
    expect(getNodeAttributes(instance, 'paragraph', 1)[BLOCK_ROLE_ATTRIBUTE]).toBeNull()
  })

  it('preserves a valid top-level container role while stripping its nested role', async () => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const instance = createBlockRoleEditor({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          attrs: { [BLOCK_ROLE_ATTRIBUTE]: 'pricing' },
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  attrs: { [BLOCK_ROLE_ATTRIBUTE]: 'cta' },
                  content: [{ type: 'text', text: 'Nested' }],
                },
              ],
            },
          ],
        },
      ],
    })

    await Promise.resolve()

    expect(getNodeAttributes(instance, 'bulletList')[BLOCK_ROLE_ATTRIBUTE]).toBe('pricing')
    expect(getNodeAttributes(instance, 'paragraph')[BLOCK_ROLE_ATTRIBUTE]).toBeNull()
  })

  it('normalizes malformed top-level values and strips nested roles in one non-history transaction', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const instance = createBlockRoleEditor({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { [BLOCK_ROLE_ATTRIBUTE]: ['pricing'] },
          content: [{ type: 'text', text: 'legacy' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  attrs: { [BLOCK_ROLE_ATTRIBUTE]: 'pricing' },
                  content: [{ type: 'text', text: 'nested' }],
                },
              ],
            },
          ],
        },
      ],
    })

    const normalizationTransactions: { addToHistory: unknown; meta: unknown }[] = []
    instance.on('transaction', ({ transaction }) => {
      if (transaction.getMeta(BLOCK_ROLE_META)) {
        normalizationTransactions.push({
          addToHistory: transaction.getMeta('addToHistory'),
          meta: transaction.getMeta(BLOCK_ROLE_META),
        })
      }
    })

    await Promise.resolve()

    expect(getNodeAttributes(instance, 'paragraph', 0)[BLOCK_ROLE_ATTRIBUTE]).toBeNull()
    expect(getNodeAttributes(instance, 'paragraph', 1)[BLOCK_ROLE_ATTRIBUTE]).toBeNull()
    expect(normalizationTransactions).toEqual([{ addToHistory: false, meta: true }])
    expect(debug).toHaveBeenCalledTimes(1)
    expect(debug).toHaveBeenCalledWith('[BlockRole] normalize document', {
      clearedInvalid: 1,
      strippedNested: 1,
      topLevelBlocks: 2,
    })
  })

  it('changes only a supported direct document child and logs the typed result', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const instance = createBlockRoleEditor('<p>Pricing block</p>')
    const pos = findNodePosition(instance, 'paragraph')

    expect(setBlockRoleAtPos(instance, pos, 'pricing')).toEqual({
      ok: true,
      nodeType: 'paragraph',
      pos,
      previousRole: null,
      nextRole: 'pricing',
    })
    expect(getNodeAttributes(instance, 'paragraph')[BLOCK_ROLE_ATTRIBUTE]).toBe('pricing')
    expect(info).toHaveBeenCalledWith('[BlockRole] role changed from menu', {
      nodeType: 'paragraph',
      pos,
      previousRole: null,
      nextRole: 'pricing',
    })
    expect(setBlockRoleAtPos(instance, pos, null)).toMatchObject({
      ok: true,
      previousRole: 'pricing',
      nextRole: null,
    })
    expect(getNodeAttributes(instance, 'paragraph')[BLOCK_ROLE_ATTRIBUTE]).toBeNull()
  })

  it('rejects invalid, missing, unsupported, nested, and unchanged requests without changes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const instance = createBlockRoleEditor(
      '<p>Pricing block</p><hr><ul><li><p>Nested block</p></li></ul>',
    )
    const before = JSON.stringify(instance.getJSON())
    const pos = findNodePosition(instance, 'paragraph')
    const nestedPos = findNodePosition(instance, 'paragraph', 1)
    const rulePos = findNodePosition(instance, 'horizontalRule')

    const sensitiveRequestedRole = { content: 'sensitive document content' }
    expect(setBlockRoleAtPos(instance, pos, sensitiveRequestedRole)).toEqual({
      ok: false,
      reason: 'invalid-role',
      requestedRole: null,
      nodeType: 'paragraph',
      pos,
    })
    expect(JSON.stringify(instance.getJSON())).toBe(before)
    expect(setBlockRoleAtPos(instance, -1, 'pricing')).toMatchObject({
      ok: false,
      reason: 'missing-node',
    })
    expect(setBlockRoleAtPos(instance, rulePos, 'pricing')).toMatchObject({
      ok: false,
      reason: 'unsupported-node',
    })
    expect(setBlockRoleAtPos(instance, nestedPos, 'pricing')).toMatchObject({
      ok: false,
      reason: 'nested-node',
    })
    expect(setBlockRoleAtPos(instance, pos, 'pricing')).toMatchObject({ ok: true })
    expect(setBlockRoleAtPos(instance, pos, 'pricing')).toMatchObject({
      ok: false,
      reason: 'unchanged-role',
    })
    expect(warn).toHaveBeenNthCalledWith(1, '[BlockRole] role change skipped', {
      reason: 'invalid-role',
      requestedRole: null,
      nodeType: 'paragraph',
      pos,
    })
    expect(warn).toHaveBeenNthCalledWith(2, '[BlockRole] role change skipped', {
      reason: 'missing-node',
      requestedRole: 'pricing',
      nodeType: null,
      pos: -1,
    })
    expect(warn).toHaveBeenNthCalledWith(3, '[BlockRole] role change skipped', {
      reason: 'unsupported-node',
      requestedRole: 'pricing',
      nodeType: 'horizontalRule',
      pos: rulePos,
    })
    expect(warn).toHaveBeenNthCalledWith(4, '[BlockRole] role change skipped', {
      reason: 'nested-node',
      requestedRole: 'pricing',
      nodeType: 'paragraph',
      pos: nestedPos,
    })
    expect(warn).toHaveBeenNthCalledWith(5, '[BlockRole] role change skipped', {
      reason: 'unchanged-role',
      requestedRole: 'pricing',
      nodeType: 'paragraph',
      pos,
    })
    expect(warn).not.toHaveBeenCalledWith(
      '[BlockRole] role change skipped',
      expect.objectContaining({ requestedRole: sensitiveRequestedRole }),
    )
    expect(JSON.stringify(instance.getJSON())).not.toBe(before)
  })
})
