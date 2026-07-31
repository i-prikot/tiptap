import { computed } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useDragContextMenuItems } from '../../../src/editor/composables/useDragContextMenuItems'

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

vi.mock('../../../src/editor/composables/useEditorI18n', () => ({
  useEditorI18n: () => ({ t: (key: string) => `translated:${key}` }),
}))
vi.mock('../../../src/editor/composables/blocks/useBlockConversions', () => ({
  useTextBlock: () => actions.conversions[0],
  useHeadingBlock: (_editor: unknown, level: number) => actions.conversions[level],
  useListBlock: (_editor: unknown, type: string) =>
    actions.conversions[{ bulletList: 4, orderedList: 5, taskList: 6 }[type] ?? 0],
  useBlockquoteBlock: () => actions.conversions[7],
  useCodeBlockBlock: () => actions.conversions[8],
}))
vi.mock('../../../src/editor/composables/useTocShowTitle', () => ({
  useTocShowTitle: () => actions.tocShowTitle,
}))
vi.mock('../../../src/editor/composables/useTableFitToWidth', () => ({
  useTableFitToWidth: () => actions.tableFitToWidth,
}))
vi.mock('../../../src/editor/composables/useTableClearAllContents', () => ({
  useTableClearAllContents: () => actions.tableClearAllContents,
}))
vi.mock('../../../src/editor/composables/useResetAllFormatting', () => ({
  useResetAllFormatting: () => actions.resetFormatting,
}))
vi.mock('../../../src/editor/composables/useImageDownload', () => ({
  useImageDownload: () => actions.imageDownload,
}))
vi.mock('../../../src/editor/composables/useDuplicate', () => ({
  useDuplicate: () => actions.duplicate,
}))
vi.mock('../../../src/editor/composables/useCopyToClipboard', () => ({
  useCopyToClipboard: () => actions.copyToClipboard,
}))
vi.mock('../../../src/editor/composables/useCopyAnchorLink', () => ({
  useCopyAnchorLink: () => actions.copyAnchorLink,
}))
vi.mock('../../../src/editor/composables/useDeleteNode', () => ({
  useDeleteNode: () => actions.deleteNode,
}))
vi.mock('../../../src/editor/utils/tiptap-utils', () => ({
  parseShortcutKeys: ({ shortcutKeys }: { shortcutKeys?: string }) => [`<${shortcutKeys}>`],
}))

describe('useDragContextMenuItems', () => {
  it('keeps menu group ordering, availability, shortcuts, and handlers intact', () => {
    const menu = useDragContextMenuItems(computed(() => null))

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
})
