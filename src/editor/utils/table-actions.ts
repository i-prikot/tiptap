/**
 * Действия над строками/столбцами/ячейками таблицы (чистые функции —
 * Vue-компоненты оборачивают их в computed на сигнале выделения).
 * Порт хуков useTableDuplicate/Move/Header/Add/Delete/Sort/RowColumn,
 * useTableClearRowColumnContent, useTableMergeSplitCell из чанков
 * 3gf8l96fmxb-u и 2yhkpc8fmweba (их внутренние can-/handle-функции).
 */
import type { Editor } from '@tiptap/core'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { NodeSelection } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import {
  CellSelection,
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  cellAround,
  columnIsHeader,
  deleteCellSelection,
  deleteColumn,
  deleteRow,
  mergeCells,
  moveTableColumn,
  moveTableRow,
  rowIsHeader,
  selectedRect,
  splitCell,
  toggleHeader,
} from '@tiptap/pm/tables'
import type { TableMap } from '@tiptap/pm/tables'
import { isExtensionAvailable } from './tiptap-utils'
import {
  cellsOverlapRectangle,
  getIndexCoordinates,
  getRowOrColumnCells,
  getTable,
  getTableSelectionType,
  isCellEmpty,
  isTableNode,
  selectCellsByCoords,
  setCellAttr,
  updateSelectionAfterAction,
} from './table-utils'
import type { Orientation, TableInfo } from './table-utils'

export interface RowColumnArgs {
  editor: Editor | null
  index?: number
  orientation?: Orientation
  tablePos?: number
}

export type AddSide = 'above' | 'below' | 'left' | 'right'
export type MoveDirection = 'up' | 'down' | 'left' | 'right'
export type SortDirection = 'asc' | 'desc'
export type MergeSplitAction = 'merge' | 'split'

const HANDLE_EXTENSION = ['tableHandleExtension']
const TABLE_EXTENSION = ['table']

const RESET_CELL_ATTRS = { backgroundColor: null, nodeVerticalAlign: null, nodeTextAlign: null }

function dispatchOf(editor: Editor) {
  return (tr: Transaction) => editor.view.dispatch(tr)
}

function safeRowIsHeader(map: TableMap, node: ProseMirrorNode, index: number): boolean {
  try {
    return rowIsHeader(map, node, index)
  } catch {
    return false
  }
}

function safeColumnIsHeader(map: TableMap, node: ProseMirrorNode, index: number): boolean {
  try {
    return columnIsHeader(map, node, index)
  } catch {
    return false
  }
}

// ------------------------------------------------------------- duplicate

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
    targetReversed.forEach((cell, i) => {
      const from = sourceReversed[i]
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

// ------------------------------------------------------------------ move

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

// ---------------------------------------------------------------- header

export const HEADER_LABELS: Record<Orientation, string> = {
  row: 'Header row',
  column: 'Header column',
}

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

// ------------------------------------------------------------------- add

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

// ---------------------------------------------------------------- delete

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

// ------------------------------------------------------------------ sort

export const SORT_LABELS: Record<Orientation, Record<SortDirection, string>> = {
  row: { asc: 'Sort row A-Z', desc: 'Sort row Z-A' },
  column: { asc: 'Sort column A-Z', desc: 'Sort column Z-A' },
}

function isHeaderCell(node: ProseMirrorNode | null | undefined): boolean {
  return (
    !!node &&
    (node.type.name === 'tableHeader' ||
      node.type.name === 'table_header' ||
      node.attrs?.header === true)
  )
}

function cellSortText(node: ProseMirrorNode | null | undefined): string {
  if (!node) return ''
  let text = ''
  node.descendants((child) => {
    if (child.isText) text += child.text || ''
    return true
  })
  return text.trim().toLowerCase()
}

export function canSortRowColumn({ editor, index, orientation, tablePos }: RowColumnArgs): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, HANDLE_EXTENSION)) return false
  try {
    const table = getTable(editor, tablePos)
    if (!table) return false
    const cells = getRowOrColumnCells(editor, index, orientation, tablePos)
    if (cells.orientation === 'row') {
      if (table.map.width < 2) return false
    } else if (table.map.height < 2) return false
    if (
      cells.mergedCells.length > 0 ||
      !cells.cells.some((cell) => cell.node && !isHeaderCell(cell.node) && !isCellEmpty(cell.node))
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export function sortRowColumn(args: RowColumnArgs & { direction: SortDirection }): boolean {
  const { editor, index, orientation, direction, tablePos } = args
  if (!canSortRowColumn(args) || !editor) return false
  try {
    const { state, view } = editor
    const tr = state.tr
    const line = getRowOrColumnCells(editor, index, orientation, tablePos)
    if (line.mergedCells.length > 0) {
      console.warn(`Cannot sort ${orientation} ${index}: contains merged cells`)
      return false
    }
    if (line.cells.length < 2) return false
    const entries = line.cells.map((cell, i) => ({
      sortText: cellSortText(cell.node),
      originalNode: cell.node,
      cellInfo: cell,
      originalIndex: i,
      isHeader: isHeaderCell(cell.node),
      isEmpty: !cell.node || isCellEmpty(cell.node),
    }))
    const sortable = entries.filter((entry) => !entry.isHeader)
    if (sortable.length < 2) return false
    sortable.sort((a, b) => {
      if (a.isEmpty && !b.isEmpty) return 1
      if (!a.isEmpty && b.isEmpty) return -1
      if (a.isEmpty && b.isEmpty) return 0
      const compared = a.sortText.localeCompare(b.sortText, undefined, { sensitivity: 'base' })
      return direction === 'asc' ? compared : -compared
    })
    const reordered: Array<ProseMirrorNode | null> = []
    let sortableIndex = 0
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const cell = line.cells[i]
      if (!cell || !entry) continue
      let node: ProseMirrorNode | null = null
      if (entry.isHeader) node = entry.originalNode
      else {
        node = sortable[sortableIndex]?.originalNode || null
        sortableIndex++
      }
      if (node && cell.node) {
        reordered.push(cell.node.type.create(node.attrs, node.content, node.marks))
      } else {
        reordered.push(cell.node)
      }
    }
    const cellsReversed = [...line.cells].reverse()
    const nodesReversed = [...reordered].reverse()
    cellsReversed.forEach((cell, i) => {
      const node = nodesReversed[i]
      if (node && cell.node) tr.replaceWith(cell.pos, cell.pos + cell.node.nodeSize, node)
    })
    if (tr.docChanged) {
      view.dispatch(tr)
      return true
    }
    return false
  } catch (error) {
    console.error(`Error sorting table ${orientation}:`, error)
    return false
  }
}

// ----------------------------------------------------------------- clear

export const CLEAR_LABELS: Record<Orientation, string> = {
  row: 'Clear row contents',
  column: 'Clear column contents',
}

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
    console.error('Error resetting cell attributes:', error)
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
        console.error(`Error clearing ${selectionType.orientation} content:`, error)
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
      console.error('Error clearing selected cells:', error)
      return false
    }
  } catch (error) {
    console.error('Error clearing table content:', error)
    return false
  }
}

// ------------------------------------------------------------- clear all

export const CLEAR_ALL_LABEL = 'Clear all contents'

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
    console.error('Error clearing all table content:', error)
    return false
  }
}

// ----------------------------------------------------------- merge/split

export const MERGE_SPLIT_LABELS: Record<MergeSplitAction, string> = {
  merge: 'Merge cells',
  split: 'Split cell',
}

export function canMergeCells(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSION)) return false
  try {
    return mergeCells(editor.state, undefined)
  } catch {
    return false
  }
}

export function canSplitCell(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, TABLE_EXTENSION)) return false
  try {
    return splitCell(editor.state, undefined)
  } catch {
    return false
  }
}

export function mergeSplitCells(editor: Editor | null, action: MergeSplitAction): boolean {
  if (!editor) return false
  try {
    if (action === 'merge') {
      if (!canMergeCells(editor)) return false
      return mergeCells(editor.state, editor.view.dispatch.bind(editor.view))
    }
    if (!canSplitCell(editor)) return false
    return splitCell(editor.state, editor.view.dispatch.bind(editor.view))
  } catch (error) {
    console.error(`Error ${action}ing table cell:`, error)
    return false
  }
}
