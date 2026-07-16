import type { Editor } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import {
  CellSelection,
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
} from '@tiptap/pm/tables'
import { isExtensionAvailable } from '../tiptap-utils'
import {
  getIndexCoordinates,
  getRowOrColumnCells,
  getTable,
  getTableSelectionType,
  selectCellsByCoords,
  updateSelectionAfterAction,
} from '../table-utils'
import type { Orientation } from '../table-utils'
import {
  HANDLE_EXTENSION,
  TABLE_EXTENSION,
  dispatchOf,
  safeColumnIsHeader,
  safeRowIsHeader,
} from './shared'
import type { AddSide, RowColumnArgs } from './shared'

export const DUPLICATE_LABELS: Record<Orientation, string> = {
  row: 'Duplicate row',
  column: 'Duplicate column',
}

export function canDuplicateRowColumn({
  editor,
  index,
  orientation,
  tablePos,
}: RowColumnArgs): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, HANDLE_EXTENSION)) return false
  try {
    if (!getTable(editor, tablePos)) return false
    const cells = getRowOrColumnCells(editor, index, orientation, tablePos)
    if (cells.mergedCells.length > 0) return false
    return cells.cells.length > 0
  } catch {
    return false
  }
}

function duplicateLine(
  editor: Editor,
  index: number,
  orientation: Orientation,
  tablePos?: number,
): boolean {
  try {
    const source = getRowOrColumnCells(editor, index, orientation, tablePos)
    if (source.cells.length === 0) return false
    const isRow = orientation === 'row'
    let added = false
    if (editor.state.selection instanceof CellSelection) {
      added = isRow
        ? editor.chain().focus().addRowAfter().run()
        : editor.chain().focus().addColumnAfter().run()
    } else {
      if (typeof tablePos !== 'number') return false
      const coords = getIndexCoordinates({ editor, index, orientation, tablePos })
      if (!coords) return false
      const state = selectCellsByCoords(editor, tablePos, coords, { mode: 'state' })
      if (!state) return false
      added = (isRow ? addRowAfter : addColumnAfter)(state as EditorState, dispatchOf(editor))
    }
    if (!added) return false
    const target = getRowOrColumnCells(editor, index + 1, orientation, tablePos)
    if (target.cells.length === 0) return false
    const { state, view } = editor
    const tr = state.tr
    const targetReversed = [...target.cells].reverse()
    const sourceReversed = [...source.cells].reverse()
    targetReversed.forEach((cell, index) => {
      const from = sourceReversed[index]
      if (cell.node && from?.node) {
        const copy = cell.node.type.create(
          { ...from.node.attrs },
          from.node.content,
          from.node.marks,
        )
        tr.replaceWith(cell.pos, cell.pos + cell.node.nodeSize, copy)
      }
    })
    if (tr.docChanged) {
      view.dispatch(tr)
      updateSelectionAfterAction(editor, orientation, index + 1, tablePos)
      return true
    }
    return false
  } catch (error) {
    console.error(`Error duplicating ${orientation}:`, error)
    return false
  }
}

export function duplicateRowColumn({
  editor,
  index,
  orientation,
  tablePos,
}: RowColumnArgs): boolean {
  if (
    !canDuplicateRowColumn({ editor, index, orientation, tablePos }) ||
    !editor ||
    !getTable(editor, tablePos)
  ) {
    return false
  }
  const selectionType = getTableSelectionType(editor, index, orientation)
  if (!selectionType) return false
  return duplicateLine(editor, selectionType.index, selectionType.orientation, tablePos)
}

export const ADD_ROW_LABELS: Record<'above' | 'below', string> = {
  above: 'Insert row above',
  below: 'Insert row below',
}
export const ADD_COLUMN_LABELS: Record<'left' | 'right', string> = {
  left: 'Insert column left',
  right: 'Insert column right',
}

export function canAddRowColumn(args: RowColumnArgs & { side: AddSide }): boolean {
  const { editor, index, orientation, tablePos, side } = args
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSION)) return false
  const table = getTable(editor, tablePos)
  if (!table) return false
  const selectionType = getTableSelectionType(editor, index, orientation)
  if (!selectionType) return false
  const { map, node } = table
  const resolvedIndex = selectionType.index
  const resolvedOrientation = selectionType.orientation
  return !(
    typeof resolvedIndex !== 'number' ||
    resolvedIndex < 0 ||
    (resolvedOrientation === 'column' && resolvedIndex >= map.width) ||
    (resolvedOrientation === 'row' && resolvedIndex >= map.height) ||
    (side === 'left' &&
      resolvedOrientation === 'column' &&
      safeColumnIsHeader(map, node, resolvedIndex)) ||
    (side === 'above' && resolvedOrientation === 'row' && safeRowIsHeader(map, node, resolvedIndex))
  )
}

export function addRowColumn(args: RowColumnArgs & { side: AddSide }): boolean {
  const { editor, index, orientation, side, tablePos } = args
  if (!canAddRowColumn(args) || !editor) return false
  const selectionType = getTableSelectionType(editor, index, orientation)
  if (!selectionType) return false
  const { orientation: resolvedOrientation, index: resolvedIndex } = selectionType
  const dispatch = dispatchOf(editor)
  const command =
    resolvedOrientation === 'row'
      ? side === 'above'
        ? addRowBefore
        : addRowAfter
      : side === 'left'
        ? addColumnBefore
        : addColumnAfter
  try {
    let added = false
    if (editor.state.selection instanceof CellSelection) {
      added = command(editor.state, dispatch)
    } else {
      const table = getTable(editor, tablePos)
      if (!table) return false
      const state = selectCellsByCoords(
        editor,
        table.pos,
        [
          resolvedOrientation === 'row'
            ? { row: resolvedIndex, col: 0 }
            : { row: 0, col: resolvedIndex },
        ],
        { mode: 'state' },
      )
      if (!state) return false
      added = command(state as EditorState, dispatch)
    }
    if (added) {
      const newIndex =
        resolvedOrientation === 'row'
          ? side === 'above'
            ? resolvedIndex
            : resolvedIndex + 1
          : side === 'left'
            ? resolvedIndex
            : resolvedIndex + 1
      updateSelectionAfterAction(editor, resolvedOrientation, newIndex, tablePos)
    }
    return added
  } catch (error) {
    console.error('Error adding row/column:', error)
    return false
  }
}

export const DELETE_LABELS: Record<Orientation, string> = {
  row: 'Delete row',
  column: 'Delete column',
}

export function canDeleteRowColumn({
  editor,
  index,
  orientation,
  tablePos,
}: RowColumnArgs): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSION)) return false
  try {
    return !!getTable(editor, tablePos) && !!getTableSelectionType(editor, index, orientation)
  } catch {
    return false
  }
}

export function deleteRowColumn({ editor, index, orientation, tablePos }: RowColumnArgs): boolean {
  if (!canDeleteRowColumn({ editor, index, orientation, tablePos }) || !editor) return false
  try {
    const selectionType = getTableSelectionType(editor, index, orientation)
    if (!selectionType) return false
    const { orientation: resolvedOrientation, index: resolvedIndex } = selectionType
    const isRow = resolvedOrientation === 'row'
    const dispatch = dispatchOf(editor)
    const command = isRow ? deleteRow : deleteColumn
    if (editor.state.selection instanceof CellSelection) return command(editor.state, dispatch)
    const table = getTable(editor, tablePos)
    if (!table) return false
    const state = selectCellsByCoords(
      editor,
      table.pos,
      [isRow ? { row: resolvedIndex, col: 0 } : { row: 0, col: resolvedIndex }],
      { mode: 'state' },
    )
    if (!state) return false
    return command(state as EditorState, dispatch)
  } catch (error) {
    console.error('Error deleting table row/column:', error)
    return false
  }
}
