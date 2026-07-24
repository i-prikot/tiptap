/**
 * Выравнивание текста.
 */
import { computed } from 'vue'
import type { ComputedRef, FunctionalComponent } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isExtensionAvailable, isNodeTypeSelected } from '../utils/tiptap-utils'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import { useEditorI18n } from './useEditorI18n'
import { AlignCenterIcon, AlignJustifyIcon, AlignLeftIcon, AlignRightIcon } from '../icons'

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export const TEXT_ALIGN_SHORTCUT_KEYS: Record<TextAlign, string> = {
  left: 'mod+shift+l',
  center: 'mod+shift+e',
  right: 'mod+shift+r',
  justify: 'mod+shift+j',
}

export const textAlignIcons: Record<TextAlign, FunctionalComponent> = {
  left: AlignLeftIcon,
  center: AlignCenterIcon,
  right: AlignRightIcon,
  justify: AlignJustifyIcon,
}

const textAlignMessageKeys = {
  left: 'toolbar.alignLeft',
  center: 'toolbar.alignCenter',
  right: 'toolbar.alignRight',
  justify: 'toolbar.alignJustify',
} as const

export function canSetTextAlign(editor: Editor | null, align: TextAlign): boolean {
  if (
    !editor ||
    !editor.isEditable ||
    !isExtensionAvailable(editor, 'textAlign') ||
    isNodeTypeSelected(editor, ['image', 'horizontalRule'])
  ) {
    return false
  }
  return editor.can().setTextAlign(align)
}

export function isTextAlignActive(editor: Editor | null, align: TextAlign): boolean {
  return !!editor && !!editor.isEditable && editor.isActive({ textAlign: align })
}

export function useTextAlign(
  editor: ComputedRef<Editor | null>,
  align: TextAlign,
  hideWhenUnavailable = false,
) {
  const signal = useEditorSelectionSignal(editor)
  const { t } = useEditorI18n()

  const canAlign = computed(() => (signal.value, canSetTextAlign(editor.value, align)))
  const isActive = computed(() => (signal.value, isTextAlignActive(editor.value, align)))
  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    if (!instance) return false
    if (!hideWhenUnavailable) return true
    return (
      !!instance.isEditable &&
      !!isExtensionAvailable(instance, 'textAlign') &&
      (!!instance.isActive('code') || canSetTextAlign(instance, align))
    )
  })

  const handleTextAlign = (): boolean => {
    const instance = editor.value
    if (!instance || !instance.isEditable || !canSetTextAlign(instance, align)) return false
    return instance.chain().focus().setTextAlign(align).run()
  }

  return {
    isVisible,
    isActive,
    canAlign,
    handleTextAlign,
    label: computed(() => t(textAlignMessageKeys[align])),
    shortcutKeys: TEXT_ALIGN_SHORTCUT_KEYS[align],
    Icon: textAlignIcons[align],
  }
}
