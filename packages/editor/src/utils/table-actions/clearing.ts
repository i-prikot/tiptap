import { createLogger } from '@i-prikot/editor-schema'
import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import { CellSelection, cellAround, deleteCellSelection } from '@tiptap/pm/tables'
import { isExtensionAvailable } from '../tiptap-utils'
import {
  getRowOrColumnCells,
  getTable,
  getTableSelectionType,
  isCellEmpty,
  isTableNode,
  setCellAttr,
} from '../table-utils'
import type { Orientation, TableInfo } from '../table-utils'
import type { EditorMessageKey } from '../../i18n/types'
import { RESET_CELL_ATTRS, TABLE_EXTENSION } from './shared'
import type { RowColumnArgs } from './shared'

const logger = createLogger('table-actions/clearing')

export const CLEAR_LABELS = {
  row: 'table.clearRowContents',
  column: 'table.clearColumnContents',
} as const satisfies Record<Orientation, EditorMessageKey>

export function canClearRowColumnContent({
  editor,
  index,
  orientation,
  tablePos,
}: RowColumnArgs): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSION)) return false
  try {
    if (!getTable(editor, tablePos)) return false
    const selectionType = getTableSelectionType(editor, index, orientation, tablePos)
    if (selectionType) {
      const cells = getRowOrColumnCells(
        editor,
        selectionType.index,
        selectionType.orientation,
        tablePos,
      )
      if (cells.cells.length === 0) return false
      return cells.cells.some((cell) => cell.node && !isCellEmpty(cell.node))
    }
    const { selection } = editor.state
    if (selection instanceof CellSelection) {
      let hasContent = false
      selection.forEachCell((node) => {
        if (!isCellEmpty(node)) hasContent = true
      })
      return hasContent
    }
    const $cell = cellAround(selection.$anchor)
    if (!$cell) return false
    const node = editor.state.doc.nodeAt($cell.pos)
    return !!node && !isCellEmpty(node)
  } catch {
    return false
  }
}

/** Видимость пункта Clear: есть строка/столбец либо курсор в ячейке. */
export function isClearRowColumnVisible({
  editor,
  index,
  orientation,
  tablePos,
}: RowColumnArgs): boolean {
  if (
    !editor ||
    !editor.isEditable ||
    !isExtensionAvailable(editor, TABLE_EXTENSION) ||
    !getTable(editor, tablePos)
  ) {
    return false
  }
  const selectionType = getTableSelectionType(editor, index, orientation, tablePos)
  const { selection } = editor.state
  const inCell = selection instanceof CellSelection || cellAround(selection.$anchor)
  return !!selectionType || !!inCell
}

function resetCellAttrs(editor: Editor): boolean {
  try {
    return setCellAttr(RESET_CELL_ATTRS)(editor.state, editor.view.dispatch)
  } catch (error) {
    logger.error('Error resetting cell attributes:', error)
    return false
  }
}

export function clearRowColumnContent(args: RowColumnArgs & { resetAttrs?: boolean }): boolean {
  const { editor, index, orientation, tablePos, resetAttrs = false } = args
  if (!canClearRowColumnContent(args) || !editor) return false
  try {
    const selectionType = getTableSelectionType(editor, index, orientation, tablePos)
    if (selectionType) {
      try {
        const { state, view } = editor
        const tr = state.tr
        const cells = getRowOrColumnCells(
          editor,
          selectionType.index,
          selectionType.orientation,
          tablePos,
        )
        if (cells.cells.length === 0) return false
        ;[...cells.cells].reverse().forEach((cell) => {
          if (cell.node && !isCellEmpty(cell.node)) {
            const from = cell.pos + 1
            const to = cell.pos + cell.node.nodeSize - 1
            if (from < to) tr.delete(from, to)
            if (resetAttrs)
              tr.setNodeMarkup(cell.pos, null, { ...cell.node.attrs, ...RESET_CELL_ATTRS })
          }
        })
        if (tr.docChanged) {
          view.dispatch(tr)
          return true
        }
        return false
      } catch (error) {
        logger.error(`Error clearing ${selectionType.orientation} content:`, error)
        return false
      }
    }
    // курсор в одной ячейке либо CellSelection
    try {
      const { selection } = editor.state
      if (selection instanceof CellSelection) {
        if (resetAttrs) resetCellAttrs(editor)
        deleteCellSelection(editor.state, editor.view.dispatch)
        return true
      }
      const $cell = cellAround(selection.$anchor)
      if (!$cell) return false
      const node = editor.state.doc.nodeAt($cell.pos)
      if (!node) return false
      const from = $cell.pos + 1
      const to = $cell.pos + node.nodeSize - 1
      if (from >= to) return false
      if (resetAttrs) resetCellAttrs(editor)
      editor.view.dispatch(editor.state.tr.delete(from, to))
      return true
    } catch (error) {
      logger.error('Error clearing selected cells:', error)
      return false
    }
  } catch (error) {
    logger.error('Error clearing table content:', error)
    return false
  }
}

export const CLEAR_ALL_LABEL_KEY = 'table.clearAllContents' as const satisfies EditorMessageKey

/**
 * Таблица под текущим выделением: либо выделенный целиком блок таблицы
 * (NodeSelection), либо таблица вокруг курсора/CellSelection.
 */
function getSelectedTable(editor: Editor | null, tablePos?: number): TableInfo | null {
  if (!editor) return null
  if (typeof tablePos !== 'number') {
    const { selection } = editor.state
    if (selection instanceof NodeSelection && isTableNode(selection.node)) {
      return getTable(editor, selection.from)
    }
  }
  return getTable(editor, tablePos)
}

function collectAllTableCells(table: TableInfo): Array<{ pos: number; node: ProseMirrorNode }> {
  const cells: Array<{ pos: number; node: ProseMirrorNode }> = []
  table.node.descendants((node, pos) => {
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      cells.push({ pos: table.start + pos, node })
      return false
    }
    return true
  })
  return cells
}

export function canClearAllTableContent({ editor, tablePos }: RowColumnArgs): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSION)) return false
  try {
    const table = getSelectedTable(editor, tablePos)
    if (!table) return false
    return collectAllTableCells(table).some((cell) => cell.node && !isCellEmpty(cell.node))
  } catch {
    return false
  }
}

export function clearAllTableContent(args: RowColumnArgs & { resetAttrs?: boolean }): boolean {
  const { editor, tablePos, resetAttrs = true } = args
  if (!canClearAllTableContent({ editor, tablePos }) || !editor) return false
  try {
    const table = getSelectedTable(editor, tablePos)
    if (!table) return false
    const { state, view } = editor
    const tr = state.tr
    // с конца — чтобы позиции ранее собранных ячеек оставались валидными
    ;[...collectAllTableCells(table)].reverse().forEach(({ pos, node }) => {
      if (node && !isCellEmpty(node)) {
        const from = pos + 1
        const to = pos + node.nodeSize - 1
        if (from < to) tr.delete(from, to)
      }
      if (resetAttrs) tr.setNodeMarkup(pos, null, { ...node.attrs, ...RESET_CELL_ATTRS })
    })
    if (tr.docChanged) {
      view.dispatch(tr)
      return true
    }
    return false
  } catch (error) {
    logger.error('Error clearing all table content:', error)
    return false
  }
}
