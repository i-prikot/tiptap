import { ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { CellSelection, cellAround } from '@tiptap/pm/tables'
import type { Editor } from '@tiptap/vue-3'
import { getTable, rectEq } from '../utils/table-utils'

type TiptapEditorRef = ComputedRef<Editor | null> | Ref<Editor | null>

export function useTableSelectionRect(editor: TiptapEditorRef) {
  const visible = ref(true)
  const selectionRect = ref<DOMRect | null>(null)
  const tableDom = ref<HTMLElement | null>(null)

  function clearSelectionRect() {
    visible.value = false
    if (selectionRect.value) selectionRect.value = null
  }

  function refreshSelectionRect(instance: Editor) {
    const { selection } = instance.state
    if (selection instanceof CellSelection) {
      const domNodes: HTMLElement[] = []
      selection.forEachCell((_, pos) => {
        const dom = instance.view.nodeDOM(pos) as HTMLElement | null
        if (dom) domNodes.push(dom)
      })
      if (domNodes.length === 0) {
        clearSelectionRect()
        return
      }

      const bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
      domNodes.forEach((dom) => {
        const rect = dom.getBoundingClientRect()
        bounds.left = Math.min(bounds.left, rect.left)
        bounds.top = Math.min(bounds.top, rect.top)
        bounds.right = Math.max(bounds.right, rect.right)
        bounds.bottom = Math.max(bounds.bottom, rect.bottom)
      })
      const rect = new DOMRect(
        bounds.left,
        bounds.top,
        bounds.right - bounds.left,
        bounds.bottom - bounds.top,
      )
      if (!rectEq(selectionRect.value, rect)) selectionRect.value = rect
      visible.value = true
      return
    }

    const $cell = cellAround(selection.$anchor)
    if ($cell) {
      const dom = instance.view.nodeDOM($cell.pos) as HTMLElement | null
      if (dom) {
        const domRect = dom.getBoundingClientRect()
        const rect = new DOMRect(domRect.left, domRect.top, domRect.width, domRect.height)
        if (!rectEq(selectionRect.value, rect)) selectionRect.value = rect
        visible.value = true
        return
      }
    }

    clearSelectionRect()
  }

  function refreshTableDom(instance: Editor | null) {
    if (!instance) {
      tableDom.value = null
      return
    }

    const table = getTable(instance)
    tableDom.value = table
      ? ((instance.view.nodeDOM(table.pos) as HTMLElement | null) ?? null)
      : null
  }

  function refresh() {
    const instance = editor.value
    if (!instance) clearSelectionRect()
    else refreshSelectionRect(instance)
    refreshTableDom(instance)
  }

  return { visible, selectionRect, tableDom, refresh }
}
