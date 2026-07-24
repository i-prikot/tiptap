import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { selectCurrentBlockContent } from '../utils/tiptap-utils'
import { HIGHLIGHT_COLORS, canColorHighlight } from './useColorHighlight'
import { TEXT_COLORS } from './useColorText'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import { useRecentColors } from './useRecentColors'
import type { EditorI18nContext } from './useEditorI18n'
import type { HighlightColor, TextColor } from '../types/color'

function resolveColorLabel(color: TextColor | HighlightColor, t: EditorI18nContext['t']): string {
  return color.labelKey ? t(color.labelKey) : (color.label ?? color.value)
}

export function useColorMenu(editor: ComputedRef<Editor | null>, t: EditorI18nContext['t']) {
  const signal = useEditorSelectionSignal(editor)
  const { recentColors, addRecentColor, isInitialized } = useRecentColors()
  const canShow = computed(() => {
    void signal.value
    const instance = editor.value
    return (
      !!instance &&
      (instance.can().setMark('textStyle') ||
        instance.can().setMark('highlight') ||
        canColorHighlight(instance, 'node'))
    )
  })
  const isTextColorActive = (color: string) =>
    !!editor.value?.isEditable && editor.value.isActive('textStyle', { color })
  const isBackgroundActive = (color: string) => {
    const instance = editor.value
    if (!instance?.isEditable) return false
    try {
      const { $anchor } = instance.state.selection
      for (let depth = $anchor.depth; depth >= 0; depth--) {
        if ($anchor.node(depth)?.attrs?.backgroundColor === color) return true
      }
    } catch {
      return false
    }
    return false
  }
  const applyTextColor = (color: string, label: string) => {
    const instance = editor.value
    if (!instance) return
    if (instance.state.storedMarks) {
      const markType = instance.schema.marks.textStyle
      if (markType) instance.view.dispatch(instance.state.tr.removeStoredMark(markType))
    }
    setTimeout(() => {
      selectCurrentBlockContent(instance)
      const executed = instance.chain().focus().toggleMark('textStyle', { color }).run()
      if (executed) addRecentColor({ type: 'text', label, value: color })
    }, 0)
  }
  const applyBackgroundColor = (color: string, label: string) => {
    const instance = editor.value
    if (!instance) return
    const executed = instance.chain().focus().toggleNodeBackgroundColor(color).run()
    if (executed) addRecentColor({ type: 'highlight', label, value: color })
  }
  const textItems = computed(
    () => (
      signal.value,
      TEXT_COLORS.map((color) => ({
        ...color,
        isActive: isTextColorActive(color.value),
        label: resolveColorLabel(color, t),
        apply: () => applyTextColor(color.value, resolveColorLabel(color, t)),
      }))
    ),
  )
  const backgroundItems = computed(
    () => (
      signal.value,
      HIGHLIGHT_COLORS.map((color) => ({
        ...color,
        isActive: isBackgroundActive(color.value),
        label: resolveColorLabel(color, t),
        apply: () => applyBackgroundColor(color.value, resolveColorLabel(color, t)),
      }))
    ),
  )
  const recentItems = computed(
    () => (
      signal.value,
      recentColors.value.map((recent) => {
        const paletteColor = (recent.type === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS).find(
          (color) => color.value === recent.value,
        )
        const label = paletteColor ? resolveColorLabel(paletteColor, t) : recent.label
        return {
          ...recent,
          label,
          isActive:
            recent.type === 'text'
              ? isTextColorActive(recent.value)
              : isBackgroundActive(recent.value),
          apply: () =>
            recent.type === 'text'
              ? applyTextColor(recent.value, label)
              : applyBackgroundColor(recent.value, label),
        }
      })
    ),
  )
  return { canShow, isInitialized, recentColors, recentItems, textItems, backgroundItems }
}
