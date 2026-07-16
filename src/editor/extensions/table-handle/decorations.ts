import type { Editor } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { getColumnCells, getRowCells } from '../../utils/table-utils'
import type { TableHandleState } from './types'

interface TableHandleDecorationContext {
  editor: Editor
  editorState: EditorState
  tableState: TableHandleState | undefined
  tablePos: number | undefined
}

export function createTableHandleDecorations({
  editor,
  editorState,
  tableState,
  tablePos,
}: TableHandleDecorationContext) {
  if (tableState === undefined || tableState.draggingState === undefined || tablePos === undefined)
    return undefined

  const isRow = tableState.draggingState.draggedCellOrientation === 'row'
  const hoverIndex = isRow ? tableState.rowIndex : tableState.colIndex
  if (hoverIndex === undefined) return undefined

  const decorations: Decoration[] = []
  const { draggingState } = tableState
  const { originalIndex } = draggingState
  const blockPos = tableState.blockPos
  const sourceCells = isRow
    ? getRowCells(editor, originalIndex, blockPos).cells
    : getColumnCells(editor, originalIndex, blockPos).cells

  sourceCells.forEach((cell) => {
    if (cell.node) {
      decorations.push(
        Decoration.node(cell.pos, cell.pos + cell.node.nodeSize, {
          class: 'table-cell-dragging-source',
        }),
      )
    }
  })

  if (hoverIndex !== originalIndex && editor) {
    const targetCells = isRow
      ? getRowCells(editor, hoverIndex, blockPos).cells
      : getColumnCells(editor, hoverIndex, blockPos).cells
    targetCells.forEach((cell) => {
      const node = cell.node
      if (!node) return
      const widgetPos = cell.pos + (hoverIndex > originalIndex ? node.nodeSize - 2 : 2)
      decorations.push(
        Decoration.widget(widgetPos, () => {
          const cursor = document.createElement('div')
          cursor.className = 'tiptap-table-dropcursor'
          if (isRow) {
            cursor.style.left = '0'
            cursor.style.right = '0'
            if (hoverIndex > originalIndex) cursor.style.bottom = '-1px'
            else cursor.style.top = '-1px'
            cursor.style.height = '3px'
          } else {
            cursor.style.top = '0'
            cursor.style.bottom = '0'
            if (hoverIndex > originalIndex) cursor.style.right = '-1px'
            else cursor.style.left = '-1px'
            cursor.style.width = '3px'
          }
          return cursor
        }),
      )
    })
  }

  return DecorationSet.create(editorState.doc, decorations)
}
