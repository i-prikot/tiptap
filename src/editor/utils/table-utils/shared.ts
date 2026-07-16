import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'
import { CellSelection, TableMap, selectedRect } from '@tiptap/pm/tables'

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

export interface DomCellInfo {
  type: 'cell' | 'wrapper'
  domNode: HTMLElement
  tbodyNode: HTMLElement | null
}

export function isWithinMap(row: number, col: number, map: TableMap): boolean {
  return row >= 0 && row < map.height && col >= 0 && col < map.width
}

export function getCellSelectionType(
  state: EditorState,
  index?: number,
  orientation?: Orientation,
): { orientation: Orientation; index: number } | null {
  if (typeof index === 'number' && orientation) return { orientation, index }
  if (!(state.selection instanceof CellSelection)) return null

  const rect = selectedRect(state)
  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  if (height === 1 && width >= 1) return { orientation: 'row', index: rect.top }
  if (width === 1 && height >= 1) return { orientation: 'column', index: rect.left }
  return null
}
