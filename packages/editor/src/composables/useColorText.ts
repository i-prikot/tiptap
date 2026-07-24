/**
 * Цвет текста (марка textStyle): палитра TEXT_COLORS и useColorText.
 * Порт из чанка 2mux2p9tadf0h (модули 118876/352859).
 */
import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import {
  isMarkInSchema,
  isNodeTypeSelected,
  selectCurrentBlockContent,
} from '../utils/tiptap-utils'
import { useColorControl } from './useColorControl'
import { useEditorI18n } from './useEditorI18n'
import { TextColorSmallIcon } from '../icons'
import type { ColorMessageKey, TextColor } from '../types/color'

type BuiltInTextColor = TextColor & { labelKey: ColorMessageKey }

export const COLOR_TEXT_SHORTCUT_KEY = 'mod+shift+t'

export const TEXT_COLORS: BuiltInTextColor[] = [
  {
    labelKey: 'colors.defaultText',
    value: 'var(--tt-color-text)',
    border: 'var(--tt-color-text-contrast)',
  },
  {
    labelKey: 'colors.grayText',
    value: 'var(--tt-color-text-gray)',
    border: 'var(--tt-color-text-gray-contrast)',
  },
  {
    labelKey: 'colors.brownText',
    value: 'var(--tt-color-text-brown)',
    border: 'var(--tt-color-text-brown-contrast)',
  },
  {
    labelKey: 'colors.orangeText',
    value: 'var(--tt-color-text-orange)',
    border: 'var(--tt-color-text-orange-contrast)',
  },
  {
    labelKey: 'colors.yellowText',
    value: 'var(--tt-color-text-yellow)',
    border: 'var(--tt-color-text-yellow-contrast)',
  },
  {
    labelKey: 'colors.greenText',
    value: 'var(--tt-color-text-green)',
    border: 'var(--tt-color-text-green-contrast)',
  },
  {
    labelKey: 'colors.blueText',
    value: 'var(--tt-color-text-blue)',
    border: 'var(--tt-color-text-blue-contrast)',
  },
  {
    labelKey: 'colors.purpleText',
    value: 'var(--tt-color-text-purple)',
    border: 'var(--tt-color-text-purple-contrast)',
  },
  {
    labelKey: 'colors.pinkText',
    value: 'var(--tt-color-text-pink)',
    border: 'var(--tt-color-text-pink-contrast)',
  },
  {
    labelKey: 'colors.redText',
    value: 'var(--tt-color-text-red)',
    border: 'var(--tt-color-text-red-contrast)',
  },
]

export function canColorText(editor: Editor | null): boolean {
  if (
    !editor ||
    !editor.isEditable ||
    !isMarkInSchema('textStyle', editor) ||
    isNodeTypeSelected(editor, ['image'])
  ) {
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
  label?: MaybeRefOrGetter<string | undefined>
  hideWhenUnavailable?: boolean
  onApplied?: (payload: { color: string; label: string }) => void
}

export function useColorText(options: UseColorTextOptions) {
  const { editor, textColor, label, hideWhenUnavailable = false, onApplied } = options
  const { t } = useEditorI18n()
  const resolvedLabel = computed(
    () => toValue(label) || t('colors.textColorAria', { color: textColor }),
  )
  const control = useColorControl({
    editor,
    color: textColor,
    hideWhenUnavailable,
    canApply: canColorText,
    isActive: (instance) =>
      !!instance.isEditable && instance.isActive('textStyle', { color: textColor }),
    isVisibleWhenUnavailable: (instance) =>
      !!instance.isEditable &&
      !!isMarkInSchema('textStyle', instance) &&
      (!!instance.isActive('code') || canColorText(instance)),
    clearStoredMarks: (instance) => {
      if (!instance.state.storedMarks) return
      const markType = instance.schema.marks.textStyle
      if (markType) instance.view.dispatch(instance.state.tr.removeStoredMark(markType))
    },
    apply: (instance) => {
      selectCurrentBlockContent(instance)
      return instance.chain().focus().toggleMark('textStyle', { color: textColor }).run()
    },
    deferApply: true,
    onApplied: () => onApplied?.({ color: textColor, label: resolvedLabel.value }),
  })

  return {
    isVisible: control.isVisible,
    isActive: control.isActive,
    canColorText: control.canApplyColor,
    handleColorText: control.handleApply,
    label: resolvedLabel,
    shortcutKeys: COLOR_TEXT_SHORTCUT_KEY,
    Icon: TextColorSmallIcon,
  }
}
