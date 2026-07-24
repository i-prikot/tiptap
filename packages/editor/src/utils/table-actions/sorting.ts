import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { isExtensionAvailable } from '../tiptap-utils'
import { getRowOrColumnCells, getTable, isCellEmpty } from '../table-utils'
import type { Orientation } from '../table-utils'
import { HANDLE_EXTENSION } from './shared'
import type { RowColumnArgs, SortDirection } from './shared'
import type { EditorMessageKey } from '../../i18n/types'

export const SORT_LABELS = {
  row: { asc: 'table.sortRowAscending', desc: 'table.sortRowDescending' },
  column: { asc: 'table.sortColumnAscending', desc: 'table.sortColumnDescending' },
} as const satisfies Record<Orientation, Record<SortDirection, EditorMessageKey>>

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
    const entries = line.cells.map((cell, originalIndex) => ({
      sortText: cellSortText(cell.node),
      originalNode: cell.node,
      cellInfo: cell,
      originalIndex,
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
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index]
      const cell = line.cells[index]
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
    cellsReversed.forEach((cell, index) => {
      const node = nodesReversed[index]
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
