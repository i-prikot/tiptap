import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { columnIsHeader, rowIsHeader } from '@tiptap/pm/tables'
import type { TableMap } from '@tiptap/pm/tables'
import type { Orientation, TableInfo } from '../table-utils'

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

export const HANDLE_EXTENSION = ['tableHandleExtension']
export const TABLE_EXTENSION = ['table']

export const RESET_CELL_ATTRS = {
  backgroundColor: null,
  nodeVerticalAlign: null,
  nodeTextAlign: null,
}

export function dispatchOf(editor: Editor) {
  return (tr: Transaction) => editor.view.dispatch(tr)
}

function reduceColumnSpan(attrs: Record<string, unknown>, offset: number): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...attrs,
    colspan: Math.max(1, (typeof attrs.colspan === 'number' ? attrs.colspan : 1) - 1),
  }
  if (Array.isArray(result.colwidth)) {
    const colwidth = [...result.colwidth]
    colwidth.splice(offset, 1)
    result.colwidth = colwidth.some((width) => typeof width === 'number' && width > 0)
      ? colwidth
      : null
  }
  return result
}

export function deleteResolvedTableLine(
  editor: Editor,
  table: TableInfo,
  orientation: Orientation,
  index: number,
): boolean {
  const { map, node, start } = table
  const tr = editor.state.tr

  if (orientation === 'row') {
    if (map.height <= 1) return false

    let rowPos = 0
    for (let row = 0; row < index; row++) rowPos += node.child(row).nodeSize
    const nextRow = rowPos + node.child(index).nodeSize
    const mapFrom = tr.mapping.maps.length
    tr.delete(rowPos + start, nextRow + start)

    const seen = new Set<number>()
    for (let column = 0, mapIndex = index * map.width; column < map.width; column++, mapIndex++) {
      const cellPos = map.map[mapIndex]
      if (seen.has(cellPos)) continue
      seen.add(cellPos)
      const cell = node.nodeAt(cellPos)
      if (!cell) continue

      if (index > 0 && cellPos === map.map[mapIndex - map.width]) {
        tr.setNodeMarkup(tr.mapping.slice(mapFrom).map(cellPos + start), null, {
          ...cell.attrs,
          rowspan: (cell.attrs.rowspan ?? 1) - 1,
        })
        column += (cell.attrs.colspan ?? 1) - 1
      } else if (index < map.height - 1 && cellPos === map.map[mapIndex + map.width]) {
        const copy = cell.type.create(
          {
            ...cell.attrs,
            rowspan: (cell.attrs.rowspan ?? 1) - 1,
          },
          cell.content,
        )
        const nextCellPos = map.positionAt(index + 1, column, node)
        tr.insert(tr.mapping.slice(mapFrom).map(start + nextCellPos), copy)
        column += (cell.attrs.colspan ?? 1) - 1
      }
    }
  } else {
    if (map.width <= 1) return false

    const mapFrom = tr.mapping.maps.length
    for (let row = 0; row < map.height;) {
      const mapIndex = row * map.width + index
      const cellPos = map.map[mapIndex]
      const cell = node.nodeAt(cellPos)
      if (!cell) return false

      if (
        (index > 0 && map.map[mapIndex - 1] === cellPos) ||
        (index < map.width - 1 && map.map[mapIndex + 1] === cellPos)
      ) {
        tr.setNodeMarkup(
          tr.mapping.slice(mapFrom).map(start + cellPos),
          null,
          reduceColumnSpan(cell.attrs, index - map.colCount(cellPos)),
        )
      } else {
        const cellStart = tr.mapping.slice(mapFrom).map(start + cellPos)
        tr.delete(cellStart, cellStart + cell.nodeSize)
      }
      row += cell.attrs.rowspan ?? 1
    }
  }

  dispatchOf(editor)(tr)
  return true
}

export function safeRowIsHeader(map: TableMap, node: ProseMirrorNode, index: number): boolean {
  try {
    return rowIsHeader(map, node, index)
  } catch {
    return false
  }
}

export function safeColumnIsHeader(map: TableMap, node: ProseMirrorNode, index: number): boolean {
  try {
    return columnIsHeader(map, node, index)
  } catch {
    return false
  }
}
