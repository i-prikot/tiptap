import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  colDragStart,
  dragEnd,
  rowDragStart,
  TableHandleExtension,
  tableHandlePluginKey,
} from '../../../src/editor/extensions/table-handle'
import { TableKit } from '../../../src/editor/extensions/table-kit'

interface TableFixture {
  editor: Editor
  table: ProseMirrorNode
  tablePos: number
  cells: HTMLElement[][]
}

const editors: Editor[] = []
const hosts: HTMLElement[] = []

function rect(left: number, top: number, width: number, height: number) {
  return new DOMRect(left, top, width, height)
}

function setRect(element: Element, value: DOMRect) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => value,
  })
}

function createDragEvent(
  type: string,
  currentTarget: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent
  const dataTransfer = { effectAllowed: '', dropEffect: '', setDragImage: vi.fn() }
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
    currentTarget: { value: currentTarget },
    dataTransfer: { value: dataTransfer },
  })
  return { event, dataTransfer }
}

function createTableFixture(): TableFixture {
  const host = document.createElement('div')
  document.body.append(host)
  hosts.push(host)

  const editor = new Editor({
    element: host,
    extensions: [
      StarterKit,
      TableKit.configure({ table: { resizable: true, cellMinWidth: 120 } }),
      TableHandleExtension,
    ],
  })
  editors.push(editor)
  editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })

  let table: ProseMirrorNode | undefined
  let tablePos: number | undefined
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'table') {
      table = node
      tablePos = pos
    }
  })
  if (!table || tablePos === undefined) throw new Error('Expected the editor to contain one table')

  const tableWrapper = editor.view.nodeDOM(tablePos) as HTMLElement
  const tableDom = tableWrapper.matches('table')
    ? (tableWrapper as HTMLTableElement)
    : tableWrapper.querySelector<HTMLTableElement>('table')
  if (!tableDom) throw new Error('Expected the table wrapper to contain a table')
  const body = tableDom.tBodies[0]
  if (!body) throw new Error('Expected the table to render a tbody')
  setRect(tableWrapper, rect(0, 0, 240, 80))
  setRect(tableDom, rect(0, 0, 240, 80))
  setRect(body, rect(0, 0, 240, 80))
  setRect(editor.view.dom, rect(0, 0, 480, 240))

  const selectedTable = table
  const selectedTablePos = tablePos
  const map = TableMap.get(selectedTable)
  const rows = Array.from(body.querySelectorAll<HTMLTableRowElement>('tr'))
  Object.defineProperty(body, 'rows', { configurable: true, value: rows })
  const cells = rows.map((row, rowIndex) => {
    const rowCells = Array.from(row.querySelectorAll<HTMLElement>('td, th'))
    Object.defineProperty(row, 'cells', { configurable: true, value: rowCells })
    return rowCells.map((cell, columnIndex) => {
      setRect(cell, rect(columnIndex * 120, rowIndex * 40, 120, 40))
      return cell
    })
  })
  vi.spyOn(editor.view, 'posAtCoords').mockImplementation(({ left, top }) => {
    const rowIndex = top >= 40 ? 1 : 0
    const columnIndex = left >= 120 ? 1 : 0
    return {
      pos: selectedTablePos + 3 + map.map[rowIndex * map.width + columnIndex]!,
      inside: selectedTablePos,
    }
  })

  return { editor, table: selectedTable, tablePos: selectedTablePos, cells }
}

function dispatchTableHandleMouseMove(
  fixture: TableFixture,
  cell: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const stopAtEditorRoot = (event: Event) => event.stopPropagation()
  fixture.editor.view.dom.addEventListener('mousemove', stopAtEditorRoot)
  cell.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }))
  fixture.editor.view.dom.removeEventListener('mousemove', stopAtEditorRoot)
}

function selectAllTableCells(fixture: TableFixture) {
  const map = TableMap.get(fixture.table)
  const firstCell = fixture.tablePos + 1 + map.map[0]!
  const lastCell = fixture.tablePos + 1 + map.map[map.map.length - 1]!
  fixture.editor.view.dispatch(
    fixture.editor.state.tr.setSelection(
      new CellSelection(
        fixture.editor.state.doc.resolve(firstCell),
        fixture.editor.state.doc.resolve(lastCell),
      ),
    ),
  )
}

afterEach(() => {
  vi.useRealTimers()
  while (editors.length) editors.pop()?.destroy()
  while (hosts.length) hosts.pop()?.remove()
  document.body.replaceChildren()
})

describe('table handle extension', () => {
  it('tracks hovered cells, freezes handles, and drags both table orientations', () => {
    const fixture = createTableFixture()
    const updates: unknown[] = []
    fixture.editor.on('tableHandleState', (state) => updates.push(state))

    fixture.cells[1]![1]!.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 180, clientY: 60 }),
    )
    expect(updates).not.toHaveLength(0)
    expect(updates[updates.length - 1]).toMatchObject({
      show: true,
      rowIndex: 1,
      colIndex: 1,
      showAddOrRemoveRowsButton: true,
      showAddOrRemoveColumnsButton: true,
    })

    fixture.editor.commands.freezeHandles()
    expect(tableHandlePluginKey.getState(fixture.editor.state)).toBe(true)
    fixture.cells[0]![0]!.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 20, clientY: 20 }),
    )
    fixture.editor.commands.unfreezeHandles()
    expect(tableHandlePluginKey.getState(fixture.editor.state)).toBe(false)

    selectAllTableCells(fixture)
    const rowControl = document.createElement('button')
    document.body.append(rowControl)
    setRect(rowControl, rect(0, 0, 30, 30))
    const rowStart = createDragEvent('dragstart', rowControl, 180, 60)
    rowDragStart(rowStart.event)
    expect(rowStart.dataTransfer.effectAllowed).toBe('copyMove')
    expect(rowStart.dataTransfer.setDragImage).toHaveBeenCalledOnce()
    expect(tableHandlePluginKey.getState(fixture.editor.state)).toBe(true)

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: () => [fixture.cells[0]![1]!],
    })
    document.dispatchEvent(createDragEvent('dragover', document.body, 180, 20).event)
    document.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    expect(tableHandlePluginKey.getState(fixture.editor.state)).toBeNull()

    fixture.cells[0]![0]!.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 20, clientY: 20 }),
    )
    const columnControl = document.createElement('button')
    document.body.append(columnControl)
    setRect(columnControl, rect(0, 0, 30, 30))
    const columnStart = createDragEvent('dragstart', columnControl, 20, 20)
    colDragStart(columnStart.event)
    expect(columnStart.dataTransfer.effectAllowed).toBe('move')
    dragEnd()
    expect(tableHandlePluginKey.getState(fixture.editor.state)).toBeNull()
  })

  it('returns a cell selection to text selection when clicking an unfocused table cell', () => {
    const fixture = createTableFixture()
    selectAllTableCells(fixture)
    fixture.cells[0]![0]!.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 20, clientY: 20 }),
    )

    expect(fixture.editor.state.selection).toBeInstanceOf(TextSelection)
  })

  it('does not emit a queued mousemove update after handles freeze', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-22T19:25:00.000Z'))
    const fixture = createTableFixture()
    const updates: unknown[] = []
    fixture.editor.on('tableHandleState', (state) => updates.push(state))

    dispatchTableHandleMouseMove(fixture, fixture.cells[0]![0]!, 20, 20)
    dispatchTableHandleMouseMove(fixture, fixture.cells[1]![1]!, 180, 60)
    expect(updates).toHaveLength(1)

    fixture.editor.commands.freezeHandles()
    vi.advanceTimersByTime(16)

    expect(updates).toHaveLength(1)
  })

  it('cancels a queued mousemove before dropping a table row', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-22T19:25:00.000Z'))
    const fixture = createTableFixture()
    const updates: unknown[] = []
    fixture.editor.on('tableHandleState', (state) => updates.push(state))

    dispatchTableHandleMouseMove(fixture, fixture.cells[0]![0]!, 20, 20)
    dispatchTableHandleMouseMove(fixture, fixture.cells[1]![1]!, 180, 60)
    selectAllTableCells(fixture)
    const rowControl = document.createElement('button')
    document.body.append(rowControl)
    setRect(rowControl, rect(0, 0, 30, 30))
    rowDragStart(createDragEvent('dragstart', rowControl, 20, 20).event)
    document.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    const updatesAfterDrop = updates.length

    vi.advanceTimersByTime(16)

    expect(updates).toHaveLength(updatesAfterDrop)
  })
})
