import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'
import {
  CellSelection,
  TableMap,
  cellAround,
  findTable,
  selectedRect,
  selectionCell,
} from '@tiptap/pm/tables'

import { isCellEmpty } from './table-calculations.js'
import {
  getCellSelectionType,
  type IndexedCell,
  type IndexedCells,
  type Orientation,
  type RowOrColumnCells,
  type TableInfo,
} from './shared.js'

const EMPTY_CELLS: IndexedCells = { cells: [], mergedCells: [] }

function isMergedCell(node: ProseMirrorNode | null): boolean {
  if (!node) return false
  const colspan = node.attrs.colspan ?? 1
  const rowspan = node.attrs.rowspan ?? 1
  return colspan > 1 || rowspan > 1
}

/** Таблица по позиции либо вокруг текущего выделения, с TableMap. */
export function getTable(editor: Editor | null | undefined, tablePos?: number): TableInfo | null {
  if (!editor) return null
  let found: { node: ProseMirrorNode; pos: number; start: number; depth: number } | null = null
  if (typeof tablePos === 'number') {
    const node = editor.state.doc.nodeAt(tablePos)
    if (node?.type.name === 'table') {
      found = {
        node,
        pos: tablePos,
        start: tablePos + 1,
        depth: editor.state.doc.resolve(tablePos).depth,
      }
    }
  }
  if (!found) {
    const { state } = editor
    const $pos = state.doc.resolve(state.selection.from)
    found = findTable($pos) ?? null
  }
  if (!found) return null
  const map = TableMap.get(found.node)
  return map ? { ...found, map } : null
}

function resolveIndex(
  state: EditorState,
  table: TableInfo,
  orientation: Orientation,
  index?: number,
): number | null {
  if (typeof index === 'number') return index
  if (state.selection instanceof CellSelection) {
    const rect = selectedRect(state)
    return orientation === 'row' ? rect.top : rect.left
  }
  const $cell = cellAround(state.selection.$anchor) ?? selectionCell(state)
  if (!$cell) return null
  const relative = $cell.pos - table.start
  const cellRect = table.map.findCell(relative)
  return orientation === 'row' ? cellRect.top : cellRect.left
}

function collectCells(
  editor: Editor | null,
  orientation: Orientation,
  index?: number,
  tablePos?: number,
): IndexedCells {
  if (!editor) return EMPTY_CELLS
  const { state } = editor
  const table = getTable(editor, tablePos)
  if (!table) return EMPTY_CELLS
  const { start, node, map } = table

  const resolved = resolveIndex(state, table, orientation, index)
  if (resolved === null) return EMPTY_CELLS
  const limit = orientation === 'row' ? map.height : map.width
  if (resolved < 0 || resolved >= limit) return EMPTY_CELLS

  const cells: IndexedCell[] = []
  const mergedCells: IndexedCell[] = []
  const seen = new Set<number>()
  const count = orientation === 'row' ? map.width : map.height

  for (let i = 0; i < count; i++) {
    const row = orientation === 'row' ? resolved : i
    const column = orientation === 'row' ? i : resolved
    const mapIndex = row * map.width + column
    const relative = map.map[mapIndex]
    if (relative === undefined) continue
    const pos = start + relative
    const cellNode = node.nodeAt(relative)
    if (!cellNode) continue
    const cell: IndexedCell = {
      row,
      column,
      pos,
      node: cellNode,
      start: pos + 1,
      depth: cellNode ? cellNode.content.size : 0,
    }
    if (isMergedCell(cellNode) && !seen.has(pos)) {
      mergedCells.push(cell)
      seen.add(pos)
    }
    cells.push(cell)
  }
  return { cells, mergedCells }
}

export function getRowCells(
  editor: Editor | null,
  index?: number,
  tablePos?: number,
): IndexedCells {
  return collectCells(editor, 'row', index, tablePos)
}

export function getColumnCells(
  editor: Editor | null,
  index?: number,
  tablePos?: number,
): IndexedCells {
  return collectCells(editor, 'column', index, tablePos)
}

export function getRowOrColumnCells(
  editor: Editor | null,
  index?: number,
  orientation?: Orientation,
  tablePos?: number,
): RowOrColumnCells {
  const empty: RowOrColumnCells = {
    cells: [],
    mergedCells: [],
    index: undefined,
    orientation: undefined,
    tablePos: undefined,
  }
  if (
    !editor ||
    (typeof index !== 'number' && !(editor.state.selection instanceof CellSelection))
  ) {
    return empty
  }
  let resolvedIndex = index
  let resolvedOrientation = orientation
  if (
    typeof resolvedIndex !== 'number' ||
    !resolvedOrientation ||
    !['row', 'column'].includes(resolvedOrientation)
  ) {
    const selectionType = getCellSelectionType(editor.state, resolvedIndex, resolvedOrientation)
    if (!selectionType) return empty
    resolvedIndex = selectionType.index
    resolvedOrientation = selectionType.orientation
  }
  return {
    ...collectCells(editor, resolvedOrientation, resolvedIndex, tablePos),
    index: resolvedIndex,
    orientation: resolvedOrientation,
  }
}

/** Пустые строки/столбцы в конце таблицы (для drag-расширения). */
function countEmptyFromEnd(
  editor: Editor | null,
  tablePos: number,
  orientation: Orientation,
): number {
  const table = getTable(editor, tablePos)
  if (!table || !editor) return 0
  const { doc } = editor.state
  const total = orientation === 'row' ? table.map.height : table.map.width
  let count = 0
  for (let lineIndex = total - 1; lineIndex >= 0; lineIndex--) {
    const seen = new Set<number>()
    let lineEmpty = true
    const crossCount = orientation === 'row' ? table.map.width : table.map.height
    for (let i = 0; i < crossCount; i++) {
      const row = orientation === 'row' ? lineIndex : i
      const col = orientation === 'row' ? i : lineIndex
      const relative = table.map.positionAt(row, col, table.node)
      if (seen.has(relative)) continue
      seen.add(relative)
      const node = doc.nodeAt(tablePos + 1 + relative)
      if (node && !isCellEmpty(node)) {
        lineEmpty = false
        break
      }
    }
    if (lineEmpty) count++
    else break
  }
  return count
}

export function countEmptyRowsFromEnd(editor: Editor | null, tablePos: number): number {
  return countEmptyFromEnd(editor, tablePos, 'row')
}

export function countEmptyColumnsFromEnd(editor: Editor | null, tablePos: number): number {
  return countEmptyFromEnd(editor, tablePos, 'column')
}

/** Координаты всех ячеек строки/столбца по индексу. */
export function getIndexCoordinates(args: {
  editor: Editor | null
  index: number
  orientation: Orientation
  tablePos?: number
}): Array<{ row: number; col: number }> | null {
  const { editor, index, orientation, tablePos } = args
  if (!editor) return null
  const table = getTable(editor, tablePos)
  if (!table) return null
  const { width, height } = table.map
  if (
    index < 0 ||
    (orientation === 'row' && index >= height) ||
    (orientation === 'column' && index >= width)
  ) {
    return null
  }
  return orientation === 'row'
    ? Array.from({ length: width }, (_, col) => ({ row: index, col }))
    : Array.from({ length: height }, (_, row) => ({ row, col: index }))
}
