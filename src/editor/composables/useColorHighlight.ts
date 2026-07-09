/**
 * Подсветка текста (марка highlight) и фон блока (nodeBackground):
 * палитра HIGHLIGHT_COLORS и useColorHighlight.
 * Порт из чанка 2mux2p9tadf0h (модули 254877/173753).
 */
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isExtensionAvailable, isMarkInSchema, isNodeTypeSelected } from '../utils/tiptap-utils'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import { HighlighterIcon } from '../icons'

export type HighlightMode = 'mark' | 'node'

export interface HighlightColor {
  label: string
  value: string
  colorValue?: string
  border?: string
}

export const COLOR_HIGHLIGHT_SHORTCUT_KEY = 'mod+shift+h'

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  {
    label: 'Default background',
    value: 'var(--tt-bg-color)',
    colorValue: '#ffffff',
    border: 'var(--tt-bg-color-contrast)',
  },
  {
    label: 'Gray background',
    value: 'var(--tt-color-highlight-gray)',
    colorValue: '#f8f8f7',
    border: 'var(--tt-color-highlight-gray-contrast)',
  },
  {
    label: 'Brown background',
    value: 'var(--tt-color-highlight-brown)',
    colorValue: '#f4eeee',
    border: 'var(--tt-color-highlight-brown-contrast)',
  },
  {
    label: 'Orange background',
    value: 'var(--tt-color-highlight-orange)',
    colorValue: '#fbecdd',
    border: 'var(--tt-color-highlight-orange-contrast)',
  },
  {
    label: 'Yellow background',
    value: 'var(--tt-color-highlight-yellow)',
    colorValue: '#fef9c3',
    border: 'var(--tt-color-highlight-yellow-contrast)',
  },
  {
    label: 'Green background',
    value: 'var(--tt-color-highlight-green)',
    colorValue: '#dcfce7',
    border: 'var(--tt-color-highlight-green-contrast)',
  },
  {
    label: 'Blue background',
    value: 'var(--tt-color-highlight-blue)',
    colorValue: '#e0f2fe',
    border: 'var(--tt-color-highlight-blue-contrast)',
  },
  {
    label: 'Purple background',
    value: 'var(--tt-color-highlight-purple)',
    colorValue: '#f3e8ff',
    border: 'var(--tt-color-highlight-purple-contrast)',
  },
  {
    label: 'Pink background',
    value: 'var(--tt-color-highlight-pink)',
    colorValue: '#fcf1f6',
    border: 'var(--tt-color-highlight-pink-contrast)',
  },
  {
    label: 'Red background',
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
    .filter((color): color is HighlightColor => !!color)
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
  label?: string
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
  const signal = useEditorSelectionSignal(editor)

  const resolvedColor = highlightColor
    ? resolveHighlightColor(highlightColor, useColorValue)
    : highlightColor

  const canColor = computed(() => (signal.value, canColorHighlight(editor.value, mode)))
  const isActive = computed(
    () => (signal.value, isHighlightActive(editor.value, resolvedColor, mode)),
  )
  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    if (!instance) return false
    if (!hideWhenUnavailable) return true
    if (!instance.isEditable) return false
    if (mode === 'mark') {
      if (!isMarkInSchema('highlight', instance)) return false
    } else if (!isExtensionAvailable(instance, ['nodeBackground'])) return false
    return !!instance.isActive('code') || canColorHighlight(instance, mode)
  })

  const resolvedLabel = label || 'Highlight'

  const handleColorHighlight = (): boolean => {
    const instance = editor.value
    if (!instance || !canColor.value || !resolvedColor) return false
    if (mode === 'mark') {
      if (instance.state.storedMarks) {
        const markType = instance.schema.marks.highlight
        if (markType) instance.view.dispatch(instance.state.tr.removeStoredMark(markType))
      }
      setTimeout(() => {
        const applied = instance.chain().focus().toggleHighlight({ color: resolvedColor }).run()
        if (applied) onApplied?.({ color: resolvedColor, label: resolvedLabel, mode })
      }, 0)
      return true
    }
    const applied = instance.chain().focus().toggleNodeBackgroundColor(resolvedColor).run()
    if (applied) onApplied?.({ color: resolvedColor, label: resolvedLabel, mode })
    return applied
  }

  const handleRemoveHighlight = (): boolean => {
    const instance = editor.value
    if (!instance || !instance.isEditable || !canColorHighlight(instance, mode)) return false
    const removed =
      mode === 'mark'
        ? instance.chain().focus().unsetMark('highlight').run()
        : instance.chain().focus().unsetNodeBackgroundColor().run()
    if (removed) onApplied?.({ color: '', label: 'Remove highlight', mode })
    return removed
  }

  return {
    isVisible,
    isActive,
    canColorHighlight: canColor,
    handleColorHighlight,
    handleRemoveHighlight,
    label: resolvedLabel,
    shortcutKeys: COLOR_HIGHLIGHT_SHORTCUT_KEY,
    Icon: HighlighterIcon,
    mode,
  }
}
