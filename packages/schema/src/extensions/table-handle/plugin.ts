import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import {
  domCellAround,
  getCellIndicesFromDOM,
  getTableFromDOM,
  isHTMLElement,
  isTableNode,
  safeClosest,
} from '../../utils/table-utils.js'
import { throttle, type ThrottledFunction } from '../../utils/throttle.js'
import {
  handleTableHandleDragOver,
  handleTableHandleDrop,
  setActiveTableHandleContext,
} from './drag-and-drop.js'
import { createTableHandleDecorations } from './decorations.js'
import type { TableHandleDragContext, TableHandleState } from './types.js'

export const tableHandlePluginKey = new PluginKey<boolean>('tableHandlePlugin')

class TableHandleView implements TableHandleDragContext {
  editor: Editor
  editorView: EditorView
  state: TableHandleState | undefined = undefined
  menuFrozen = false
  mouseState: 'up' | 'down' | 'selecting' = 'up'
  tableId: string | undefined
  tablePos: number | undefined
  tableElement: HTMLElement | null | undefined
  emitUpdate: () => void
  throttledMouseMoveHandler: ThrottledFunction<[MouseEvent]>

  constructor(editor: Editor, view: EditorView, emit: (state: TableHandleState) => void) {
    this.editor = editor
    this.editorView = view
    this.emitUpdate = () => this.state && emit(this.state)
    this.throttledMouseMoveHandler = throttle((event) => this.handleMouseMove(event, false), 16, {
      leading: true,
      trailing: true,
    })
    this.editorView.dom.addEventListener('mousemove', this.mouseMoveHandler)
    this.editorView.dom.addEventListener('mousedown', this.viewMousedownHandler)
    window.addEventListener('mouseup', this.mouseUpHandler)
    this.editorView.root.addEventListener('dragover', this.dragOverHandler as EventListener)
    this.editorView.root.addEventListener('drop', this.dropHandler as EventListener)
  }

  // клик по параграфу внутри ячейки при активном CellSelection ставит
  // текстовое выделение в этот параграф
  viewMousedownHandler = (event: MouseEvent) => {
    this.mouseState = 'down'
    const { state, view } = this.editor
    if (!(state.selection instanceof CellSelection) || this.editor.isFocused) return
    const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
    if (!coords) return
    const $pos = state.doc.resolve(coords.pos)
    const { nodes } = state.schema
    let paragraphDepth = -1
    let inCell = false
    for (let depth = $pos.depth; depth >= 0; depth--) {
      const node = $pos.node(depth)
      if (!inCell && (node.type === nodes.tableCell || node.type === nodes.tableHeader))
        inCell = true
      if (paragraphDepth === -1 && node.type === nodes.paragraph) paragraphDepth = depth
      if (inCell && paragraphDepth !== -1) break
    }
    if (!inCell || paragraphDepth === -1) return
    const from = $pos.start(paragraphDepth)
    const to = $pos.end(paragraphDepth)
    const selection = TextSelection.create(state.doc, from, to)
    if (!state.selection.eq(selection)) {
      view.dispatch(state.tr.setSelection(selection))
      view.focus()
    }
  }

  mouseUpHandler = (event: MouseEvent) => {
    this.mouseState = 'up'
    this.throttledMouseMoveHandler.cancel()
    this.handleMouseMove(event, false)
  }

  mouseMoveHandler = (event: MouseEvent) => {
    this.handleMouseMove(event, true)
  }

  handleMouseMove(event: MouseEvent, throttled: boolean) {
    if (this.menuFrozen || this.mouseState === 'selecting') return
    const target = event.target
    if (isHTMLElement(target) && this.editorView.dom.contains(target))
      if (throttled) this.throttledMouseMoveHandler(event)
      else this.handleMouseMoveNow(event)
  }

  hideHandles() {
    if (this.state?.show) {
      this.state = {
        ...this.state,
        show: false,
        showAddOrRemoveRowsButton: false,
        showAddOrRemoveColumnsButton: false,
        colIndex: undefined,
        rowIndex: undefined,
        referencePosCell: undefined,
      }
      this.emitUpdate()
    }
  }

  handleMouseMoveNow(event: MouseEvent) {
    const cellInfo = domCellAround(event.target)
    if (cellInfo?.type === 'cell' && this.mouseState === 'down' && !this.state?.draggingState) {
      this.mouseState = 'selecting'
      this.hideHandles()
      return
    }
    if (!cellInfo || !this.editor.isEditable) {
      this.hideHandles()
      return
    }
    const tbody = cellInfo.tbodyNode
    if (!tbody) return
    const tbodyRect = tbody.getBoundingClientRect()
    const coords = this.editor.view.posAtCoords({ left: event.clientX, top: event.clientY })
    if (!coords) return

    let table: { node: ProseMirrorNode; pos: number } | undefined
    const $pos = this.editor.view.state.doc.resolve(coords.pos)
    for (let depth = $pos.depth; depth >= 0; depth--) {
      const node = $pos.node(depth)
      if (isTableNode(node)) {
        table = { node, pos: depth === 0 ? 0 : $pos.before(depth) }
        break
      }
    }
    if (!table || table.node.type.name !== 'table') return

    this.tableElement = this.editor.view.nodeDOM(table.pos) as HTMLElement | null
    this.tablePos = table.pos
    this.tableId = table.node.attrs.id

    const wrapper = safeClosest(cellInfo.domNode, '.tableWrapper')
    const widgetContainer = wrapper?.querySelector<HTMLElement>('.table-controls')

    if (cellInfo.type === 'wrapper') {
      // курсор на рамке таблицы: у нижнего/правого края — extend-кнопки
      const nearBottom =
        event.clientY >= tbodyRect.bottom - 1 && event.clientY < tbodyRect.bottom + 20
      const nearRight = event.clientX >= tbodyRect.right - 1 && event.clientX < tbodyRect.right + 20
      const outside = event.clientX > tbodyRect.right || event.clientY > tbodyRect.bottom
      this.state = {
        ...(this.state as TableHandleState),
        show: true,
        showAddOrRemoveRowsButton: nearBottom,
        showAddOrRemoveColumnsButton: nearRight,
        referencePosTable: tbodyRect,
        block: table.node,
        blockPos: table.pos,
        widgetContainer,
        colIndex: outside ? undefined : this.state?.colIndex,
        rowIndex: outside ? undefined : this.state?.rowIndex,
        referencePosCell: outside ? undefined : this.state?.referencePosCell,
      }
    } else {
      const indices = getCellIndicesFromDOM(cellInfo.domNode, table.node, this.editor)
      if (!indices) return
      const { rowIndex, colIndex } = indices
      const cellRect = cellInfo.domNode.getBoundingClientRect()
      const lastRow = table.node.content.childCount - 1
      const lastCol = (table.node.content.firstChild?.content.childCount ?? 0) - 1
      if (
        this.state?.show &&
        this.tableId === table.node.attrs.id &&
        this.state.rowIndex === rowIndex &&
        this.state.colIndex === colIndex
      ) {
        return
      }
      this.state = {
        show: true,
        showAddOrRemoveColumnsButton: colIndex === lastCol,
        showAddOrRemoveRowsButton: rowIndex === lastRow,
        referencePosTable: tbodyRect,
        block: table.node,
        blockPos: table.pos,
        draggingState: undefined,
        referencePosCell: cellRect,
        colIndex,
        rowIndex,
        widgetContainer,
      }
    }
    this.emitUpdate()
    return false
  }

  dragOverHandler = (event: DragEvent) => handleTableHandleDragOver(this, event)

  dropHandler = () => {
    this.throttledMouseMoveHandler.cancel()
    this.mouseState = 'up'
    return handleTableHandleDrop(this)
  }

  setPluginFrozen = (value: boolean | null) => {
    this.editor.view.dispatch(this.editor.state.tr.setMeta(tableHandlePluginKey, value))
  }

  update(view: EditorView) {
    const frozen = tableHandlePluginKey.getState(view.state)
    if (frozen !== undefined && frozen !== this.menuFrozen) {
      this.menuFrozen = frozen as boolean
      if (this.menuFrozen) this.throttledMouseMoveHandler.cancel()
    }
    if (!this.state?.show) return
    if (!this.tableElement?.isConnected) {
      this.hideHandles()
      return
    }
    const table = getTableFromDOM(this.tableElement, this.editor)
    if (!table) {
      this.hideHandles()
      return
    }
    const blockChanged = this.state.block !== table.node || this.state.blockPos !== table.pos
    if (!table.node || table.node.type.name !== 'table' || !this.tableElement?.isConnected) {
      this.hideHandles()
      return
    }
    const { height, width } = TableMap.get(table.node)
    let rowIndex = this.state.rowIndex
    let colIndex = this.state.colIndex
    if (rowIndex !== undefined && rowIndex >= height) rowIndex = height ? height - 1 : undefined
    if (colIndex !== undefined && colIndex >= width) colIndex = width ? width - 1 : undefined

    const tbody = this.tableElement.querySelector('tbody')
    if (!tbody)
      throw new Error(
        "Table block does not contain a 'tbody' HTML element. This should never happen.",
      )

    let cellRect = this.state.referencePosCell
    if (rowIndex !== undefined && colIndex !== undefined) {
      const rowEl = tbody.children[rowIndex]
      const cellEl = rowEl?.children[colIndex]
      if (cellEl) cellRect = cellEl.getBoundingClientRect()
      else {
        rowIndex = undefined
        colIndex = undefined
        cellRect = undefined
      }
    }
    const tbodyRect = tbody.getBoundingClientRect()
    const indexChanged = rowIndex !== this.state.rowIndex || colIndex !== this.state.colIndex
    const rectChanged =
      cellRect !== this.state.referencePosCell || tbodyRect !== this.state.referencePosTable
    if (blockChanged || indexChanged || rectChanged) {
      this.state = {
        ...this.state,
        block: table.node,
        blockPos: table.pos,
        rowIndex,
        colIndex,
        referencePosCell: cellRect,
        referencePosTable: tbodyRect,
      }
      this.emitUpdate()
    }
  }

  destroy() {
    this.throttledMouseMoveHandler.cancel()
    this.editorView.dom.removeEventListener('mousemove', this.mouseMoveHandler)
    window.removeEventListener('mouseup', this.mouseUpHandler)
    this.editorView.dom.removeEventListener('mousedown', this.viewMousedownHandler)
    this.editorView.root.removeEventListener('dragover', this.dragOverHandler as EventListener)
    this.editorView.root.removeEventListener('drop', this.dropHandler as EventListener)
  }
}

let activeHandleView: TableHandleView | null = null

export function TableHandlePlugin(editor: Editor, emit: (state: TableHandleState) => void) {
  return new Plugin({
    key: tableHandlePluginKey,
    state: {
      init: () => false,
      apply: (tr, value) => {
        const meta = tr.getMeta(tableHandlePluginKey)
        return meta !== undefined ? meta : value
      },
    },
    view: (view) => {
      activeHandleView = new TableHandleView(editor, view, emit)
      setActiveTableHandleContext(activeHandleView)
      return activeHandleView
    },
    props: {
      decorations: (state) => {
        if (!activeHandleView) return null
        return createTableHandleDecorations({
          editor,
          editorState: state,
          tableState: activeHandleView.state,
          tablePos: activeHandleView.tablePos,
        })
      },
    },
  })
}

export const TableHandleExtension = Extension.create({
  name: 'tableHandleExtension',

  addCommands() {
    return {
      freezeHandles:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(tableHandlePluginKey, true)
          return true
        },
      unfreezeHandles:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(tableHandlePluginKey, false)
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const { editor } = this
    return [
      TableHandlePlugin(editor, (state) => {
        this.editor.emit('tableHandleState', state)
      }),
    ]
  },
})
