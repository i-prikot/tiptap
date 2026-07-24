import type { EditorState } from '@tiptap/pm/state'
import { CellSelection, toggleHeader } from '@tiptap/pm/tables'
import { isExtensionAvailable } from '../tiptap-utils'
import {
  getIndexCoordinates,
  getRowOrColumnCells,
  getTableSelectionType,
  selectCellsByCoords,
} from '../table-utils'
import type { Orientation } from '../table-utils'
import type { EditorMessageKey } from '../../i18n/types'
import { TABLE_EXTENSION, dispatchOf } from './shared'
import type { RowColumnArgs } from './shared'

export const HEADER_LABELS = {
  row: 'table.headerRow',
  column: 'table.headerColumn',
} as const satisfies Record<Orientation, EditorMessageKey>

export function canToggleHeaderRowColumn({
  editor,
  index,
  orientation,
  tablePos,
}: RowColumnArgs): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSION)) return false
  const selectionType = getTableSelectionType(editor, index, orientation, tablePos)
  return !!selectionType && selectionType.index === 0
}

export function isHeaderRowColumnActive({
  editor,
  index,
  orientation,
  tablePos,
}: RowColumnArgs): boolean {
  if (!editor) return false
  if (editor.state.selection instanceof CellSelection)
    return editor.isActive('tableHeader') || false
  const selectionType = getTableSelectionType(editor, index, orientation)
  const cells = getRowOrColumnCells(editor, index, selectionType?.orientation, tablePos)
  if (!cells) return false
  const checkIndex = +(cells.cells.length > 1)
  return cells.cells[checkIndex]?.node?.type.name === 'tableHeader'
}

export function toggleHeaderRowColumn({
  editor,
  index,
  orientation,
  tablePos,
}: RowColumnArgs): boolean {
  if (!editor || !canToggleHeaderRowColumn({ editor, index, orientation, tablePos })) return false
  try {
    const selectionType = getTableSelectionType(editor, index, orientation, tablePos)
    if (!selectionType) return false
    const isRow = selectionType.orientation === 'row'
    if (editor.state.selection instanceof CellSelection) {
      return isRow ? editor.commands.toggleHeaderRow() : editor.commands.toggleHeaderColumn()
    }
    if (typeof tablePos !== 'number') return false
    const coords = getIndexCoordinates({
      editor,
      index: selectionType.index,
      orientation: selectionType.orientation,
      tablePos,
    })
    if (!coords) return false
    const state = selectCellsByCoords(editor, tablePos, coords, { mode: 'state' })
    if (!state) return false
    const dispatch = dispatchOf(editor)
    return isRow
      ? toggleHeader('row')(state as EditorState, dispatch)
      : toggleHeader('column')(state as EditorState, dispatch)
  } catch {
    return false
  }
}
