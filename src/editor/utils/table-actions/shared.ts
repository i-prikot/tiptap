import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { columnIsHeader, rowIsHeader } from '@tiptap/pm/tables'
import type { TableMap } from '@tiptap/pm/tables'
import type { Orientation } from '../table-utils'

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
