import type { Editor } from '@tiptap/core'
import { Schema, type Node as ProseMirrorNode, type NodeSpec } from '@tiptap/pm/model'
import { EditorState, TextSelection, type Transaction } from '@tiptap/pm/state'
import {
  CellSelection,
  TableMap,
  addColumnAfter,
  addRowAfter,
  tableNodes,
  toggleHeader,
} from '@tiptap/pm/tables'
import { vi } from 'vitest'

const tableNodeSpecs = tableNodes({
  cellContent: 'paragraph+',
  cellAttributes: {
    backgroundColor: { default: null },
  },
})

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { content: 'inline*', group: 'block' },
    table: { ...tableNodeSpecs.table, content: 'tableRow+' },
    tableRow: { ...tableNodeSpecs.table_row, content: '(tableCell | tableHeader)*' },
    tableCell: tableNodeSpecs.table_cell,
    tableHeader: tableNodeSpecs.table_header,
  } as Record<string, NodeSpec>,
  marks: {},
})

export type CellAttrs = {
  backgroundColor?: string | null
  colspan?: number
  rowspan?: number
}

export type ChainStub = {
  focus: ReturnType<typeof vi.fn>
  addRowAfter: ReturnType<typeof vi.fn>
  addColumnAfter: ReturnType<typeof vi.fn>
}

export type CommandStub = {
  toggleHeaderRow: ReturnType<typeof vi.fn>
  toggleHeaderColumn: ReturnType<typeof vi.fn>
}

export interface EditorHarness {
  editor: Editor
  dispatch: ReturnType<typeof vi.fn>
  chain: ChainStub
  commands: CommandStub
  isActive: ReturnType<typeof vi.fn>
}

export interface TableFixture extends EditorHarness {
  tablePos: number
}

export interface FixtureOptions {
  activeHeader?: boolean
  extensions?: string[]
  isEditable?: boolean
}

export function createCell(text = '', attrs: CellAttrs = {}, isHeader = false): ProseMirrorNode {
  const content = text ? schema.text(text) : undefined
  const cellType = isHeader ? schema.nodes.tableHeader : schema.nodes.tableCell

  return cellType.create(attrs, schema.nodes.paragraph.create(null, content))
}

export function createTable(rows: ProseMirrorNode[][]): ProseMirrorNode {
  return schema.nodes.table.create(
    null,
    rows.map((cells) => schema.nodes.tableRow.create(null, cells)),
  )
}

export function cellPosAt(
  table: ProseMirrorNode,
  tablePos: number,
  row: number,
  column: number,
): number {
  const map = TableMap.get(table)
  return tablePos + 1 + map.map[row * map.width + column]!
}

export function tableNode(editor: Editor): ProseMirrorNode {
  const table = editor.state.doc.firstChild
  if (!table || table.type.name !== 'table') throw new Error('Expected a table document')
  return table
}

export function tableDimensions(editor: Editor): [height: number, width: number] {
  const map = TableMap.get(tableNode(editor))
  return [map.height, map.width]
}

export function cellAt(editor: Editor, row: number, column: number): ProseMirrorNode {
  const table = tableNode(editor)
  const map = TableMap.get(table)
  return table.nodeAt(map.map[row * map.width + column]!)!
}

export function tableTextGrid(editor: Editor): string[][] {
  const table = tableNode(editor)
  const map = TableMap.get(table)

  return Array.from({ length: map.height }, (_, row) =>
    Array.from(
      { length: map.width },
      (_, column) => table.nodeAt(map.map[row * map.width + column]!)?.textContent ?? '',
    ),
  )
}

export function createEditorHarness(
  state: EditorState,
  options: FixtureOptions = {},
): EditorHarness {
  const {
    activeHeader = false,
    extensions = ['tableHandleExtension', 'table'],
    isEditable = true,
  } = options
  const editorMock: {
    commands: CommandStub
    extensionManager: { extensions: Array<{ name: string }> }
    isActive: ReturnType<typeof vi.fn>
    isEditable: boolean
    state: EditorState
    view: { dispatch: ReturnType<typeof vi.fn>; state: EditorState }
    chain: ReturnType<typeof vi.fn>
  } = {
    state,
    isEditable,
    extensionManager: { extensions: extensions.map((name) => ({ name })) },
    view: {} as { dispatch: ReturnType<typeof vi.fn>; state: EditorState },
    commands: {} as CommandStub,
    chain: vi.fn(),
    isActive: vi.fn((name: string) => name === 'tableHeader' && activeHeader),
  }

  const dispatch = vi.fn((transaction: Transaction) => {
    editorMock.state = editorMock.state.apply(transaction)
    editorMock.view.state = editorMock.state
  })
  const chain: ChainStub = {
    focus: vi.fn(),
    addRowAfter: vi.fn(),
    addColumnAfter: vi.fn(),
  }

  chain.focus.mockImplementation(() => chain)
  chain.addRowAfter.mockImplementation(() => ({
    run: vi.fn(() => addRowAfter(editorMock.state, dispatch)),
  }))
  chain.addColumnAfter.mockImplementation(() => ({
    run: vi.fn(() => addColumnAfter(editorMock.state, dispatch)),
  }))

  editorMock.view = { dispatch, state }
  editorMock.chain.mockImplementation(() => chain)
  editorMock.commands = {
    toggleHeaderRow: vi.fn(() => toggleHeader('row')(editorMock.state, dispatch)),
    toggleHeaderColumn: vi.fn(() => toggleHeader('column')(editorMock.state, dispatch)),
  }

  return {
    editor: editorMock as unknown as Editor,
    dispatch,
    chain,
    commands: editorMock.commands,
    isActive: editorMock.isActive,
  }
}

export function createTableFixture(
  table: ProseMirrorNode,
  selection = { row: 0, column: 0 },
  options: FixtureOptions = {},
): TableFixture {
  const tablePos = 0
  const doc = schema.nodes.doc.create(null, table)
  const selectionPos = cellPosAt(table, tablePos, selection.row, selection.column) + 2
  const state = EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, selectionPos),
  })

  return { ...createEditorHarness(state, options), tablePos }
}

export function createPlainEditor(options: FixtureOptions = {}): EditorHarness {
  const doc = schema.nodes.doc.create(
    null,
    schema.nodes.paragraph.create(null, schema.text('outside table')),
  )
  const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1) })

  return createEditorHarness(state, options)
}

export function selectTextCell(fixture: TableFixture, row: number, column: number): void {
  const table = tableNode(fixture.editor)
  const selectionPos = cellPosAt(table, fixture.tablePos, row, column) + 2
  fixture.editor.view.dispatch(
    fixture.editor.state.tr.setSelection(
      TextSelection.create(fixture.editor.state.doc, selectionPos),
    ),
  )
}

export function selectCells(
  fixture: TableFixture,
  from: { row: number; column: number },
  to = from,
): void {
  const table = tableNode(fixture.editor)
  fixture.editor.view.dispatch(
    fixture.editor.state.tr.setSelection(
      CellSelection.create(
        fixture.editor.state.doc,
        cellPosAt(table, fixture.tablePos, from.row, from.column),
        cellPosAt(table, fixture.tablePos, to.row, to.column),
      ),
    ),
  )
}
