import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

export interface UseColorControlOptions {
  editor: ComputedRef<Editor | null>
  color: string | undefined
  hideWhenUnavailable?: boolean
  canApply: (editor: Editor) => boolean
  isActive: (editor: Editor) => boolean
  isVisibleWhenUnavailable: (editor: Editor) => boolean
  apply: (editor: Editor) => boolean
  remove?: (editor: Editor) => boolean
  clearStoredMarks?: (editor: Editor) => void
  deferApply?: boolean
  onApplied?: () => void
  onRemoved?: () => void
}

export function useColorControl(options: UseColorControlOptions) {
  const {
    editor,
    color,
    hideWhenUnavailable = false,
    canApply,
    isActive: checkIsActive,
    isVisibleWhenUnavailable,
    apply,
    remove,
    clearStoredMarks,
    deferApply = false,
    onApplied,
    onRemoved,
  } = options
  const signal = useEditorSelectionSignal(editor)

  const canApplyColor = computed(() => (signal.value, !!editor.value && canApply(editor.value)))
  const isActive = computed(() => (signal.value, !!editor.value && checkIsActive(editor.value)))
  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    if (!instance) return false
    return !hideWhenUnavailable || isVisibleWhenUnavailable(instance)
  })

  const handleApply = (): boolean => {
    const instance = editor.value
    if (!instance || !color || !canApplyColor.value) return false

    clearStoredMarks?.(instance)

    const applyColor = () => {
      if (apply(instance)) onApplied?.()
    }

    if (deferApply) {
      setTimeout(applyColor, 0)
      return true
    }

    const applied = apply(instance)
    if (applied) onApplied?.()
    return applied
  }

  const handleRemove = (): boolean => {
    const instance = editor.value
    if (!instance || !remove || !canApplyColor.value) return false

    const removed = remove(instance)
    if (removed) onRemoved?.()
    return removed
  }

  return {
    isVisible,
    isActive,
    canApplyColor,
    handleApply,
    handleRemove,
  }
}
