/**
 * Таблицы: кастомные Table/TableCell поверх @tiptap/extension-table.
 * Порт из чанка 1eb79ylai6rew (модули 621993/935917):
 * - NodeView оборачивает tableWrapper в div[data-content-type="table"] и
 *   добавляет контейнеры .table-container / .table-controls /
 *   .table-selection-overlay-container (в них телепортируются ручки,
 *   extend-кнопки и overlay выделения);
 * - columnResizing: min 35px при ресайзе, дефолт 120px (пустая ячейка);
 * - Backspace/Delete при полном CellSelection удаляют таблицу целиком;
 * - Mod-A в ячейке выделяет только её содержимое.
 */
import { Extension } from '@tiptap/core'
import type { AnyExtension } from '@tiptap/core'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TextSelection } from '@tiptap/pm/state'
import { findParentNodeClosestToPos } from '@tiptap/core'
import {
  CellSelection,
  TableView,
  cellAround,
  columnResizing,
  tableEditing,
} from '@tiptap/pm/tables'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { EMPTY_CELL_WIDTH, RESIZE_MIN_WIDTH } from '../utils/table-utils.js'

/** Backspace/Delete: если выделены все ячейки — удалить таблицу. */
const deleteTableWhenAllCellsSelected = ({ editor }: { editor: import('@tiptap/core').Editor }) => {
  const { selection } = editor.state
  if (!(selection instanceof CellSelection)) return false
  let cellCount = 0
  const table = findParentNodeClosestToPos(
    selection.ranges[0].$from,
    (node) => node.type.name === 'table',
  )
  table?.node.descendants((node) => {
    if (node.type.name === 'table') return false
    if (['tableCell', 'tableHeader'].includes(node.type.name)) cellCount += 1
  })
  if (cellCount !== selection.ranges.length) return false
  editor.commands.deleteTable()
  return true
}

/**
 * NodeView: blockContainer[data-content-type=table] > tableWrapper >
 * (.table-container > table, .table-controls, .table-selection-overlay-container).
 */
class NotionTableView extends TableView {
  blockContainer: HTMLElement
  innerTableContainer: HTMLElement
  widgetsContainer: HTMLElement
  overlayContainer: HTMLElement
  containerAttributes: Record<string, string>

  constructor(node: ProseMirrorNode, cellMinWidth: number, attributes?: Record<string, string>) {
    super(node, cellMinWidth)
    this.containerAttributes = attributes ?? {}
    this.blockContainer = this.createBlockContainer()
    this.innerTableContainer = this.createInnerTableContainer()
    this.widgetsContainer = this.createWidgetsContainer()
    this.overlayContainer = this.createOverlayContainer()
    this.setupDOMStructure()
  }

  createBlockContainer() {
    const element = document.createElement('div')
    element.setAttribute('data-content-type', 'table')
    Object.entries(this.containerAttributes).forEach(([key, value]) => {
      if (key !== 'class') element.setAttribute(key, value)
    })
    return element
  }

  createInnerTableContainer() {
    const element = document.createElement('div')
    element.className = 'table-container'
    return element
  }

  createWidgetsContainer() {
    const element = document.createElement('div')
    element.className = 'table-controls'
    element.style.position = 'relative'
    return element
  }

  createOverlayContainer() {
    const element = document.createElement('div')
    element.className = 'table-selection-overlay-container'
    return element
  }

  setupDOMStructure() {
    const wrapper = this.dom
    const table = wrapper.firstChild as HTMLElement
    this.innerTableContainer.appendChild(table)
    wrapper.appendChild(this.innerTableContainer)
    wrapper.appendChild(this.widgetsContainer)
    wrapper.appendChild(this.overlayContainer)
    this.blockContainer.appendChild(wrapper)
    ;(this as { dom: HTMLElement }).dom = this.blockContainer
  }

  override ignoreMutation(record: Parameters<TableView['ignoreMutation']>[0]): boolean {
    const target = record.target as HTMLElement
    if (!target.closest('.table-container')) return true
    return super.ignoreMutation(record)
  }
}

export const NotionTable = Table.extend({
  addProseMirrorPlugins() {
    const resizable = this.options.resizable && this.editor.isEditable
    const defaultCellMinWidth =
      this.options.cellMinWidth < EMPTY_CELL_WIDTH ? EMPTY_CELL_WIDTH : this.options.cellMinWidth
    return [
      ...(resizable
        ? [
            columnResizing({
              handleWidth: this.options.handleWidth,
              cellMinWidth: RESIZE_MIN_WIDTH,
              defaultCellMinWidth,
              View: null,
              lastColumnResizable: this.options.lastColumnResizable,
            }),
          ]
        : []),
      tableEditing({ allowTableNodeSelection: this.options.allowTableNodeSelection }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Backspace: deleteTableWhenAllCellsSelected,
      'Mod-Backspace': deleteTableWhenAllCellsSelected,
      Delete: deleteTableWhenAllCellsSelected,
      'Mod-Delete': deleteTableWhenAllCellsSelected,
    }
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) =>
      new NotionTableView(
        node,
        this.options.cellMinWidth < EMPTY_CELL_WIDTH ? EMPTY_CELL_WIDTH : this.options.cellMinWidth,
        HTMLAttributes as Record<string, string>,
      )
  },
})

export const NotionTableCell = TableCell.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      // Mod-A внутри ячейки выделяет только её содержимое
      'Mod-a': () => {
        const { state, view } = this.editor
        const { selection, doc } = state
        const $anchor = selection.$anchor
        const $cell = cellAround($anchor)
        if (!$cell) return false
        const cellNode = doc.nodeAt($cell.pos)
        if (!cellNode || !cellNode.textContent) return false
        const from = $cell.pos + 1
        const to = $cell.pos + cellNode.nodeSize - 1
        if (from >= to) return true
        const $from = doc.resolve(from)
        const $to = doc.resolve(to)
        const cellSelection = TextSelection.between($from, $to, 1)
        if (!cellSelection || state.selection.eq(cellSelection)) return true
        view.dispatch(state.tr.setSelection(cellSelection))
        return true
      },
    }
  },
})

export interface TableKitOptions {
  table: Parameters<(typeof NotionTable)['configure']>[0] | false
  tableCell: Parameters<(typeof NotionTableCell)['configure']>[0] | false
  tableHeader: Parameters<(typeof TableHeader)['configure']>[0] | false
  tableRow: Parameters<(typeof TableRow)['configure']>[0] | false
}

export const TableKit = Extension.create<TableKitOptions>({
  name: 'tableKit',

  addExtensions() {
    const extensions: AnyExtension[] = []
    if (this.options.table !== false) extensions.push(NotionTable.configure(this.options.table))
    if (this.options.tableCell !== false)
      extensions.push(NotionTableCell.configure(this.options.tableCell))
    if (this.options.tableHeader !== false)
      extensions.push(TableHeader.configure(this.options.tableHeader))
    if (this.options.tableRow !== false) extensions.push(TableRow.configure(this.options.tableRow))
    return extensions
  },
})
