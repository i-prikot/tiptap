/**
 * Composables «Turn into»: Text / Heading / List / Blockquote / CodeBlock.
 * Порт хуков useText, useHeading, useList, useBlockquote, useCodeBlock
 * из чанка 415bw3fz4s42y (React hooks → Vue computed на сигнале выделения).
 */
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { FunctionalComponent } from 'vue'
import {
  isNodeInSchema,
  isNodeTypeSelected,
  selectionWithinConvertibleTypes,
} from '../../utils/tiptap-utils'
import { CONVERTIBLE_TYPES, convertSelectedBlock } from './block-conversion'
import { useEditorSelectionSignal } from '../useEditorSelectionSignal'
import {
  BlockquoteIcon,
  CodeBlockIcon,
  HeadingFiveIcon,
  HeadingFourIcon,
  HeadingOneIcon,
  HeadingSixIcon,
  HeadingThreeIcon,
  HeadingTwoIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  TypeIcon,
} from '../../icons'

export interface BlockConversionApi {
  isActive: ComputedRef<boolean>
  canToggle: ComputedRef<boolean>
  handleToggle: () => boolean
  label: string
  shortcutKeys?: string
  Icon: FunctionalComponent
}

export const TEXT_SHORTCUT_KEY = 'mod+alt+0'
export const HEADING_SHORTCUT_KEYS: Record<number, string> = {
  1: 'ctrl+alt+1',
  2: 'ctrl+alt+2',
  3: 'ctrl+alt+3',
  4: 'ctrl+alt+4',
  5: 'ctrl+alt+5',
  6: 'ctrl+alt+6',
}
export const LIST_SHORTCUT_KEYS: Record<ListType, string> = {
  bulletList: 'mod+shift+8',
  orderedList: 'mod+shift+7',
  taskList: 'mod+shift+9',
}
export const BLOCKQUOTE_SHORTCUT_KEY = 'mod+shift+b'
export const CODE_BLOCK_SHORTCUT_KEY = 'mod+alt+c'

export const headingIcons: Record<number, FunctionalComponent> = {
  1: HeadingOneIcon,
  2: HeadingTwoIcon,
  3: HeadingThreeIcon,
  4: HeadingFourIcon,
  5: HeadingFiveIcon,
  6: HeadingSixIcon,
}

export type ListType = 'bulletList' | 'orderedList' | 'taskList'

export const listIcons: Record<ListType, FunctionalComponent> = {
  bulletList: ListIcon,
  orderedList: ListOrderedIcon,
  taskList: ListTodoIcon,
}

const LIST_LABELS: Record<ListType, string> = {
  bulletList: 'Bullet List',
  orderedList: 'Numbered List',
  taskList: 'To-do list',
}

export function canToggleText(editor: Editor | null, turnInto = true): boolean {
  if (!editor || !editor.schema.nodes.paragraph) return false
  if (!turnInto) return editor.can().setNode('paragraph')
  return (
    !!selectionWithinConvertibleTypes(editor, CONVERTIBLE_TYPES) &&
    (editor.can().setNode('paragraph') || editor.can().clearNodes())
  )
}

export function useTextBlock(editor: ComputedRef<Editor | null>): BlockConversionApi {
  const signal = useEditorSelectionSignal(editor)
  const canToggle = computed(() => (signal.value, canToggleText(editor.value)))
  const isActive = computed(() => (signal.value, !!editor.value && editor.value.isActive('paragraph')))

  const handleToggle = () => {
    const instance = editor.value
    if (!instance || !instance.isEditable || !canToggleText(instance)) return false
    return convertSelectedBlock(instance, chain =>
      instance.isActive('paragraph') ? chain : chain.setNode('paragraph'),
    )
  }

  return { isActive, canToggle, handleToggle, label: 'Text', shortcutKeys: TEXT_SHORTCUT_KEY, Icon: TypeIcon }
}

export function canToggleHeading(editor: Editor | null, level?: number, turnInto = true): boolean {
  if (!editor || !editor.isEditable || !isNodeInSchema('heading', editor) || isNodeTypeSelected(editor, ['image'])) {
    return false
  }
  if (!turnInto) {
    return level ? editor.can().setNode('heading', { level }) : editor.can().setNode('heading')
  }
  return (
    !!selectionWithinConvertibleTypes(editor, CONVERTIBLE_TYPES) &&
    (level
      ? editor.can().setNode('heading', { level }) || editor.can().clearNodes()
      : editor.can().setNode('heading') || editor.can().clearNodes())
  )
}

export function useHeadingBlock(editor: ComputedRef<Editor | null>, level: number): BlockConversionApi {
  const signal = useEditorSelectionSignal(editor)
  const canToggle = computed(() => (signal.value, canToggleHeading(editor.value, level)))
  const isActive = computed(
    () => (signal.value, !!editor.value && editor.value.isEditable && editor.value.isActive('heading', { level })),
  )

  const handleToggle = () => {
    const instance = editor.value
    if (!instance || !instance.isEditable || !canToggleHeading(instance, level)) return false
    return convertSelectedBlock(instance, chain =>
      instance.isActive('heading', { level }) ? chain.setNode('paragraph') : chain.setNode('heading', { level }),
    )
  }

  return {
    isActive,
    canToggle,
    handleToggle,
    label: `Heading ${level}`,
    shortcutKeys: HEADING_SHORTCUT_KEYS[level],
    Icon: headingIcons[level],
  }
}

export function canToggleList(editor: Editor | null, type: ListType): boolean {
  if (!editor || !editor.isEditable || !isNodeInSchema(type, editor) || isNodeTypeSelected(editor, ['image'])) {
    return false
  }
  if (!selectionWithinConvertibleTypes(editor, CONVERTIBLE_TYPES)) return false
  switch (type) {
    case 'bulletList':
      return editor.can().toggleBulletList() || editor.can().clearNodes()
    case 'orderedList':
      return editor.can().toggleOrderedList() || editor.can().clearNodes()
    case 'taskList':
      return editor.can().toggleList('taskList', 'taskItem') || editor.can().clearNodes()
    default:
      return false
  }
}

export function useListBlock(editor: ComputedRef<Editor | null>, type: ListType): BlockConversionApi {
  const signal = useEditorSelectionSignal(editor)
  const canToggle = computed(() => (signal.value, canToggleList(editor.value, type)))
  const isActive = computed(
    () => (signal.value, !!editor.value && editor.value.isEditable && editor.value.isActive(type)),
  )

  const handleToggle = () => {
    const instance = editor.value
    if (!instance || !instance.isEditable || !canToggleList(instance, type)) return false
    return convertSelectedBlock(instance, chain => {
      if (instance.isActive(type)) {
        return chain.liftListItem('listItem').lift('bulletList').lift('orderedList').lift('taskList')
      }
      switch (type) {
        case 'bulletList':
          return chain.toggleBulletList()
        case 'orderedList':
          return chain.toggleOrderedList()
        case 'taskList':
          return chain.toggleList('taskList', 'taskItem')
      }
    })
  }

  return {
    isActive,
    canToggle,
    handleToggle,
    label: LIST_LABELS[type],
    shortcutKeys: LIST_SHORTCUT_KEYS[type],
    Icon: listIcons[type],
  }
}

export function canToggleBlockquote(editor: Editor | null, turnInto = true): boolean {
  if (!editor || !editor.isEditable || !isNodeInSchema('blockquote', editor) || isNodeTypeSelected(editor, ['image'])) {
    return false
  }
  if (!turnInto) return editor.can().toggleWrap('blockquote')
  return (
    !!selectionWithinConvertibleTypes(editor, CONVERTIBLE_TYPES) &&
    (editor.can().toggleWrap('blockquote') || editor.can().clearNodes())
  )
}

export function useBlockquoteBlock(editor: ComputedRef<Editor | null>): BlockConversionApi {
  const signal = useEditorSelectionSignal(editor)
  const canToggle = computed(() => (signal.value, canToggleBlockquote(editor.value)))
  const isActive = computed(() => (signal.value, editor.value?.isActive('blockquote') || false))

  const handleToggle = () => {
    const instance = editor.value
    if (!instance || !instance.isEditable || !canToggleBlockquote(instance)) return false
    return convertSelectedBlock(instance, chain =>
      instance.isActive('blockquote') ? chain.lift('blockquote') : chain.wrapIn('blockquote'),
    )
  }

  return {
    isActive,
    canToggle,
    handleToggle,
    label: 'Blockquote',
    shortcutKeys: BLOCKQUOTE_SHORTCUT_KEY,
    Icon: BlockquoteIcon,
  }
}

export function canToggleCodeBlock(editor: Editor | null, turnInto = true): boolean {
  if (!editor || !editor.isEditable || !isNodeInSchema('codeBlock', editor) || isNodeTypeSelected(editor, ['image'])) {
    return false
  }
  if (!turnInto) return editor.can().toggleNode('codeBlock', 'paragraph')
  return (
    !!selectionWithinConvertibleTypes(editor, CONVERTIBLE_TYPES) &&
    (editor.can().toggleNode('codeBlock', 'paragraph') || editor.can().clearNodes())
  )
}

export function useCodeBlockBlock(editor: ComputedRef<Editor | null>): BlockConversionApi {
  const signal = useEditorSelectionSignal(editor)
  const canToggle = computed(() => (signal.value, canToggleCodeBlock(editor.value)))
  const isActive = computed(() => (signal.value, editor.value?.isActive('codeBlock') || false))

  const handleToggle = () => {
    const instance = editor.value
    if (!instance || !instance.isEditable || !canToggleCodeBlock(instance)) return false
    return convertSelectedBlock(instance, chain => chain.toggleNode('codeBlock', 'paragraph'))
  }

  return {
    isActive,
    canToggle,
    handleToggle,
    label: 'Code Block',
    shortcutKeys: CODE_BLOCK_SHORTCUT_KEY,
    Icon: CodeBlockIcon,
  }
}
