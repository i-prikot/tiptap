import { mount } from '@vue/test-utils'
import { Schema, type Node as ProseMirrorNode, type NodeSpec } from '@tiptap/pm/model'
import { tableNodes } from '@tiptap/pm/tables'
import { nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TableExtendRowColumnButtons from '../../../src/editor/components/table/TableExtendRowColumnButtons.vue'

const mocks = vi.hoisted(() => ({
  countEmptyColumnsFromEnd: vi.fn(() => 1),
  countEmptyRowsFromEnd: vi.fn(() => 1),
  editor: { value: null as null | Record<string, unknown> },
  marginRound: vi.fn(() => 1),
  runPreservingCursor: vi.fn((_editor: unknown, callback: () => void) => callback()),
  selectLastCell: vi.fn(),
  state: { value: null as null | Record<string, unknown> },
}))

vi.mock('../../../src/editor/composables/useTiptapEditor', () => ({
  useTiptapEditor: () => ref(mocks.editor.value),
}))

vi.mock('../../../src/editor/composables/useTableHandleState', () => ({
  useTableHandleState: () => ref(mocks.state.value),
}))

vi.mock('../../../src/editor/composables/useTableHandlePositioning', () => ({
  useTableExtendPosition: () => ({ floatingRef: ref(null), style: ref({}) }),
}))

vi.mock('../../../src/editor/utils/table-utils', () => ({
  EMPTY_CELL_HEIGHT: 24,
  EMPTY_CELL_WIDTH: 120,
  countEmptyColumnsFromEnd: mocks.countEmptyColumnsFromEnd,
  countEmptyRowsFromEnd: mocks.countEmptyRowsFromEnd,
  marginRound: mocks.marginRound,
  runPreservingCursor: mocks.runPreservingCursor,
  selectLastCell: mocks.selectLastCell,
}))

const tableNodeSpecs = tableNodes({ cellAttributes: {}, cellContent: 'paragraph+' })
const schema = new Schema({
  marks: {},
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    table: { ...tableNodeSpecs.table, content: 'tableRow+' },
    tableCell: tableNodeSpecs.table_cell,
    tableHeader: tableNodeSpecs.table_header,
    tableRow: { ...tableNodeSpecs.table_row, content: 'tableCell+' },
    text: { group: 'inline' },
  } as Record<string, NodeSpec>,
})

function createTable(): ProseMirrorNode {
  const cell = () => schema.nodes.tableCell.create(null, schema.nodes.paragraph.create())
  const row = () => schema.nodes.tableRow.create(null, [cell(), cell()])
  return schema.nodes.table.create(null, [row(), row()])
}

function createEditor() {
  return {
    commands: {
      addColumnAfter: vi.fn(),
      addRowAfter: vi.fn(),
      deleteColumn: vi.fn(),
      deleteRow: vi.fn(),
      freezeHandles: vi.fn(),
      unfreezeHandles: vi.fn(),
    },
    isEditable: true,
  }
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  if (!button) throw new Error(`Expected ${label} button`)
  return button
}

describe('TableExtendRowColumnButtons branch behavior', () => {
  let container: HTMLElement
  let editor: ReturnType<typeof createEditor>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    editor = createEditor()
    mocks.editor.value = editor
    mocks.state.value = {
      block: createTable(),
      blockPos: 1,
      referencePosTable: new DOMRect(0, 0, 200, 100),
      showAddOrRemoveColumnsButton: true,
      showAddOrRemoveRowsButton: true,
      widgetContainer: container,
    }
    mocks.marginRound.mockReset()
    mocks.marginRound.mockReturnValue(1)
    mocks.selectLastCell.mockReset()
    mocks.runPreservingCursor.mockClear()
    mocks.countEmptyColumnsFromEnd.mockClear()
    mocks.countEmptyRowsFromEnd.mockClear()
  })

  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('adds a final row or column from explicit button clicks', async () => {
    mount(TableExtendRowColumnButtons, { global: { stubs: { Teleport: false } } })

    await nextTick()

    getButton(container, 'Add or remove rows').click()
    getButton(container, 'Add or remove columns').click()

    expect(mocks.selectLastCell).toHaveBeenNthCalledWith(1, editor, expect.anything(), 1, 'row')
    expect(mocks.selectLastCell).toHaveBeenNthCalledWith(2, editor, expect.anything(), 1, 'column')
    expect(editor.commands.addRowAfter).toHaveBeenCalledTimes(1)
    expect(editor.commands.addColumnAfter).toHaveBeenCalledTimes(1)
  })

  it('adds and removes rows while dragging, then suppresses the trailing click', async () => {
    mount(TableExtendRowColumnButtons, { global: { stubs: { Teleport: false } } })
    await nextTick()
    await nextTick()
    const button = getButton(container, 'Add or remove rows')

    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 100 }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 140 }))
    window.dispatchEvent(new MouseEvent('mouseup'))
    expect(editor.commands.addRowAfter).toHaveBeenCalledTimes(1)

    mocks.marginRound.mockReturnValue(-1)
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientY: 100 }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 60 }))
    button.click()
    window.dispatchEvent(new MouseEvent('mouseup'))

    expect(mocks.countEmptyRowsFromEnd).toHaveBeenCalledWith(editor, 1)
    expect(editor.commands.deleteRow).toHaveBeenCalledTimes(1)
    expect(editor.commands.addRowAfter).toHaveBeenCalledTimes(1)
    expect(editor.commands.freezeHandles).toHaveBeenCalledTimes(2)
    expect(editor.commands.unfreezeHandles).toHaveBeenCalledTimes(2)
  })

  it('adds and removes columns while dragging and releases an active drag on unmount', async () => {
    const wrapper = mount(TableExtendRowColumnButtons, { global: { stubs: { Teleport: false } } })
    await nextTick()
    await nextTick()
    const button = getButton(container, 'Add or remove columns')

    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100 }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 240 }))
    window.dispatchEvent(new MouseEvent('mouseup'))
    expect(editor.commands.addColumnAfter).toHaveBeenCalledTimes(1)

    mocks.marginRound.mockReturnValue(-1)
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 100 }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 0 }))
    wrapper.unmount()

    expect(mocks.countEmptyColumnsFromEnd).toHaveBeenCalledWith(editor, 1)
    expect(editor.commands.deleteColumn).toHaveBeenCalledTimes(1)
    expect(editor.commands.unfreezeHandles).toHaveBeenCalledTimes(2)
  })
})
