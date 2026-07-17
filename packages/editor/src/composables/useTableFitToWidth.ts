import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { MoveHorizontalIcon } from '../icons'
import { getTable, RESIZE_MIN_WIDTH } from '../utils/table-utils'
import { isExtensionAvailable } from '../utils/tiptap-utils'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

function canFitTableToWidth(editor: Editor | null): boolean {
  if (
    !editor ||
    !editor.isEditable ||
    !isExtensionAvailable(editor, ['table', 'tableHandleExtension'])
  )
    return false
  try {
    return (
      editor.isActive('table') || editor.isActive('tableCell') || editor.isActive('tableHeader')
    )
  } catch {
    return false
  }
}

export function useTableFitToWidth(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canFitToWidth = computed(() => (signal.value, canFitTableToWidth(editor.value)))

  const handleFitToWidth = (): boolean => {
    const instance = editor.value
    if (!instance || !canFitTableToWidth(instance)) return false
    try {
      const table = getTable(instance)
      if (!table) return false
      const dom = instance.view.dom
      const style = getComputedStyle(dom)
      const paddingLeft = parseFloat(style.paddingLeft) || 0
      const paddingRight = parseFloat(style.paddingRight) || 0
      const available = dom.clientWidth - paddingLeft - paddingRight
      const columns = table.map.width
      if (columns === 0) return false
      const rawWidth = Math.floor((available - columns - 8) / columns)
      const columnWidth = Math.max(rawWidth, RESIZE_MIN_WIDTH)
      const tr = instance.state.tr
      table.node.descendants((node, pos) => {
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          const cellPos = table.start + pos
          const colspan = node.attrs.colspan || 1
          tr.setNodeMarkup(cellPos, undefined, {
            ...node.attrs,
            colwidth: Array(colspan).fill(columnWidth),
          })
        }
      })
      if (tr.docChanged) instance.view.dispatch(tr)
      return true
    } catch (error) {
      console.error('Error setting table auto width:', error)
      return false
    }
  }

  return { canFitToWidth, handleFitToWidth, label: 'Fit to width', Icon: MoveHorizontalIcon }
}
