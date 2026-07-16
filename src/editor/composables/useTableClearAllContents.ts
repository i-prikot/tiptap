import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { SquareXIcon } from '../icons'
import {
  CLEAR_ALL_LABEL,
  canClearAllTableContent,
  clearAllTableContent,
} from '../utils/table-actions'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

export function useTableClearAllContents(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canClearAll = computed(
    () => (signal.value, canClearAllTableContent({ editor: editor.value })),
  )

  const handleClearAll = (): boolean => {
    const instance = editor.value
    if (!instance) return false
    const cleared = clearAllTableContent({ editor: instance, resetAttrs: true })
    if (cleared) instance.commands.focus()
    return cleared
  }

  return { canClearAll, handleClearAll, label: CLEAR_ALL_LABEL, Icon: SquareXIcon }
}
