import type { EditorState } from '@tiptap/pm/state'
import { CellSelection, moveTableColumn, moveTableRow, selectedRect } from '@tiptap/pm/tables'
import { isExtensionAvailable } from '../tiptap-utils'
import {
  cellsOverlapRectangle,
  getIndexCoordinates,
  getTable,
  getTableSelectionType,
  selectCellsByCoords,
} from '../table-utils'
import type { Orientation } from '../table-utils'
import { HANDLE_EXTENSION, dispatchOf, safeColumnIsHeader, safeRowIsHeader } from './shared'
import type { MoveDirection, RowColumnArgs } from './shared'

export const MOVE_LABELS: Record<Orientation, Record<MoveDirection, string>> = {
  row: { up: 'Move row up', down: 'Move row down', left: 'Move row left', right: 'Move row right' },
  column: {
    up: 'Move column up',
    down: 'Move column down',
    left: 'Move column left',
    right: 'Move column right',
  },
}

export function isMoveDirectionValid(orientation: Orientation, direction: MoveDirection): boolean {
  if (orientation === 'row') return direction === 'up' || direction === 'down'
  return orientation === 'column' && (direction === 'left' || direction === 'right')
}

export function canMoveRowColumn(args: RowColumnArgs & { direction: MoveDirection }): boolean {
  const { editor, index, orientation, direction, tablePos } = args
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, HANDLE_EXTENSION)) return false
  try {
    const table = getTable(editor, tablePos)
    if (!table) return false
    const selectionType = getTableSelectionType(editor, index, orientation)
    if (!selectionType) return false
    const { orientation: resolvedOrientation, index: resolvedIndex } = selectionType
    if (!isMoveDirectionValid(resolvedOrientation, direction)) return false
    if (resolvedOrientation === 'row' && safeRowIsHeader(table.map, table.node, resolvedIndex))
      return false
    if (
      resolvedOrientation === 'column' &&
      safeColumnIsHeader(table.map, table.node, resolvedIndex)
    )
      return false
    const { width, height } = table.map
    const targetIndex =
      resolvedOrientation === 'row'
        ? direction === 'up'
          ? resolvedIndex - 1
          : resolvedIndex + 1
        : direction === 'left'
          ? resolvedIndex - 1
          : resolvedIndex + 1
    const limit = resolvedOrientation === 'row' ? height : width
    if (targetIndex < 0 || targetIndex >= limit) return false
    const fromCoords = getIndexCoordinates({
      editor,
      index: resolvedIndex,
      orientation: resolvedOrientation,
      tablePos,
    })
    const toCoords = getIndexCoordinates({
      editor,
      index: targetIndex,
      orientation: resolvedOrientation,
      tablePos,
    })
    if (!fromCoords || !toCoords) return false
    const fromState = selectCellsByCoords(editor, table.pos, fromCoords, { mode: 'state' })
    if (!fromState) return false
    const fromRect = selectedRect(fromState as EditorState)
    const toState = selectCellsByCoords(editor, table.pos, toCoords, { mode: 'state' })
    if (!toState) return false
    const toRect = selectedRect(toState as EditorState)
    if (cellsOverlapRectangle(table.map, fromRect) && cellsOverlapRectangle(table.map, toRect))
      return false
    return resolvedOrientation === 'row'
      ? direction === 'up'
        ? resolvedIndex > 0
        : resolvedIndex < height - 1
      : direction === 'left'
        ? resolvedIndex > 0
        : resolvedIndex < width - 1
  } catch {
    return false
  }
}

export function moveRowColumn(args: RowColumnArgs & { direction: MoveDirection }): boolean {
  const { editor, index, orientation, direction, tablePos } = args
  if (!canMoveRowColumn(args) || !editor) return false
  try {
    const table = getTable(editor, tablePos)
    if (!table) return false
    const selectionType = getTableSelectionType(editor, index, orientation)
    if (!selectionType) return false
    const { orientation: resolvedOrientation, index: resolvedIndex } = selectionType
    if (!isMoveDirectionValid(resolvedOrientation, direction)) return false
    const targetIndex = resolvedIndex + { up: -1, down: 1, left: -1, right: 1 }[direction]
    const command = resolvedOrientation === 'row' ? moveTableRow : moveTableColumn
    const dispatch = dispatchOf(editor)
    if (editor.state.selection instanceof CellSelection) {
      return command({ from: resolvedIndex, to: targetIndex, select: true, pos: table.start })(
        editor.state,
        dispatch,
      )
    }
    const coords = getIndexCoordinates({
      editor,
      index: resolvedIndex,
      orientation: resolvedOrientation,
      tablePos,
    })
    if (!coords) return false
    const state = selectCellsByCoords(editor, table.pos, coords, { mode: 'state' })
    if (!state) return false
    return command({ from: resolvedIndex, to: targetIndex, select: true, pos: table.start })(
      state as EditorState,
      dispatch,
    )
  } catch (error) {
    console.error('Error moving table row/column:', error)
    return false
  }
}
