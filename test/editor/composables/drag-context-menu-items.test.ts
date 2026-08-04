import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { BlockId, BlockRole } from '@i-prikot/editor-schema'
import { useDragContextMenuItems } from '../../../packages/editor/src/composables/useDragContextMenuItems'

const actions = vi.hoisted(() => {
  const createConversion = (key: string, canToggle = true, isActive = false) => ({
    Icon: { name: `${key}-icon` },
    canToggle: { value: canToggle },
    handleToggle: vi.fn(),
    isActive: { value: isActive },
  })

  return {
    conversions: [
      createConversion('Text'),
      createConversion('Heading1', false),
      createConversion('Heading2'),
      createConversion('Heading3'),
      createConversion('BulletList'),
      createConversion('OrderedList'),
      createConversion('TaskList'),
      createConversion('Blockquote'),
      createConversion('CodeBlock'),
    ],
    tocShowTitle: {
      Icon: { name: 'toc-icon' },
      canToggle: { value: true },
      handleToggle: vi.fn(),
      isActive: { value: true },
    },
    tableFitToWidth: {
      Icon: { name: 'fit-icon' },
      canFitToWidth: { value: false },
      handleFitToWidth: vi.fn(),
    },
    tableClearAllContents: {
      Icon: { name: 'clear-icon' },
      canClearAll: { value: true },
      handleClearAll: vi.fn(),
    },
    resetFormatting: {
      Icon: { name: 'reset-icon' },
      canReset: { value: true },
      handleResetFormatting: vi.fn(),
    },
    imageDownload: {
      Icon: { name: 'download-icon' },
      canDownload: { value: false },
      handleDownload: vi.fn(),
    },
    duplicate: {
      Icon: { name: 'duplicate-icon' },
      canDuplicate: { value: false },
      handleDuplicate: vi.fn(),
      shortcutKeys: 'Mod-Shift-D',
    },
    copyToClipboard: {
      Icon: { name: 'copy-icon' },
      canCopyToClipboard: { value: true },
      handleCopyToClipboard: vi.fn(),
      shortcutKeys: 'Mod-C',
    },
    copyAnchorLink: {
      Icon: { name: 'link-icon' },
      canCopyAnchorLink: { value: true },
      handleCopyAnchorLink: vi.fn(),
      shortcutKeys: 'Mod-Shift-C',
    },
    deleteNode: {
      Icon: { name: 'delete-icon' },
      canDeleteNode: { value: true },
      handleDeleteNode: vi.fn(),
      shortcutKeys: 'Backspace',
    },
  }
})

const blockRoleActions = vi.hoisted(() => ({
  setBlockRoleAtPos: vi.fn(),
}))

vi.mock('@i-prikot/editor-schema', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@i-prikot/editor-schema')>()),
  setBlockRoleAtPos: blockRoleActions.setBlockRoleAtPos,
}))

vi.mock('../../../packages/editor/src/composables/useEditorI18n', () => ({
  useEditorI18n: () => ({ t: (key: string) => `translated:${key}` }),
}))
vi.mock('../../../packages/editor/src/composables/blocks/useBlockConversions', () => ({
  useTextBlock: () => actions.conversions[0],
  useHeadingBlock: (_editor: unknown, level: number) => actions.conversions[level],
  useListBlock: (_editor: unknown, type: string) =>
    actions.conversions[{ bulletList: 4, orderedList: 5, taskList: 6 }[type] ?? 0],
  useBlockquoteBlock: () => actions.conversions[7],
  useCodeBlockBlock: () => actions.conversions[8],
}))
vi.mock('../../../packages/editor/src/composables/useTocShowTitle', () => ({
  useTocShowTitle: () => actions.tocShowTitle,
}))
vi.mock('../../../packages/editor/src/composables/useTableFitToWidth', () => ({
  useTableFitToWidth: () => actions.tableFitToWidth,
}))
vi.mock('../../../packages/editor/src/composables/useTableClearAllContents', () => ({
  useTableClearAllContents: () => actions.tableClearAllContents,
}))
vi.mock('../../../packages/editor/src/composables/useResetAllFormatting', () => ({
  useResetAllFormatting: () => actions.resetFormatting,
}))
vi.mock('../../../packages/editor/src/composables/useImageDownload', () => ({
  useImageDownload: () => actions.imageDownload,
}))
vi.mock('../../../packages/editor/src/composables/useDuplicate', () => ({
  useDuplicate: () => actions.duplicate,
}))
vi.mock('../../../packages/editor/src/composables/useCopyToClipboard', () => ({
  useCopyToClipboard: () => actions.copyToClipboard,
}))
vi.mock('../../../packages/editor/src/composables/useCopyAnchorLink', () => ({
  useCopyAnchorLink: () => actions.copyAnchorLink,
}))
vi.mock('../../../packages/editor/src/composables/useDeleteNode', () => ({
  useDeleteNode: () => actions.deleteNode,
}))
vi.mock('../../../packages/editor/src/utils/tiptap-utils', () => ({
  parseShortcutKeys: ({ shortcutKeys }: { shortcutKeys?: string }) => [`<${shortcutKeys}>`],
}))

describe('useDragContextMenuItems', () => {
  it('keeps menu group ordering, availability, shortcuts, and handlers intact', () => {
    const menu = useDragContextMenuItems(
      computed(() => null),
      computed(() => [
        { label: 'Pricing', value: 'pricing' },
        { label: 'Call to action', value: 'cta' },
      ]),
      ref(1),
    )

    expect(menu.turnIntoItems.value.slice(0, 2)).toMatchObject([
      { label: 'translated:menus.slash.text.title', disabled: false },
      { label: 'translated:menus.slash.heading1.title', disabled: true },
    ])
    expect(menu.preSubmenuNodeActionItems.value.map((item) => item.label)).toEqual([
      'translated:toc.showTitle',
      'translated:table.clearAllContents',
    ])
    expect(menu.preSubmenuNodeActionItems.value[0]).toMatchObject({ isActive: true })
    expect(menu.postSubmenuNodeActionItems.value.map((item) => item.label)).toEqual([
      'translated:toolbar.resetFormatting',
    ])
    expect(menu.blockRoleItems.value).toMatchObject([
      { label: 'Pricing', disabled: true, isActive: false },
      { label: 'Call to action', disabled: true, isActive: false },
    ])
    expect(menu.clipboardItems.value).toMatchObject([
      { label: 'translated:toolbar.duplicateNode', disabled: true, shortcut: '<Mod-Shift-D>' },
      { label: 'translated:toolbar.copyToClipboard', disabled: false, shortcut: '<Mod-C>' },
      { label: 'translated:toolbar.copyAnchorLink', disabled: false, shortcut: '<Mod-Shift-C>' },
    ])
    expect(menu.deleteItem.value).toMatchObject({
      label: 'translated:toolbar.delete',
      disabled: false,
      shortcut: '<Backspace>',
    })

    menu.turnIntoItems.value[0]?.onClick()
    menu.preSubmenuNodeActionItems.value[1]?.onClick()
    menu.clipboardItems.value[1]?.onClick()
    menu.deleteItem.value.onClick()

    expect(actions.conversions[0]?.handleToggle).toHaveBeenCalledOnce()
    expect(actions.tableClearAllContents.handleClearAll).toHaveBeenCalledOnce()
    expect(actions.copyToClipboard.handleCopyToClipboard).toHaveBeenCalledOnce()
    expect(actions.deleteNode.handleDeleteNode).toHaveBeenCalledOnce()
  })

  it('passes the selected role and direct-doc node position to the schema helper', () => {
    const editor = new Editor({
      extensions: [StarterKit, BlockId, BlockRole.configure({ roles: ['pricing'] })],
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Pricing' }],
          },
        ],
      },
    })
    try {
      const menu = useDragContextMenuItems(
        computed(() => editor),
        computed(() => [{ label: 'Pricing', value: 'pricing' }]),
        ref(0),
      )

      menu.blockRoleItems.value[0]?.onClick()

      expect(blockRoleActions.setBlockRoleAtPos).toHaveBeenCalledOnce()
      expect(blockRoleActions.setBlockRoleAtPos).toHaveBeenCalledWith(editor, 0, 'pricing')
    } finally {
      editor.destroy()
    }
  })

  it('clears the role when the active role is selected again', () => {
    const editor = new Editor({
      extensions: [StarterKit, BlockId, BlockRole.configure({ roles: ['pricing'] })],
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { blockRole: 'pricing' },
            content: [{ type: 'text', text: 'Pricing' }],
          },
        ],
      },
    })
    try {
      const menu = useDragContextMenuItems(
        computed(() => editor),
        computed(() => [{ label: 'Pricing', value: 'pricing' }]),
        ref(0),
      )

      menu.blockRoleItems.value[0]?.onClick()

      expect(menu.blockRoleItems.value[0]).toMatchObject({ isActive: true })
      expect(blockRoleActions.setBlockRoleAtPos).toHaveBeenLastCalledWith(editor, 0, null)
    } finally {
      editor.destroy()
    }
  })
})
