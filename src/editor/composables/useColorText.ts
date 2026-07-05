/**
 * Цвет текста (марка textStyle): палитра TEXT_COLORS и useColorText.
 * Порт из чанка 2mux2p9tadf0h (модули 118876/352859).
 */
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isMarkInSchema, isNodeTypeSelected, selectCurrentBlockContent } from '../utils/tiptap-utils'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import { TextColorSmallIcon } from '../icons'

export interface TextColor {
  label: string
  value: string
  border: string
}

export const COLOR_TEXT_SHORTCUT_KEY = 'mod+shift+t'

export const TEXT_COLORS: TextColor[] = [
  { label: 'Default text', value: 'var(--tt-color-text)', border: 'var(--tt-color-text-contrast)' },
  { label: 'Gray text', value: 'var(--tt-color-text-gray)', border: 'var(--tt-color-text-gray-contrast)' },
  { label: 'Brown text', value: 'var(--tt-color-text-brown)', border: 'var(--tt-color-text-brown-contrast)' },
  { label: 'Orange text', value: 'var(--tt-color-text-orange)', border: 'var(--tt-color-text-orange-contrast)' },
  { label: 'Yellow text', value: 'var(--tt-color-text-yellow)', border: 'var(--tt-color-text-yellow-contrast)' },
  { label: 'Green text', value: 'var(--tt-color-text-green)', border: 'var(--tt-color-text-green-contrast)' },
  { label: 'Blue text', value: 'var(--tt-color-text-blue)', border: 'var(--tt-color-text-blue-contrast)' },
  { label: 'Purple text', value: 'var(--tt-color-text-purple)', border: 'var(--tt-color-text-purple-contrast)' },
  { label: 'Pink text', value: 'var(--tt-color-text-pink)', border: 'var(--tt-color-text-pink-contrast)' },
  { label: 'Red text', value: 'var(--tt-color-text-red)', border: 'var(--tt-color-text-red-contrast)' },
]

export function canColorText(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable || !isMarkInSchema('textStyle', editor) || isNodeTypeSelected(editor, ['image'])) {
    return false
  }
  try {
    return editor.can().setMark('textStyle', { color: 'currentColor' })
  } catch {
    return false
  }
}

export interface UseColorTextOptions {
  editor: ComputedRef<Editor | null>
  textColor: string
  label?: string
  hideWhenUnavailable?: boolean
  onApplied?: (payload: { color: string; label: string }) => void
}

export function useColorText(options: UseColorTextOptions) {
  const { editor, textColor, label, hideWhenUnavailable = false, onApplied } = options
  const signal = useEditorSelectionSignal(editor)

  const canColor = computed(() => (signal.value, canColorText(editor.value)))
  const isActive = computed(
    () => (signal.value, !!editor.value && !!editor.value.isEditable && editor.value.isActive('textStyle', { color: textColor })),
  )
  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    if (!instance) return false
    if (!hideWhenUnavailable) return true
    return (
      !!instance.isEditable &&
      !!isMarkInSchema('textStyle', instance) &&
      (!!instance.isActive('code') || canColorText(instance))
    )
  })

  const resolvedLabel = label || `Color text to ${textColor}`

  const handleColorText = (): boolean => {
    const instance = editor.value
    if (!instance || !canColor.value) return false
    if (instance.state.storedMarks) {
      const markType = instance.schema.marks.textStyle
      if (markType) instance.view.dispatch(instance.state.tr.removeStoredMark(markType))
    }
    setTimeout(() => {
      selectCurrentBlockContent(instance)
      const applied = instance.chain().focus().toggleMark('textStyle', { color: textColor }).run()
      if (applied) onApplied?.({ color: textColor, label: resolvedLabel })
    }, 0)
    return true
  }

  return {
    isVisible,
    isActive,
    canColorText: canColor,
    handleColorText,
    label: resolvedLabel,
    shortcutKeys: COLOR_TEXT_SHORTCUT_KEY,
    Icon: TextColorSmallIcon,
  }
}
