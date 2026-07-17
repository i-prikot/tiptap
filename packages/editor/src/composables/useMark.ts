/**
 * Тоггл марок (bold/italic/underline/strike/code/superscript/subscript).
 * Порт useMark из чанка 1mpndbcfk3lik (модуль 78766).
 */
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { FunctionalComponent } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isMarkInSchema, isNodeTypeSelected } from '../utils/tiptap-utils'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import {
  BoldIcon,
  Code2Icon,
  ItalicIcon,
  StrikeIcon,
  SubscriptIcon,
  SuperscriptIcon,
  UnderlineIcon,
} from '../icons'

export type MarkType =
  'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'superscript' | 'subscript'

export const markIcons: Record<MarkType, FunctionalComponent> = {
  bold: BoldIcon,
  italic: ItalicIcon,
  underline: UnderlineIcon,
  strike: StrikeIcon,
  code: Code2Icon,
  superscript: SuperscriptIcon,
  subscript: SubscriptIcon,
}

export const MARK_SHORTCUT_KEYS: Record<MarkType, string> = {
  bold: 'mod+b',
  italic: 'mod+i',
  underline: 'mod+u',
  strike: 'mod+shift+s',
  code: 'mod+e',
  superscript: 'mod+.',
  subscript: 'mod+,',
}

export function canToggleMark(editor: Editor | null, type: MarkType): boolean {
  if (
    !editor ||
    !editor.isEditable ||
    !isMarkInSchema(type, editor) ||
    isNodeTypeSelected(editor, ['image'])
  ) {
    return false
  }
  return editor.can().toggleMark(type)
}

export function useMark(
  editor: ComputedRef<Editor | null>,
  type: MarkType,
  hideWhenUnavailable = false,
) {
  const signal = useEditorSelectionSignal(editor)

  const canToggle = computed(() => (signal.value, canToggleMark(editor.value, type)))
  const isActive = computed(
    () => (
      signal.value,
      !!editor.value && !!editor.value.isEditable && editor.value.isActive(type)
    ),
  )
  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    if (!instance) return false
    if (!hideWhenUnavailable) return true
    return (
      !!instance.isEditable &&
      !!isMarkInSchema(type, instance) &&
      (!!instance.isActive('code') || canToggleMark(instance, type))
    )
  })

  const handleMark = (): boolean => {
    const instance = editor.value
    if (!instance || !instance.isEditable || !canToggleMark(instance, type)) return false
    return instance.chain().focus().toggleMark(type).run()
  }

  return {
    isVisible,
    isActive,
    canToggle,
    handleMark,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    shortcutKeys: MARK_SHORTCUT_KEYS[type],
    Icon: markIcons[type],
  }
}
