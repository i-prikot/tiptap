import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'

export type DraggedCellOrientation = 'row' | 'col'

export interface TableDraggingState {
  draggedCellOrientation: DraggedCellOrientation
  originalIndex: number
  mousePos: number
  initialOffset?: number
}

export interface TableHandleState {
  show: boolean
  showAddOrRemoveRowsButton: boolean
  showAddOrRemoveColumnsButton: boolean
  referencePosTable: DOMRect
  block: ProseMirrorNode
  blockPos: number
  widgetContainer: HTMLElement | null | undefined
  referencePosCell?: DOMRect
  colIndex?: number
  rowIndex?: number
  draggingState?: TableDraggingState
}

export interface TableHandleDragContext {
  editor: Editor
  editorView: EditorView
  state: TableHandleState | undefined
  emitUpdate: () => void
  setPluginFrozen: (value: boolean | null) => void
}
