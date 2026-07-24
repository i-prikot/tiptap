import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'

/** Направление структурной операции и соответствующей drag-геометрии. */
export type DraggedCellOrientation = 'row' | 'col'

/**
 * Временное состояние одной активной перестановки строки или столбца.
 *
 * `originalIndex` фиксируется при старте drag и никогда не становится текущей
 * целью. `mousePos` обновляется по ограниченной координате указателя во время
 * dragover, а `initialOffset` сохраняет относительную позицию ручки для UI.
 * Состояние существует только до успешного drop или `dragEnd`; потребители не
 * должны воспринимать его как подтверждённое изменение документа.
 */
export interface TableDraggingState {
  draggedCellOrientation: DraggedCellOrientation
  originalIndex: number
  mousePos: number
  initialOffset?: number
}

/**
 * Снимок состояния табличных ручек, передаваемый UI через `tableHandleState`.
 *
 * Геометрия относится к текущему DOM таблицы, а индексы — к её текущей модели и
 * могут отсутствовать на рамке таблицы. `show*Button` описывает доступность
 * UI-элемента, но не проверяет права, валидность команды или успешность операции.
 * Во время drag `draggingState` определяет источник, тогда `rowIndex`/`colIndex`
 * указывают текущую hover-цель для preview и drop.
 */
export interface TableHandleState {
  show: boolean
  showAddOrRemoveRowsButton: boolean
  showAddOrRemoveColumnsButton: boolean
  /** DOM-прямоугольник `tbody`; virtual UI использует его как якорь таблицы. */
  referencePosTable: DOMRect
  block: ProseMirrorNode
  blockPos: number
  /** DOM-контейнер UI-виджетов; может отсутствовать у нестандартной разметки. */
  widgetContainer: HTMLElement | null | undefined
  /** Прямоугольник hover-ячейки; очищается при выходе за пределы таблицы. */
  referencePosCell?: DOMRect
  colIndex?: number
  rowIndex?: number
  /** Активная операция drag, а не состояние выделения ProseMirror. */
  draggingState?: TableDraggingState
}

/**
 * Минимальный общий контракт между plugin view и drag-and-drop хелперами.
 *
 * Хелперы меняют только UI-снимок и freeze meta через этот bridge; перемещение
 * строки или столбца выполняется отдельно командами таблицы при подтверждённом
 * drop.
 */
export interface TableHandleDragContext {
  editor: Editor
  editorView: EditorView
  state: TableHandleState | undefined
  emitUpdate: () => void
  setPluginFrozen: (value: boolean | null) => void
}
