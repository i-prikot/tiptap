import { computed } from 'vue'
import type { ComputedRef, FunctionalComponent } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { EditorMenuActionItem, TurnIntoMenuItem } from '../types/menu'
import { parseShortcutKeys } from '../utils/tiptap-utils'
import {
  useBlockquoteBlock,
  useCodeBlockBlock,
  useHeadingBlock,
  useListBlock,
  useTextBlock,
} from './blocks/useBlockConversions'
import { useCopyAnchorLink } from './useCopyAnchorLink'
import { useCopyToClipboard } from './useCopyToClipboard'
import { useDeleteNode } from './useDeleteNode'
import { useDuplicate } from './useDuplicate'
import { useImageDownload } from './useImageDownload'
import { useResetAllFormatting } from './useResetAllFormatting'
import { useTableClearAllContents } from './useTableClearAllContents'
import { useTableFitToWidth } from './useTableFitToWidth'
import { useTocShowTitle } from './useTocShowTitle'
import { useEditorI18n } from './useEditorI18n'
import { getTurnIntoBlockMessageKey, TURN_INTO_BLOCKS } from './useTurnInto'

type NodeActionMenuItem = EditorMenuActionItem & {
  isActive: boolean
}

type ShortcutMenuItem = EditorMenuActionItem & {
  shortcut: string
}

type Translate = ReturnType<typeof useEditorI18n>['t']

type BlockConversion = {
  Icon: FunctionalComponent
  canToggle: ComputedRef<boolean>
  handleToggle: () => void
  isActive: ComputedRef<boolean>
}

function formatShortcut(shortcutKeys: string | undefined) {
  return parseShortcutKeys({ shortcutKeys }).join('')
}

function createTurnIntoItems(t: Translate, conversions: BlockConversion[]): TurnIntoMenuItem[] {
  const items = conversions.map((conversion, index) => ({
    icon: conversion.Icon,
    label: t(getTurnIntoBlockMessageKey(TURN_INTO_BLOCKS[index]!)),
    onClick: conversion.handleToggle,
    disabled: conversion.canToggle.value === false,
    isActive: conversion.isActive.value,
  }))
  return items.every((item) => item.disabled) ? [] : items
}

function createPreSubmenuNodeActionItems(
  t: Translate,
  actions: {
    tocShowTitle: ReturnType<typeof useTocShowTitle>
    tableFitToWidth: ReturnType<typeof useTableFitToWidth>
    tableClearAllContents: ReturnType<typeof useTableClearAllContents>
  },
): NodeActionMenuItem[] {
  const { tocShowTitle, tableFitToWidth, tableClearAllContents } = actions
  const items: Array<NodeActionMenuItem | null> = [
    tocShowTitle.canToggle.value
      ? {
          icon: tocShowTitle.Icon,
          label: t('toc.showTitle'),
          onClick: tocShowTitle.handleToggle,
          disabled: false,
          isActive: tocShowTitle.isActive.value,
        }
      : null,
    tableFitToWidth.canFitToWidth.value
      ? {
          icon: tableFitToWidth.Icon,
          label: t('table.fitToWidth'),
          onClick: tableFitToWidth.handleFitToWidth,
          disabled: false,
          isActive: false,
        }
      : null,
    tableClearAllContents.canClearAll.value
      ? {
          icon: tableClearAllContents.Icon,
          label: t('table.clearAllContents'),
          onClick: tableClearAllContents.handleClearAll,
          disabled: false,
          isActive: false,
        }
      : null,
  ]
  return items.filter((item): item is NodeActionMenuItem => item !== null)
}

function createPostSubmenuNodeActionItems(
  t: Translate,
  actions: {
    resetFormatting: ReturnType<typeof useResetAllFormatting>
    imageDownload: ReturnType<typeof useImageDownload>
  },
): NodeActionMenuItem[] {
  const { resetFormatting, imageDownload } = actions
  const items: Array<NodeActionMenuItem | null> = [
    resetFormatting.canReset.value
      ? {
          icon: resetFormatting.Icon,
          label: t('toolbar.resetFormatting'),
          onClick: resetFormatting.handleResetFormatting,
          disabled: false,
          isActive: false,
        }
      : null,
    imageDownload.canDownload.value
      ? {
          icon: imageDownload.Icon,
          label: t('image.download'),
          onClick: imageDownload.handleDownload,
          disabled: false,
          isActive: false,
        }
      : null,
  ]
  return items.filter((item): item is NodeActionMenuItem => item !== null)
}

function createClipboardItems(
  t: Translate,
  actions: {
    duplicate: ReturnType<typeof useDuplicate>
    copyToClipboard: ReturnType<typeof useCopyToClipboard>
    copyAnchorLink: ReturnType<typeof useCopyAnchorLink>
  },
): ShortcutMenuItem[] {
  const { duplicate, copyToClipboard, copyAnchorLink } = actions
  return [
    {
      icon: duplicate.Icon,
      label: t('toolbar.duplicateNode'),
      onClick: duplicate.handleDuplicate,
      disabled: duplicate.canDuplicate.value === false,
      shortcut: formatShortcut(duplicate.shortcutKeys),
    },
    {
      icon: copyToClipboard.Icon,
      label: t('toolbar.copyToClipboard'),
      onClick: copyToClipboard.handleCopyToClipboard,
      disabled: copyToClipboard.canCopyToClipboard.value === false,
      shortcut: formatShortcut(copyToClipboard.shortcutKeys),
    },
    {
      icon: copyAnchorLink.Icon,
      label: t('toolbar.copyAnchorLink'),
      onClick: copyAnchorLink.handleCopyAnchorLink,
      disabled: copyAnchorLink.canCopyAnchorLink.value === false,
      shortcut: formatShortcut(copyAnchorLink.shortcutKeys),
    },
  ]
}

function createDeleteItem(
  t: Translate,
  deleteNode: ReturnType<typeof useDeleteNode>,
): ShortcutMenuItem {
  return {
    icon: deleteNode.Icon,
    label: t('toolbar.delete'),
    onClick: deleteNode.handleDeleteNode,
    disabled: deleteNode.canDeleteNode.value === false,
    shortcut: formatShortcut(deleteNode.shortcutKeys),
  }
}

export function useDragContextMenuItems(editor: ComputedRef<Editor | null>) {
  const { t } = useEditorI18n()
  const conversions = [
    useTextBlock(editor),
    useHeadingBlock(editor, 1),
    useHeadingBlock(editor, 2),
    useHeadingBlock(editor, 3),
    useListBlock(editor, 'bulletList'),
    useListBlock(editor, 'orderedList'),
    useListBlock(editor, 'taskList'),
    useBlockquoteBlock(editor),
    useCodeBlockBlock(editor),
  ]
  const actions = {
    tocShowTitle: useTocShowTitle(editor),
    tableFitToWidth: useTableFitToWidth(editor),
    tableClearAllContents: useTableClearAllContents(editor),
    resetFormatting: useResetAllFormatting(editor, ['inlineThread']),
    imageDownload: useImageDownload(editor),
    duplicate: useDuplicate(editor),
    copyToClipboard: useCopyToClipboard(editor),
    copyAnchorLink: useCopyAnchorLink(editor),
    deleteNode: useDeleteNode(editor),
  }

  return {
    turnIntoItems: computed(() => createTurnIntoItems(t, conversions)),
    preSubmenuNodeActionItems: computed(() => createPreSubmenuNodeActionItems(t, actions)),
    postSubmenuNodeActionItems: computed(() => createPostSubmenuNodeActionItems(t, actions)),
    clipboardItems: computed(() => createClipboardItems(t, actions)),
    deleteItem: computed(() => createDeleteItem(t, actions.deleteNode)),
  }
}
