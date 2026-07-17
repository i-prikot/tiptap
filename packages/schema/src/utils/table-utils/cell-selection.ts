import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Selection } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { Mapping } from '@tiptap/pm/transform'
import { CellSelection, TableMap, cellAround, isInTable, selectionCell } from '@tiptap/pm/tables'

import { clamp } from './table-calculations.js'
import { getTable } from './table-map.js'
import { getCellSelectionType, isWithinMap, type Orientation } from './shared.js'

export function getTableSelectionType(
  editor: Editor | null,
  index?: number,
  orientation?: Orientation,
  tablePos?: number,
): { orientation: Orientation; index: number } | null {
  if (typeof index === 'number' && orientation) return { orientation, index }
  if (!editor) return null
  if (!getTable(editor, tablePos)) return null
  return getCellSelectionType(editor.state, index, orientation)
}

/**
 * Выполняет действие, сохраняя позицию курсора (bookmark + mapping всех
 * промежуточных транзакций).
 */
export function runPreservingCursor(editor: Editor, action: () => void): boolean {
  const view = editor.view
  const selection = view.state.selection
  const bookmark = selection.getBookmark()
  const mapping = new Mapping()
  const originalDispatch = view.dispatch
  view.dispatch = (tr: Transaction) => {
    mapping.appendMapping(tr.mapping)
    originalDispatch(tr)
  }
  try {
    action()
  } finally {
    view.dispatch = originalDispatch
  }
  try {
    const restored = bookmark.map(mapping).resolve(view.state.doc)
    view.dispatch(view.state.tr.setSelection(restored))
    return true
  } catch {
    const pos = clamp(mapping.map(selection.from, -1), 0, view.state.doc.content.size)
    const near = Selection.near(view.state.doc.resolve(pos), -1)
    view.dispatch(view.state.tr.setSelection(near))
    return false
  }
}

export type SelectCellsMode =
  | { mode?: 'state' }
  | { mode: 'dispatch'; dispatch: (tr: Transaction) => void }
  | { mode: 'transaction' }

/** CellSelection по координатам; возвращает state/transaction либо диспатчит. */
export function selectCellsByCoords(
  editor: Editor | null,
  tablePos: number,
  coords: Array<{ row: number; col: number }>,
  options: SelectCellsMode = { mode: 'state' },
): EditorState | Transaction | undefined {
  if (!editor) return undefined
  const table = getTable(editor, tablePos)
  if (!table) return undefined
  const { state } = editor
  const map = table.map
  const clamped = coords
    .map((coord) => ({
      row: clamp(coord.row, 0, map.height - 1),
      col: clamp(coord.col, 0, map.width - 1),
    }))
    .filter((coord) => isWithinMap(coord.row, coord.col, map))
  if (clamped.length === 0) return undefined

  const rows = clamped.map((coord) => coord.row)
  const minRow = Math.min(...rows)
  const maxRow = Math.max(...rows)
  const cols = clamped.map((coord) => coord.col)
  const minCol = Math.min(...cols)
  const maxCol = Math.max(...cols)

  const cellPosAt = (row: number, col: number): number | null => {
    const relative = map.map[row * map.width + col]
    return relative === undefined ? null : tablePos + 1 + relative
  }

  const anchorPos = cellPosAt(minRow, minCol)
  if (anchorPos === null) return undefined
  let headPos = cellPosAt(maxRow, maxCol)
  if (headPos === null) return undefined

  // merged-ячейка может дать один и тот же pos — ищем другой угол
  if (headPos === anchorPos) {
    let found = false
    for (let row = maxRow; row >= minRow && !found; row--) {
      for (let col = maxCol; col >= minCol && !found; col--) {
        const pos = cellPosAt(row, col)
        if (pos !== null && pos !== anchorPos) {
          headPos = pos
          found = true
        }
      }
    }
  }

  try {
    const $anchor = state.doc.resolve(anchorPos)
    const $head = state.doc.resolve(headPos)
    const selection = new CellSelection($anchor, $head)
    const tr = state.tr.setSelection(selection)
    switch (options.mode ?? 'state') {
      case 'dispatch':
        if ('dispatch' in options && typeof options.dispatch === 'function') options.dispatch(tr)
        return undefined
      case 'transaction':
        return tr
      default:
        return state.apply(tr)
    }
  } catch (error) {
    console.error('Failed to create cell selection:', error)
    return undefined
  }
}

/** Выделяет последнюю строку/столбец (для extend-кнопок). */
export function selectLastCell(
  editor: Editor,
  tableNode: ProseMirrorNode,
  tablePos: number,
  orientation: Orientation,
): boolean {
  const map = TableMap.get(tableNode)
  const isRow = orientation === 'row'
  const row = isRow ? map.height - 1 : 0
  const col = isRow ? 0 : map.width - 1
  const mapIndex = row * map.width + col
  const relative = map.map[mapIndex]
  if (!relative && relative !== 0) {
    console.warn('selectLastCell: cell position not found in map', {
      index: mapIndex,
      row,
      col,
      map,
    })
    return false
  }
  const firstIndex = map.map.indexOf(relative)
  const targetRow = firstIndex >= 0 ? Math.floor(firstIndex / map.width) : 0
  const targetCol = firstIndex >= 0 ? firstIndex % map.width : 0

  const table = getTable(editor, tablePos)
  if (!table || !isWithinMap(targetRow, targetCol, table.map)) return false
  const cellRelative = table.map.positionAt(targetRow, targetCol, table.node)
  const cellPos = table.start + cellRelative
  const $pos = editor.state.doc.resolve(cellPos)
  const $cell = cellAround($pos)
  const finalPos = $cell ? $cell.pos : cellPos
  const selection = CellSelection.create(editor.state.doc, finalPos)
  editor.view.dispatch(editor.state.tr.setSelection(selection))
  return true
}

/** setCellAttr с поддержкой набора атрибутов (объектом). */
export function setCellAttr(name: string | Record<string, unknown>, value?: unknown) {
  return function (state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
    if (!isInTable(state)) return false
    const $cell = selectionCell(state)
    const attrs = typeof name === 'string' ? { [name]: value } : name
    if (dispatch) {
      const tr = state.tr
      if (state.selection instanceof CellSelection) {
        state.selection.forEachCell((node, pos) => {
          if (Object.entries(attrs).some(([key, val]) => node.attrs[key] !== val)) {
            tr.setNodeMarkup(pos, null, { ...node.attrs, ...attrs })
          }
        })
      } else if (Object.entries(attrs).some(([key, val]) => $cell.nodeAfter!.attrs[key] !== val)) {
        tr.setNodeMarkup($cell.pos, null, { ...$cell.nodeAfter!.attrs, ...attrs })
      }
      dispatch(tr)
    }
    return true
  }
}

/** После add/move/duplicate — выделить затронутую строку/столбец. */
export function updateSelectionAfterAction(
  editor: Editor,
  orientation: Orientation,
  index: number,
  tablePos?: number,
): void {
  try {
    const table = getTable(editor, tablePos)
    if (!table) return
    const { state } = editor
    const { map } = table
    if (orientation === 'row') {
      if (index >= 0 && index < map.height) {
        const lastCol = map.width - 1
        const from = table.start + map.positionAt(index, 0, table.node)
        const to = table.start + map.positionAt(index, lastCol, table.node)
        const selection = CellSelection.create(
          state.doc,
          state.doc.resolve(from).pos,
          state.doc.resolve(to).pos,
        )
        editor.view.dispatch(state.tr.setSelection(selection))
      }
    } else if (orientation === 'column' && index >= 0 && index < map.width) {
      const lastRow = map.height - 1
      const from = table.start + map.positionAt(0, index, table.node)
      const to = table.start + map.positionAt(lastRow, index, table.node)
      const selection = CellSelection.create(
        state.doc,
        state.doc.resolve(from).pos,
        state.doc.resolve(to).pos,
      )
      editor.view.dispatch(state.tr.setSelection(selection))
    }
  } catch (error) {
    console.warn('Failed to update selection after move:', error)
  }
}
