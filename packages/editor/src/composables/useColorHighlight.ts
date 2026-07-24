/**
 * Подсветка текста (марка highlight) и фон блока (nodeBackground):
 * палитра HIGHLIGHT_COLORS и useColorHighlight.
 * Порт из чанка 2mux2p9tadf0h (модули 254877/173753).
 */
import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isExtensionAvailable, isMarkInSchema, isNodeTypeSelected } from '../utils/tiptap-utils'
import { useColorControl } from './useColorControl'
import { useEditorI18n } from './useEditorI18n'
import { HighlighterIcon } from '../icons'
import type { ColorMessageKey, HighlightColor } from '../types/color'

type BuiltInHighlightColor = HighlightColor & { labelKey: ColorMessageKey }

export type HighlightMode = 'mark' | 'node'

export const COLOR_HIGHLIGHT_SHORTCUT_KEY = 'mod+shift+h'

export const HIGHLIGHT_COLORS: BuiltInHighlightColor[] = [
  {
    labelKey: 'colors.defaultBackground',
    value: 'var(--tt-bg-color)',
    colorValue: '#ffffff',
    border: 'var(--tt-bg-color-contrast)',
  },
  {
    labelKey: 'colors.grayBackground',
    value: 'var(--tt-color-highlight-gray)',
    colorValue: '#f8f8f7',
    border: 'var(--tt-color-highlight-gray-contrast)',
  },
  {
    labelKey: 'colors.brownBackground',
    value: 'var(--tt-color-highlight-brown)',
    colorValue: '#f4eeee',
    border: 'var(--tt-color-highlight-brown-contrast)',
  },
  {
    labelKey: 'colors.orangeBackground',
    value: 'var(--tt-color-highlight-orange)',
    colorValue: '#fbecdd',
    border: 'var(--tt-color-highlight-orange-contrast)',
  },
  {
    labelKey: 'colors.yellowBackground',
    value: 'var(--tt-color-highlight-yellow)',
    colorValue: '#fef9c3',
    border: 'var(--tt-color-highlight-yellow-contrast)',
  },
  {
    labelKey: 'colors.greenBackground',
    value: 'var(--tt-color-highlight-green)',
    colorValue: '#dcfce7',
    border: 'var(--tt-color-highlight-green-contrast)',
  },
  {
    labelKey: 'colors.blueBackground',
    value: 'var(--tt-color-highlight-blue)',
    colorValue: '#e0f2fe',
    border: 'var(--tt-color-highlight-blue-contrast)',
  },
  {
    labelKey: 'colors.purpleBackground',
    value: 'var(--tt-color-highlight-purple)',
    colorValue: '#f3e8ff',
    border: 'var(--tt-color-highlight-purple-contrast)',
  },
  {
    labelKey: 'colors.pinkBackground',
    value: 'var(--tt-color-highlight-pink)',
    colorValue: '#fcf1f6',
    border: 'var(--tt-color-highlight-pink-contrast)',
  },
  {
    labelKey: 'colors.redBackground',
    value: 'var(--tt-color-highlight-red)',
    colorValue: '#ffe4e6',
    border: 'var(--tt-color-highlight-red-contrast)',
  },
]

/** Подмножество палитры по значениям var(...) с сохранением порядка аргументов. */
export function pickHighlightColorsByValue(values: string[]): HighlightColor[] {
  const byValue = new Map(HIGHLIGHT_COLORS.map((color) => [color.value, color]))
  return values
    .map((value) => byValue.get(value))
    .filter((color): color is BuiltInHighlightColor => !!color)
}

export function canColorHighlight(editor: Editor | null, mode: HighlightMode = 'mark'): boolean {
  if (!editor || !editor.isEditable) return false
  if (mode === 'mark') {
    if (!isMarkInSchema('highlight', editor) || isNodeTypeSelected(editor, ['image'])) return false
    return editor.can().setMark('highlight')
  }
  if (!isExtensionAvailable(editor, ['nodeBackground'])) return false
  try {
    return editor.can().toggleNodeBackgroundColor('test')
  } catch {
    return false
  }
}

/** value → colorValue (для рендера вне var(--...) контекста). */
function resolveHighlightColor(color: string, useColorValue: boolean): string {
  if (!useColorValue) return color
  const found = HIGHLIGHT_COLORS.find((item) => item.value === color || item.colorValue === color)
  return found?.colorValue || color
}

function isHighlightActive(
  editor: Editor | null,
  color: string | undefined,
  mode: HighlightMode,
): boolean {
  if (!editor || !editor.isEditable) return false
  if (mode === 'mark')
    return color ? editor.isActive('highlight', { color }) : editor.isActive('highlight')
  if (!color) return false
  try {
    const { $anchor } = editor.state.selection
    for (let depth = $anchor.depth; depth >= 0; depth--) {
      const node = $anchor.node(depth)
      if (node && node.attrs?.backgroundColor === color) return true
    }
    return false
  } catch {
    return false
  }
}

export interface UseColorHighlightOptions {
  editor: ComputedRef<Editor | null>
  highlightColor?: string
  label?: MaybeRefOrGetter<string | undefined>
  hideWhenUnavailable?: boolean
  mode?: HighlightMode
  useColorValue?: boolean
  onApplied?: (payload: { color: string; label: string; mode: HighlightMode }) => void
}

export function useColorHighlight(options: UseColorHighlightOptions) {
  const {
    editor,
    highlightColor,
    label,
    hideWhenUnavailable = false,
    mode = 'mark',
    useColorValue = false,
    onApplied,
  } = options
  const { t } = useEditorI18n()
  const resolvedColor = highlightColor
    ? resolveHighlightColor(highlightColor, useColorValue)
    : highlightColor
  const resolvedLabel = computed(() => toValue(label) || t('colors.highlight'))
  const control = useColorControl({
    editor,
    color: resolvedColor,
    hideWhenUnavailable,
    canApply: (instance) => canColorHighlight(instance, mode),
    isActive: (instance) => isHighlightActive(instance, resolvedColor, mode),
    isVisibleWhenUnavailable: (instance) => {
      if (!instance.isEditable) return false
      if (mode === 'mark') {
        if (!isMarkInSchema('highlight', instance)) return false
      } else if (!isExtensionAvailable(instance, ['nodeBackground'])) return false
      return !!instance.isActive('code') || canColorHighlight(instance, mode)
    },
    clearStoredMarks:
      mode === 'mark'
        ? (instance) => {
            if (!instance.state.storedMarks) return
            const markType = instance.schema.marks.highlight
            if (markType) instance.view.dispatch(instance.state.tr.removeStoredMark(markType))
          }
        : undefined,
    apply: (instance) => {
      if (!resolvedColor) return false
      return mode === 'mark'
        ? instance.chain().focus().toggleHighlight({ color: resolvedColor }).run()
        : instance.chain().focus().toggleNodeBackgroundColor(resolvedColor).run()
    },
    remove: (instance) =>
      mode === 'mark'
        ? instance.chain().focus().unsetMark('highlight').run()
        : instance.chain().focus().unsetNodeBackgroundColor().run(),
    deferApply: mode === 'mark',
    onApplied: () => onApplied?.({ color: resolvedColor ?? '', label: resolvedLabel.value, mode }),
    onRemoved: () => onApplied?.({ color: '', label: t('colors.removeHighlight'), mode }),
  })

  return {
    isVisible: control.isVisible,
    isActive: control.isActive,
    canColorHighlight: control.canApplyColor,
    handleColorHighlight: control.handleApply,
    handleRemoveHighlight: control.handleRemove,
    label: resolvedLabel,
    shortcutKeys: COLOR_HIGHLIGHT_SHORTCUT_KEY,
    Icon: HighlighterIcon,
    mode,
  }
}
