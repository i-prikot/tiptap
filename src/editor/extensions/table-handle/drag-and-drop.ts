import type { EditorState } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'
import { CellSelection, moveTableColumn, moveTableRow } from '@tiptap/pm/tables'
import {
  clamp,
  getCellIndicesFromDOM,
  getIndexCoordinates,
  isHTMLElement,
  selectCellsByCoords,
} from '../../utils/table-utils'
import { isValidPosition } from '../../utils/tiptap-utils'
import type { DraggedCellOrientation, TableHandleDragContext } from './types'

let activeHandleContext: TableHandleDragContext | null = null

export function setActiveTableHandleContext(context: TableHandleDragContext) {
  activeHandleContext = context
}

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
    for (let index = 0; index < count; index++)
      queue.push({ src: srcChildren[index], dst: dstChildren[index] })
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
  for (let index = 0; index < row.cells.length; index++) {
    const sourceCell = row.cells[index]
    const clonedCell = clonedRow.cells[index]
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
  for (let index = 0; index < tbody.rows.length; index++) {
    const row = tbody.rows[index]
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
  context: TableHandleDragContext,
  orientation: DraggedCellOrientation,
  index: number,
  tablePos: number,
): HTMLElement {
  const editorRect = context.editor.view.dom.getBoundingClientRect()
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
  const tableDom = context.editor.view.nodeDOM(tablePos) as HTMLElement | null
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

function startDrag(orientation: DraggedCellOrientation, event: DragEvent) {
  if (!activeHandleContext?.state) {
    throw new Error(`Attempted to drag table ${orientation}, but no table block was hovered prior.`)
  }
  const { state, editor } = activeHandleContext
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

  const dragImage = createDragImage(activeHandleContext, orientation, index, blockPos)
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
  activeHandleContext.state = {
    ...state,
    draggingState: {
      draggedCellOrientation: orientation,
      originalIndex: index,
      mousePos,
      initialOffset,
    },
  }
  activeHandleContext.emitUpdate()
  activeHandleContext.setPluginFrozen(true)
}

export const colDragStart = (event: DragEvent) => startDrag('col', event)
export const rowDragStart = (event: DragEvent) => startDrag('row', event)

export function dragEnd() {
  if (!activeHandleContext || activeHandleContext.state === undefined) return
  activeHandleContext.state = { ...activeHandleContext.state, draggingState: undefined }
  activeHandleContext.emitUpdate()
  activeHandleContext.setPluginFrozen(null)
}

export function handleTableHandleDragOver(context: TableHandleDragContext, event: DragEvent) {
  if (context.state?.draggingState === undefined) return
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
  ;(context.editorView.root as Document | ShadowRoot)
    .querySelectorAll<HTMLElement>('.prosemirror-dropcursor-block, .prosemirror-dropcursor-inline')
    .forEach((element) => {
      element.style.visibility = 'hidden'
    })
  const { left, right, top, bottom } = context.state.referencePosTable
  const point = {
    left: clamp(event.clientX, left + 1, right - 1),
    top: clamp(event.clientY, top + 1, bottom - 1),
  }
  const cells = (context.editorView.root as Document | ShadowRoot)
    .elementsFromPoint(point.left, point.top)
    .filter((element) => element.tagName === 'TD' || element.tagName === 'TH')
  if (cells.length === 0) return
  const cell = cells[0]
  if (!isHTMLElement(cell)) return
  const indices = getCellIndicesFromDOM(cell, context.state.block, context.editor)
  if (!indices) return
  const { rowIndex, colIndex } = indices
  const isRow = context.state.draggingState.draggedCellOrientation === 'row'
  const previousIndex = isRow ? context.state.rowIndex : context.state.colIndex
  const newIndex = isRow ? rowIndex : colIndex
  const mousePos = isRow ? point.top : point.left
  const indexChanged = context.state.rowIndex !== rowIndex || context.state.colIndex !== colIndex
  const mouseMoved = context.state.draggingState.mousePos !== mousePos
  if (indexChanged || mouseMoved) {
    context.state = {
      ...context.state,
      rowIndex,
      colIndex,
      referencePosCell: cell.getBoundingClientRect(),
      draggingState: { ...context.state.draggingState, mousePos },
    }
    context.emitUpdate()
  }
  if (newIndex !== previousIndex) context.setPluginFrozen(true)
}

export function handleTableHandleDrop(context: TableHandleDragContext) {
  const state = context.state
  if (!state?.draggingState) return false
  const { draggingState, rowIndex, colIndex, blockPos } = state
  if (!isValidPosition(blockPos)) return false
  if (
    (draggingState.draggedCellOrientation === 'row' && rowIndex === undefined) ||
    (draggingState.draggedCellOrientation === 'col' && colIndex === undefined)
  ) {
    throw new Error('Attempted to drop table row or column, but no table block was hovered prior.')
  }
  const isRow = draggingState.draggedCellOrientation === 'row'
  const targetIndex = (isRow ? rowIndex : colIndex) as number
  const coords = getIndexCoordinates({
    editor: context.editor,
    index: draggingState.originalIndex,
    orientation: isRow ? 'row' : 'column',
    tablePos: blockPos,
  })
  if (!coords) return false
  const selectedState = selectCellsByCoords(context.editor, blockPos, coords, { mode: 'state' })
  if (!selectedState) return false
  const dispatch = (tr: import('@tiptap/pm/state').Transaction) => context.editor.view.dispatch(tr)
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
  context.state = { ...state, draggingState: undefined }
  context.emitUpdate()
  context.setPluginFrozen(null)
  return true
}
