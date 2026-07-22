import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { selectCurrentBlockContent } from '../utils/tiptap-utils'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'
import { HIGHLIGHT_COLORS, canColorHighlight } from './useColorHighlight'
import { TEXT_COLORS } from './useColorText'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import { getColorByValue, useRecentColors } from './useRecentColors'

const diagnostics = createDevelopmentDiagnostics('useColorMenu')

export function useColorMenu(editor: ComputedRef<Editor | null>) {
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
    diagnostics.debug('text color selected', { colorId: label })
    setTimeout(() => {
      selectCurrentBlockContent(instance)
      const executed = instance.chain().focus().toggleMark('textStyle', { color }).run()
      diagnostics.debug('text color command completed', { colorId: label, executed })
      if (executed) addRecentColor({ type: 'text', label, value: color })
    }, 0)
  }
  const applyBackgroundColor = (color: string, label: string) => {
    const instance = editor.value
    if (!instance) return
    diagnostics.debug('background color selected', { colorId: label })
    const executed = instance.chain().focus().toggleNodeBackgroundColor(color).run()
    diagnostics.debug('background color command completed', { colorId: label, executed })
    if (executed) addRecentColor({ type: 'highlight', label, value: color })
  }
  const textItems = computed(
    () => (
      signal.value,
      TEXT_COLORS.map((color) => ({
        ...color,
        isActive: isTextColorActive(color.value),
        apply: () => applyTextColor(color.value, color.label),
      }))
    ),
  )
  const backgroundItems = computed(
    () => (
      signal.value,
      HIGHLIGHT_COLORS.map((color) => ({
        ...color,
        isActive: isBackgroundActive(color.value),
        apply: () => applyBackgroundColor(color.value, color.label),
      }))
    ),
  )
  const recentItems = computed(
    () => (
      signal.value,
      recentColors.value.map((recent) => {
        const resolved = getColorByValue(
          recent.value,
          recent.type === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS,
        )
        return {
          ...recent,
          label: resolved.label === resolved.value ? recent.label : resolved.label,
          isActive:
            recent.type === 'text'
              ? isTextColorActive(recent.value)
              : isBackgroundActive(recent.value),
          apply: () =>
            recent.type === 'text'
              ? applyTextColor(recent.value, recent.label)
              : applyBackgroundColor(recent.value, recent.label),
        }
      })
    ),
  )
  return { canShow, isInitialized, recentColors, recentItems, textItems, backgroundItems }
}
