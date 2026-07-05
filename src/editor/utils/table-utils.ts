/**
 * Утилиты таблиц: карта ячеек, выделение строк/столбцов, DOM-поиск.
 * Дословный порт lib/tiptap-table-utils (чанк 1eb79ylai6rew, модуль 281498).
 */
import type { Editor } from '@tiptap/core'
import { Selection } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Mapping } from '@tiptap/pm/transform'
import {
  CellSelection,
  TableMap,
  cellAround,
  findTable,
  isInTable,
  selectedRect,
  selectionCell,
} from '@tiptap/pm/tables'
import type { Rect } from '@tiptap/pm/tables'

export const EMPTY_CELL_HEIGHT = 40
export const EMPTY_CELL_WIDTH = 120
export const RESIZE_MIN_WIDTH = 35

export type Orientation = 'row' | 'column'

export interface IndexedCell {
  row: number
  column: number
  pos: number
  node: ProseMirrorNode
  start: number
  depth: number
}

export interface IndexedCells {
  cells: IndexedCell[]
  mergedCells: IndexedCell[]
}

export interface RowOrColumnCells extends IndexedCells {
  index?: number
  orientation?: Orientation
  tablePos?: number
}

export interface TableInfo {
  node: ProseMirrorNode
  pos: number
  start: number
  depth: number
  map: TableMap
}

const EMPTY_CELLS: IndexedCells = { cells: [], mergedCells: [] }

export function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement
}

export function safeClosest(element: HTMLElement | null | undefined, selector: string): HTMLElement | null {
  return (element?.closest?.(selector) as HTMLElement | null) ?? null
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function isWithinMap(row: number, col: number, map: TableMap): boolean {
  return row >= 0 && row < map.height && col >= 0 && col < map.width
}

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
      found = { node, pos: tablePos, start: tablePos + 1, depth: editor.state.doc.resolve(tablePos).depth }
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

export function getRowCells(editor: Editor | null, index?: number, tablePos?: number): IndexedCells {
  return collectCells(editor, 'row', index, tablePos)
}

export function getColumnCells(editor: Editor | null, index?: number, tablePos?: number): IndexedCells {
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
  if (!editor || (typeof index !== 'number' && !(editor.state.selection instanceof CellSelection))) return empty
  let resolvedIndex = index
  let resolvedOrientation = orientation
  if (typeof resolvedIndex !== 'number' || !resolvedOrientation || !['row', 'column'].includes(resolvedOrientation)) {
    const selectionType = getTableSelectionType(editor)
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
function countEmptyFromEnd(editor: Editor | null, tablePos: number, orientation: Orientation): number {
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

export interface DomCellInfo {
  type: 'cell' | 'wrapper'
  domNode: HTMLElement
  tbodyNode: HTMLElement | null
}

/** Ближайшая ячейка (или .tableWrapper) вокруг DOM-узла. */
export function domCellAround(target: EventTarget | null): DomCellInfo | undefined {
  let current = target as HTMLElement | null
  while (
    current &&
    current.tagName !== 'TD' &&
    current.tagName !== 'TH' &&
    !current.classList.contains('tableWrapper')
  ) {
    if (current.classList.contains('ProseMirror')) return undefined
    current = isHTMLElement(current.parentNode) ? current.parentNode : null
  }
  if (!current) return undefined
  return current.tagName === 'TD' || current.tagName === 'TH'
    ? { type: 'cell', domNode: current, tbodyNode: safeClosest(current, 'tbody') }
    : { type: 'wrapper', domNode: current, tbodyNode: current.querySelector('tbody') }
}

export function getCellIndicesFromDOM(
  cell: HTMLElement,
  tableNode: ProseMirrorNode | null,
  editor: Editor,
): { rowIndex: number; colIndex: number } | null {
  if (!tableNode) return null
  try {
    const pos = editor.view.posAtDOM(cell, 0)
    const $pos = editor.view.state.doc.resolve(pos)
    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth)
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        const map = TableMap.get(tableNode)
        const cellPos = $pos.before(depth)
        const tableStart = $pos.start(depth - 2)
        const relative = cellPos - tableStart
        const mapIndex = map.map.indexOf(relative)
        return { rowIndex: Math.floor(mapIndex / map.width), colIndex: mapIndex % map.width }
      }
    }
  } catch (error) {
    console.warn('Could not get cell position:', error)
  }
  return null
}

export function getTableFromDOM(
  element: HTMLElement,
  editor: Editor,
): { node: ProseMirrorNode; pos: number } | null {
  try {
    const pos = editor.view.posAtDOM(element, 0)
    const $pos = editor.view.state.doc.resolve(pos)
    for (let depth = $pos.depth; depth >= 0; depth--) {
      const node = $pos.node(depth)
      if (isTableNode(node)) return { node, pos: depth === 0 ? 0 : $pos.before(depth) }
    }
  } catch (error) {
    console.warn('Could not get table from DOM:', error)
  }
  return null
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
  if (index < 0 || (orientation === 'row' && index >= height) || (orientation === 'column' && index >= width)) {
    return null
  }
  return orientation === 'row'
    ? Array.from({ length: width }, (_, col) => ({ row: index, col }))
    : Array.from({ length: height }, (_, row) => ({ row, col: index }))
}

/** Явные index/orientation либо строка/столбец из CellSelection. */
export function getTableSelectionType(
  editor: Editor | null,
  index?: number,
  orientation?: Orientation,
  tablePos?: number,
): { orientation: Orientation; index: number } | null {
  if (typeof index === 'number' && orientation) return { orientation, index }
  if (!editor) return null
  const { state } = editor
  if (!getTable(editor, tablePos)) return null
  if (state.selection instanceof CellSelection) {
    const rect = selectedRect(state)
    const width = rect.right - rect.left
    const height = rect.bottom - rect.top
    if (height === 1 && width >= 1) return { orientation: 'row', index: rect.top }
    if (width === 1 && height >= 1) return { orientation: 'column', index: rect.left }
  }
  return null
}

export function isCellEmpty(node: ProseMirrorNode): boolean {
  if (node.childCount === 0) return true
  let empty = true
  node.descendants(child => {
    if ((child.isText && child.text?.trim()) || (child.isLeaf && !child.isText)) {
      empty = false
      return false
    }
    return true
  })
  return empty
}

export function isTableNode(node: ProseMirrorNode | null | undefined): boolean {
  return !!node && (node.type.name === 'table' || node.type.spec.tableRole === 'table')
}

/** Округление с «полем» — для порогов drag-расширения таблицы. */
export function marginRound(value: number, margin = 0.3): number {
  const floor = Math.floor(value)
  const ceil = Math.ceil(value)
  if (value < floor + margin) return floor
  if (value > ceil - margin) return ceil
  return Math.round(value)
}

export function rectEq(a?: DOMRect | null, b?: DOMRect | null): boolean {
  return (
    (!a && !b) ||
    (!!a && !!b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height)
  )
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

/** Есть ли в прямоугольнике ячейки, выходящие за его границы (merge). */
export function cellsOverlapRectangle({ width, height, map }: TableMap, rect: Rect): boolean {
  let indexTop = rect.top * width + rect.left
  let indexLeft = indexTop
  let indexBottom = (rect.bottom - 1) * width + rect.left
  let indexRight = indexTop + (rect.right - rect.left - 1)
  for (let i = rect.top; i < rect.bottom; i++) {
    if (
      (rect.left > 0 && map[indexLeft] === map[indexLeft - 1]) ||
      (rect.right < width && map[indexRight] === map[indexRight + 1])
    ) {
      return true
    }
    indexLeft += width
    indexRight += width
  }
  for (let i = rect.left; i < rect.right; i++) {
    if (
      (rect.top > 0 && map[indexTop] === map[indexTop - width]) ||
      (rect.bottom < height && map[indexBottom] === map[indexBottom + width])
    ) {
      return true
    }
    indexTop++
    indexBottom++
  }
  return false
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
    .map(coord => ({ row: clamp(coord.row, 0, map.height - 1), col: clamp(coord.col, 0, map.width - 1) }))
    .filter(coord => isWithinMap(coord.row, coord.col, map))
  if (clamped.length === 0) return undefined

  const rows = clamped.map(coord => coord.row)
  const minRow = Math.min(...rows)
  const maxRow = Math.max(...rows)
  const cols = clamped.map(coord => coord.col)
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
    console.warn('selectLastCell: cell position not found in map', { index: mapIndex, row, col, map })
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
        const selection = CellSelection.create(state.doc, state.doc.resolve(from).pos, state.doc.resolve(to).pos)
        editor.view.dispatch(state.tr.setSelection(selection))
      }
    } else if (orientation === 'column' && index >= 0 && index < map.width) {
      const lastRow = map.height - 1
      const from = table.start + map.positionAt(0, index, table.node)
      const to = table.start + map.positionAt(lastRow, index, table.node)
      const selection = CellSelection.create(state.doc, state.doc.resolve(from).pos, state.doc.resolve(to).pos)
      editor.view.dispatch(state.tr.setSelection(selection))
    }
  } catch (error) {
    console.warn('Failed to update selection after move:', error)
  }
}
