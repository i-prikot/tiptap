/**
 * TableHandleExtension: следит за наведением на таблицу и сообщает UI
 * состояние ручек (строка/столбец/extend-кнопки), реализует drag&drop
 * перестановку строк и столбцов с drag-превью и dropcursor-декорациями.
 * Порт из чанка 1eb79ylai6rew (модули 122945/556442).
 */
import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { CellSelection, TableMap, moveTableColumn, moveTableRow } from '@tiptap/pm/tables'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'
import {
  clamp,
  domCellAround,
  getCellIndicesFromDOM,
  getColumnCells,
  getIndexCoordinates,
  getRowCells,
  getTableFromDOM,
  isHTMLElement,
  isTableNode,
  safeClosest,
  selectCellsByCoords,
} from '../utils/table-utils'
import { isValidPosition } from '../utils/tiptap-utils'

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

export const tableHandlePluginKey = new PluginKey<boolean>('tableHandlePlugin')

class TableHandleView {
  editor: Editor
  editorView: EditorView
  state: TableHandleState | undefined = undefined
  menuFrozen = false
  mouseState: 'up' | 'down' | 'selecting' = 'up'
  tableId: string | undefined
  tablePos: number | undefined
  tableElement: HTMLElement | null | undefined
  emitUpdate: () => void

  constructor(editor: Editor, view: EditorView, emit: (state: TableHandleState) => void) {
    this.editor = editor
    this.editorView = view
    this.emitUpdate = () => this.state && emit(this.state)
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
    this.mouseMoveHandler(event)
  }

  mouseMoveHandler = (event: MouseEvent) => {
    if (this.menuFrozen || this.mouseState === 'selecting') return
    const target = event.target
    if (isHTMLElement(target) && this.editorView.dom.contains(target))
      this.handleMouseMoveNow(event)
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

  dragOverHandler = (event: DragEvent) => {
    if (this.state?.draggingState === undefined) return
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
    ;(this.editorView.root as Document | ShadowRoot)
      .querySelectorAll<HTMLElement>(
        '.prosemirror-dropcursor-block, .prosemirror-dropcursor-inline',
      )
      .forEach((element) => {
        element.style.visibility = 'hidden'
      })
    const { left, right, top, bottom } = this.state.referencePosTable
    const point = {
      left: clamp(event.clientX, left + 1, right - 1),
      top: clamp(event.clientY, top + 1, bottom - 1),
    }
    const cells = (this.editorView.root as Document | ShadowRoot)
      .elementsFromPoint(point.left, point.top)
      .filter((element) => element.tagName === 'TD' || element.tagName === 'TH')
    if (cells.length === 0) return
    const cell = cells[0]
    if (!isHTMLElement(cell)) return
    const indices = getCellIndicesFromDOM(cell, this.state.block, this.editor)
    if (!indices) return
    const { rowIndex, colIndex } = indices
    const isRow = this.state.draggingState.draggedCellOrientation === 'row'
    const prevIndex = isRow ? this.state.rowIndex : this.state.colIndex
    const newIndex = isRow ? rowIndex : colIndex
    const mousePos = isRow ? point.top : point.left
    const indexChanged = this.state.rowIndex !== rowIndex || this.state.colIndex !== colIndex
    const mouseMoved = this.state.draggingState.mousePos !== mousePos
    if (indexChanged || mouseMoved) {
      this.state = {
        ...this.state,
        rowIndex,
        colIndex,
        referencePosCell: cell.getBoundingClientRect(),
        draggingState: { ...this.state.draggingState, mousePos },
      }
      this.emitUpdate()
    }
    if (newIndex !== prevIndex) {
      this.editor.view.dispatch(this.editor.state.tr.setMeta(tableHandlePluginKey, true))
    }
  }

  dropHandler = () => {
    this.mouseState = 'up'
    const state = this.state
    if (!state?.draggingState) return false
    const { draggingState, rowIndex, colIndex, blockPos } = state
    if (!isValidPosition(blockPos)) return false
    if (
      (draggingState.draggedCellOrientation === 'row' && rowIndex === undefined) ||
      (draggingState.draggedCellOrientation === 'col' && colIndex === undefined)
    ) {
      throw new Error(
        'Attempted to drop table row or column, but no table block was hovered prior.',
      )
    }
    const isRow = draggingState.draggedCellOrientation === 'row'
    const targetIndex = (isRow ? rowIndex : colIndex) as number
    const coords = getIndexCoordinates({
      editor: this.editor,
      index: draggingState.originalIndex,
      orientation: isRow ? 'row' : 'column',
      tablePos: blockPos,
    })
    if (!coords) return false
    const selectedState = selectCellsByCoords(this.editor, blockPos, coords, { mode: 'state' })
    if (!selectedState) return false
    const dispatch = (tr: import('@tiptap/pm/state').Transaction) => this.editor.view.dispatch(tr)
    if (isRow) {
      moveTableRow({
        from: draggingState.originalIndex,
        to: targetIndex,
        select: true,
        pos: blockPos + 1,
      })(selectedState as EditorState, dispatch)
    } else {
      moveTableColumn({
        from: draggingState.originalIndex,
        to: targetIndex,
        select: true,
        pos: blockPos + 1,
      })(selectedState as EditorState, dispatch)
    }
    this.state = { ...state, draggingState: undefined }
    this.emitUpdate()
    this.editor.view.dispatch(this.editor.state.tr.setMeta(tableHandlePluginKey, null))
    return true
  }

  update(view: EditorView) {
    const frozen = tableHandlePluginKey.getState(view.state)
    if (frozen !== undefined && frozen !== this.menuFrozen) this.menuFrozen = frozen as boolean
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
    this.editorView.dom.removeEventListener('mousemove', this.mouseMoveHandler)
    window.removeEventListener('mouseup', this.mouseUpHandler)
    this.editorView.dom.removeEventListener('mousedown', this.viewMousedownHandler)
    this.editorView.root.removeEventListener('dragover', this.dragOverHandler as EventListener)
    this.editorView.root.removeEventListener('drop', this.dropHandler as EventListener)
  }
}

let activeHandleView: TableHandleView | null = null

// ------------------------------------------------------ drag preview DOM

const CLONED_STYLE_PROPS = [
  'boxSizing',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRadius',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'color',
  'font',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textTransform',
  'textDecoration',
  'textAlign',
  'verticalAlign',
  'whiteSpace',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'backgroundClip',
]

const toKebab = (value: string) => value.replace(/[A-Z]/g, (char) => '-' + char.toLowerCase())

/** Глубокий клон DOM-узла с копированием вычисленных стилей. */
function cloneWithStyles(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement
  const queue: Array<{ src: Element; dst: Element }> = [{ src: source, dst: clone }]
  while (queue.length) {
    const { src, dst } = queue.shift()!
    if (src instanceof HTMLElement && dst instanceof HTMLElement) {
      const computed = getComputedStyle(src)
      for (const prop of CLONED_STYLE_PROPS) {
        const value = computed.getPropertyValue(toKebab(prop))
        if (value) dst.style.setProperty(toKebab(prop), value)
      }
      dst.style.overflow = 'hidden'
      dst.style.textOverflow = 'ellipsis'
      if (computed.whiteSpace === '' || computed.whiteSpace === 'normal')
        dst.style.whiteSpace = 'nowrap'
    }
    const srcChildren = Array.from(src.children)
    const dstChildren = Array.from(dst.children)
    const count = Math.min(srcChildren.length, dstChildren.length)
    for (let i = 0; i < count; i++) queue.push({ src: srcChildren[i], dst: dstChildren[i] })
  }
  return clone
}

function copyTableStyles(source: HTMLElement, target: HTMLTableElement) {
  const computed = getComputedStyle(source)
  target.style.borderCollapse = computed.borderCollapse
  target.style.borderSpacing = computed.borderSpacing
  target.style.tableLayout = 'fixed'
  target.className = source.className
}

function copyCellWidth(source: HTMLElement, target: HTMLElement) {
  const rect = source.getBoundingClientRect()
  if (rect.width > 0) {
    target.style.width = `${rect.width}px`
    target.style.maxWidth = `${rect.width}px`
  }
}

function buildRowPreview(table: HTMLElement, rowIndex: number): HTMLTableElement | null {
  const tbody = (table as HTMLTableElement).tBodies?.[0] ?? table.querySelector('tbody')
  if (!tbody) return null
  const row = tbody.rows?.[rowIndex]
  if (!row) return null
  const previewTable = document.createElement('table')
  const previewBody = document.createElement('tbody')
  const clonedRow = cloneWithStyles(row) as HTMLTableRowElement
  copyTableStyles(table, previewTable)
  for (let i = 0; i < row.cells.length; i++) {
    const sourceCell = row.cells[i]
    const clonedCell = clonedRow.cells[i]
    if (clonedCell) copyCellWidth(sourceCell, clonedCell)
  }
  previewBody.appendChild(clonedRow)
  previewTable.appendChild(previewBody)
  return previewTable
}

function buildColumnPreview(table: HTMLElement, colIndex: number): HTMLTableElement | null {
  const tbody = (table as HTMLTableElement).tBodies?.[0] ?? table.querySelector('tbody')
  if (!tbody) return null
  const previewTable = document.createElement('table')
  const previewBody = document.createElement('tbody')
  copyTableStyles(table, previewTable)
  let width = 0
  for (let i = 0; i < tbody.rows.length; i++) {
    const row = tbody.rows[i]
    if (!row) continue
    const cell = row.cells?.[colIndex]
    if (!cell) continue
    const previewRow = document.createElement('tr')
    const clonedCell = cloneWithStyles(cell)
    const rect = cell.getBoundingClientRect()
    if (!width && rect.width > 0) width = rect.width
    copyCellWidth(cell, clonedCell)
    previewRow.appendChild(clonedCell)
    previewBody.appendChild(previewRow)
  }
  if (width > 0) {
    previewTable.style.width = `${width}px`
    previewTable.style.maxWidth = `${width}px`
  }
  previewTable.appendChild(previewBody)
  return previewTable
}

function createDragImage(
  editor: Editor,
  orientation: DraggedCellOrientation,
  index: number,
  tablePos: number,
): HTMLElement {
  const editorRect = editor.view.dom.getBoundingClientRect()
  const maxWidth = Math.max(0, editorRect.width)
  const container = document.createElement('div')
  Object.assign(container.style, {
    position: 'fixed',
    top: '-10000px',
    left: '-10000px',
    pointerEvents: 'none',
    zIndex: '2147483647',
    maxWidth: `${maxWidth}px`,
    borderRadius: '12px',
    background: 'transparent',
    filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.18)) drop-shadow(0 2px 8px rgba(0,0,0,0.10))',
    overflow: 'hidden',
  })
  const tableDom = editor.view.nodeDOM(tablePos) as HTMLElement | null
  if (!tableDom) {
    document.body.appendChild(container)
    return container
  }
  const width = Math.min(tableDom.getBoundingClientRect().width, editorRect.width)
  container.style.width = `${width}px`
  const preview =
    orientation === 'row' ? buildRowPreview(tableDom, index) : buildColumnPreview(tableDom, index)
  if (preview) {
    const inner = document.createElement('div')
    Object.assign(inner.style, {
      background: 'var(--drag-image-bg, transparent)',
      overflow: 'hidden',
    })
    inner.appendChild(preview)
    container.appendChild(inner)
  }
  if (!container.isConnected) document.body.appendChild(container)
  const rect = container.getBoundingClientRect()
  if (rect.width > maxWidth && rect.width > 0) {
    const scale = maxWidth / rect.width
    container.style.transformOrigin = 'top left'
    container.style.transform = `scale(${scale})`
  }
  return container
}

// -------------------------------------------------------- drag start/end

function startDrag(orientation: DraggedCellOrientation, event: DragEvent) {
  if (!activeHandleView?.state) {
    throw new Error(`Attempted to drag table ${orientation}, but no table block was hovered prior.`)
  }
  const { state, editor } = activeHandleView
  const index = orientation === 'col' ? state.colIndex : state.rowIndex
  if (index === undefined) {
    throw new Error(`Attempted to drag table ${orientation}, but no table block was hovered prior.`)
  }
  const { blockPos, referencePosCell } = state
  const mousePos = orientation === 'col' ? event.clientX : event.clientY

  if (editor.state.selection instanceof CellSelection) {
    const selection = TextSelection.near(editor.state.doc.resolve(blockPos), 1)
    editor.view.dispatch(editor.state.tr.setSelection(selection))
  }

  const dragImage = createDragImage(editor, orientation, index, blockPos)
  if (event.dataTransfer) {
    const targetRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const offset =
      orientation === 'col' ? { x: targetRect.width / 2, y: 0 } : { x: 0, y: targetRect.height / 2 }
    event.dataTransfer.effectAllowed = orientation === 'col' ? 'move' : 'copyMove'
    event.dataTransfer.setDragImage(dragImage, offset.x, offset.y)
  }
  const removePreview = () => dragImage.parentNode?.removeChild(dragImage)
  document.addEventListener('drop', removePreview, { once: true })
  document.addEventListener('dragend', removePreview, { once: true })

  const initialOffset = referencePosCell
    ? (orientation === 'col' ? referencePosCell.left : referencePosCell.top) - mousePos
    : 0
  activeHandleView.state = {
    ...state,
    draggingState: {
      draggedCellOrientation: orientation,
      originalIndex: index,
      mousePos,
      initialOffset,
    },
  }
  activeHandleView.emitUpdate()
  editor.view.dispatch(editor.state.tr.setMeta(tableHandlePluginKey, true))
}

export const colDragStart = (event: DragEvent) => startDrag('col', event)
export const rowDragStart = (event: DragEvent) => startDrag('row', event)

export function dragEnd() {
  if (!activeHandleView || activeHandleView.state === undefined) return
  activeHandleView.state = { ...activeHandleView.state, draggingState: undefined }
  activeHandleView.emitUpdate()
  const editor = activeHandleView.editor
  editor.view.dispatch(editor.state.tr.setMeta(tableHandlePluginKey, null))
}

// --------------------------------------------------------------- plugin

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
    view: (view) => (activeHandleView = new TableHandleView(editor, view, emit)),
    props: {
      decorations: (state) => {
        if (!activeHandleView) return null
        if (
          activeHandleView.state === undefined ||
          activeHandleView.state.draggingState === undefined ||
          activeHandleView.tablePos === undefined
        ) {
          return undefined
        }
        const isRow = activeHandleView.state.draggingState.draggedCellOrientation === 'row'
        const hoverIndex = isRow ? activeHandleView.state.rowIndex : activeHandleView.state.colIndex
        if (hoverIndex === undefined) return undefined
        const decorations: Decoration[] = []
        const { draggingState } = activeHandleView.state
        const { originalIndex } = draggingState
        const blockPos = activeHandleView.state.blockPos
        const sourceCells = isRow
          ? getRowCells(editor, originalIndex, blockPos).cells
          : getColumnCells(editor, originalIndex, blockPos).cells
        sourceCells.forEach((cell) => {
          if (cell.node) {
            decorations.push(
              Decoration.node(cell.pos, cell.pos + cell.node.nodeSize, {
                class: 'table-cell-dragging-source',
              }),
            )
          }
        })
        if (hoverIndex !== originalIndex && editor) {
          const targetCells = isRow
            ? getRowCells(editor, hoverIndex, blockPos).cells
            : getColumnCells(editor, hoverIndex, blockPos).cells
          targetCells.forEach((cell) => {
            const node = cell.node
            if (!node) return
            const widgetPos = cell.pos + (hoverIndex > originalIndex ? node.nodeSize - 2 : 2)
            decorations.push(
              Decoration.widget(widgetPos, () => {
                const cursor = document.createElement('div')
                cursor.className = 'tiptap-table-dropcursor'
                if (isRow) {
                  cursor.style.left = '0'
                  cursor.style.right = '0'
                  if (hoverIndex > originalIndex) cursor.style.bottom = '-1px'
                  else cursor.style.top = '-1px'
                  cursor.style.height = '3px'
                } else {
                  cursor.style.top = '0'
                  cursor.style.bottom = '0'
                  if (hoverIndex > originalIndex) cursor.style.right = '-1px'
                  else cursor.style.left = '-1px'
                  cursor.style.width = '3px'
                }
                return cursor
              }),
            )
          })
        }
        return DecorationSet.create(state.doc, decorations)
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
