import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { provideTiptapEditor } from '../../../src/editor/composables/useTiptapEditor'
import TableSelectionOverlay from '../../../src/editor/components/table/table-selection/TableSelectionOverlay.vue'
import { TableKit } from '../../../src/editor/extensions/table-kit'

interface TableFixture {
  editor: Editor
  table: ProseMirrorNode
  tablePos: number
  cells: HTMLElement[][]
  overlayContainer: HTMLElement
}

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function setRect(element: Element, left: number, top: number, width: number, height: number) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(left, top, width, height),
  })
}

function createTableFixture(): TableFixture {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({
    element: host,
    extensions: [StarterKit, TableKit.configure({ table: { resizable: true, cellMinWidth: 120 } })],
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
  if (!table || tablePos === undefined) throw new Error('Expected a table in the editor')

  const wrapper = editor.view.nodeDOM(tablePos) as HTMLElement
  const tableDom = wrapper.matches('table') ? wrapper : wrapper.querySelector<HTMLElement>('table')
  if (!tableDom) throw new Error('Expected table DOM')
  const body = tableDom.querySelector('tbody')
  if (!body) throw new Error('Expected tbody DOM')
  const overlayContainer = document.createElement('div')
  overlayContainer.className = 'table-selection-overlay-container'
  wrapper.append(overlayContainer)

  const rows = Array.from(body.querySelectorAll('tr'))
  const cells = rows.map((row, rowIndex) =>
    Array.from(row.querySelectorAll<HTMLElement>('td, th'), (cell, columnIndex) => {
      setRect(cell, columnIndex * 120, rowIndex * 40, 120, 40)
      return cell
    }),
  )
  const selectedTable = table
  const selectedTablePos = tablePos
  const map = TableMap.get(selectedTable)
  vi.spyOn(editor.view, 'posAtCoords').mockImplementation(({ left, top }) => {
    const rowIndex = top >= 40 ? 1 : 0
    const columnIndex = left >= 120 ? 1 : 0
    return {
      pos: selectedTablePos + 3 + map.map[rowIndex * map.width + columnIndex]!,
      inside: selectedTablePos,
    }
  })

  const first = selectedTablePos + 1 + map.map[0]!
  const last = selectedTablePos + 1 + map.map[map.map.length - 1]!
  editor.view.dispatch(
    editor.state.tr.setSelection(
      new CellSelection(editor.state.doc.resolve(first), editor.state.doc.resolve(last)),
    ),
  )

  return { editor, table: selectedTable, tablePos: selectedTablePos, cells, overlayContainer }
}

function mountOverlay(editor: Editor, showResizeHandles = true) {
  const Provider = defineComponent({
    setup() {
      provideTiptapEditor(shallowRef(editor))
      return () => h(TableSelectionOverlay, { showResizeHandles })
    },
  })
  const wrapper = mount(Provider, {
    attachTo: document.body,
    global: { stubs: { Teleport: false } },
  })
  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('table selection overlay', () => {
  it('renders a union selection rectangle and resizes it from a corner drag', async () => {
    const fixture = createTableFixture()
    mountOverlay(fixture.editor)
    await nextTick()
    await nextTick()

    const overlay = document.querySelector('.tiptap-table-selection-overlay')
    expect(overlay).not.toBeNull()
    const resizeHandles = document.querySelectorAll('[style*="cursor"]')
    expect(resizeHandles).toHaveLength(4)

    resizeHandles[0]?.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 0, clientY: 0 }),
    )
    fixture.cells[1]![1]!.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 180, clientY: 60 }),
    )
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    expect(fixture.editor.state.selection).toBeInstanceOf(CellSelection)
    expect(document.querySelector('.tiptap-table-selection-overlay')).not.toBeNull()
  })

  it('omits resize handles when the component disables them', async () => {
    const fixture = createTableFixture()
    mountOverlay(fixture.editor, false)
    await nextTick()
    await nextTick()

    expect(document.querySelector('.tiptap-table-selection-overlay')).not.toBeNull()
    expect(document.querySelectorAll('[style*="cursor"]')).toHaveLength(0)
  })
})
