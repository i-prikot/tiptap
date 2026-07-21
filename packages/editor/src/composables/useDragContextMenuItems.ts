import { computed } from 'vue'
import type { ComputedRef } from 'vue'
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

type NodeActionMenuItem = EditorMenuActionItem & {
  isActive: boolean
}

type ShortcutMenuItem = EditorMenuActionItem & {
  shortcut: string
}

function formatShortcut(shortcutKeys: string | undefined) {
  return parseShortcutKeys({ shortcutKeys }).join('')
}

export function useDragContextMenuItems(editor: ComputedRef<Editor | null>) {
  const textBlock = useTextBlock(editor)
  const heading1 = useHeadingBlock(editor, 1)
  const heading2 = useHeadingBlock(editor, 2)
  const heading3 = useHeadingBlock(editor, 3)
  const bulletList = useListBlock(editor, 'bulletList')
  const orderedList = useListBlock(editor, 'orderedList')
  const taskList = useListBlock(editor, 'taskList')
  const blockquote = useBlockquoteBlock(editor)
  const codeBlock = useCodeBlockBlock(editor)

  const tocShowTitle = useTocShowTitle(editor)
  const tableFitToWidth = useTableFitToWidth(editor)
  const tableClearAllContents = useTableClearAllContents(editor)
  const resetFormatting = useResetAllFormatting(editor, ['inlineThread'])
  const imageDownload = useImageDownload(editor)
  const duplicate = useDuplicate(editor)
  const copyToClipboard = useCopyToClipboard(editor)
  const copyAnchorLink = useCopyAnchorLink(editor)
  const deleteNode = useDeleteNode(editor)

  const turnIntoItems = computed<TurnIntoMenuItem[]>(() => {
    const conversions = [
      textBlock,
      heading1,
      heading2,
      heading3,
      bulletList,
      orderedList,
      taskList,
      blockquote,
      codeBlock,
    ]
    const items = conversions.map((conversion) => ({
      icon: conversion.Icon,
      label: conversion.label,
      onClick: conversion.handleToggle,
      disabled: conversion.canToggle.value === false,
      isActive: conversion.isActive.value,
    }))
    return items.every((item) => item.disabled) ? [] : items
  })

  const preSubmenuNodeActionItems = computed<NodeActionMenuItem[]>(() => {
    const items: Array<NodeActionMenuItem | null> = [
      tocShowTitle.canToggle.value
        ? {
            icon: tocShowTitle.Icon,
            label: tocShowTitle.label,
            onClick: tocShowTitle.handleToggle,
            disabled: false,
            isActive: tocShowTitle.isActive.value,
          }
        : null,
      tableFitToWidth.canFitToWidth.value
        ? {
            icon: tableFitToWidth.Icon,
            label: tableFitToWidth.label,
            onClick: tableFitToWidth.handleFitToWidth,
            disabled: false,
            isActive: false,
          }
        : null,
      tableClearAllContents.canClearAll.value
        ? {
            icon: tableClearAllContents.Icon,
            label: tableClearAllContents.label,
            onClick: tableClearAllContents.handleClearAll,
            disabled: false,
            isActive: false,
          }
        : null,
    ]

    return items.filter((item): item is NodeActionMenuItem => item !== null)
  })

  const postSubmenuNodeActionItems = computed<NodeActionMenuItem[]>(() => {
    const items: Array<NodeActionMenuItem | null> = [
      resetFormatting.canReset.value
        ? {
            icon: resetFormatting.Icon,
            label: resetFormatting.label,
            onClick: resetFormatting.handleResetFormatting,
            disabled: false,
            isActive: false,
          }
        : null,
      imageDownload.canDownload.value
        ? {
            icon: imageDownload.Icon,
            label: imageDownload.label,
            onClick: imageDownload.handleDownload,
            disabled: false,
            isActive: false,
          }
        : null,
    ]

    return items.filter((item): item is NodeActionMenuItem => item !== null)
  })

  const clipboardItems = computed<ShortcutMenuItem[]>(() => [
    {
      icon: duplicate.Icon,
      label: duplicate.label,
      onClick: duplicate.handleDuplicate,
      disabled: duplicate.canDuplicate.value === false,
      shortcut: formatShortcut(duplicate.shortcutKeys),
    },
    {
      icon: copyToClipboard.Icon,
      label: copyToClipboard.label,
      onClick: copyToClipboard.handleCopyToClipboard,
      disabled: copyToClipboard.canCopyToClipboard.value === false,
      shortcut: formatShortcut(copyToClipboard.shortcutKeys),
    },
    {
      icon: copyAnchorLink.Icon,
      label: copyAnchorLink.label,
      onClick: copyAnchorLink.handleCopyAnchorLink,
      disabled: copyAnchorLink.canCopyAnchorLink.value === false,
      shortcut: formatShortcut(copyAnchorLink.shortcutKeys),
    },
  ])

  const deleteItem = computed<ShortcutMenuItem>(() => ({
    icon: deleteNode.Icon,
    label: deleteNode.label,
    onClick: deleteNode.handleDeleteNode,
    disabled: deleteNode.canDeleteNode.value === false,
    shortcut: formatShortcut(deleteNode.shortcutKeys),
  }))

  return {
    preSubmenuNodeActionItems,
    postSubmenuNodeActionItems,
    turnIntoItems,
    clipboardItems,
    deleteItem,
  }
}
