import type { EditorState } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'
import { CellSelection, moveTableColumn, moveTableRow } from '@tiptap/pm/tables'
import {
  clamp,
  getCellIndicesFromDOM,
  getIndexCoordinates,
  isHTMLElement,
  selectCellsByCoords,
} from '../../utils/table-utils.js'
import { isValidPosition } from '../../utils/tiptap-utils.js'
import type { DraggedCellOrientation, TableHandleDragContext } from './types.js'
import { createDragImage } from './drag-preview.js'

/**
 * Контекст последнего созданного TableHandleView для обработчиков drag ручек.
 *
 * DOM-обработчики начала drag не получают view напрямую, поэтому используют этот
 * bridge. Он предназначен для одного активного редактора/ручек и не хранит
 * переносимое содержимое документа.
 */
let activeHandleContext: TableHandleDragContext | null = null

/** Связывает drag-хелперы с актуальным TableHandleView при создании plugin view. */
export function setActiveTableHandleContext(context: TableHandleDragContext) {
  activeHandleContext = context
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

/**
 * Завершает native drag без предположения об успешном drop.
 *
 * Это terminal cleanup для отменённого и завершённого браузером пути: он всегда
 * очищает `draggingState`, уведомляет UI и снимает freeze, если общий контекст
 * ещё содержит состояние.
 */
export function dragEnd() {
  if (!activeHandleContext || activeHandleContext.state === undefined) return
  activeHandleContext.state = { ...activeHandleContext.state, draggingState: undefined }
  activeHandleContext.emitUpdate()
  activeHandleContext.setPluginFrozen(null)
}

/**
 * Обновляет hover-цель активной перестановки по позиции указателя.
 *
 * Координаты ограничиваются границами `tbody`, чтобы `elementsFromPoint` не
 * выбрал элемент вне таблицы. Функция не перемещает документ: она обновляет
 * индексы, геометрию и `mousePos` для UI/декораций, скрывает штатный
 * ProseMirror dropcursor и сохраняет freeze при смене цели.
 */
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

/**
 * Подтверждает drop и применяет перестановку через команды таблицы.
 *
 * До транзакции проверяются наличие drag-состояния, валидность `blockPos`,
 * целевого индекса и координат исходной строки/столбца. Команда создаёт новое
 * выделение и dispatch-ит transaction; только успешный путь очищает
 * `draggingState` и снимает freeze. Остальные terminal browser-пути очищает
 * `dragEnd`, поэтому UI не должен очищать состояние самостоятельно.
 */
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
