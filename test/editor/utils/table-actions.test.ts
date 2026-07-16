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
import { describe, expect, it, vi } from 'vitest'
import {
  addRowColumn,
  canAddRowColumn,
  canClearAllTableContent,
  canClearRowColumnContent,
  canDeleteRowColumn,
  canDuplicateRowColumn,
  canMergeCells,
  canMoveRowColumn,
  canSortRowColumn,
  canSplitCell,
  canToggleHeaderRowColumn,
  clearAllTableContent,
  clearRowColumnContent,
  deleteRowColumn,
  duplicateRowColumn,
  isHeaderRowColumnActive,
  isMoveDirectionValid,
  mergeSplitCells,
  moveRowColumn,
  sortRowColumn,
  toggleHeaderRowColumn,
} from '../../../src/editor/utils/table-actions'

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

type CellAttrs = {
  backgroundColor?: string | null
  colspan?: number
  rowspan?: number
}

type ChainStub = {
  focus: ReturnType<typeof vi.fn>
  addRowAfter: ReturnType<typeof vi.fn>
  addColumnAfter: ReturnType<typeof vi.fn>
}

type CommandStub = {
  toggleHeaderRow: ReturnType<typeof vi.fn>
  toggleHeaderColumn: ReturnType<typeof vi.fn>
}

interface EditorHarness {
  editor: Editor
  dispatch: ReturnType<typeof vi.fn>
  chain: ChainStub
  commands: CommandStub
  isActive: ReturnType<typeof vi.fn>
}

interface TableFixture extends EditorHarness {
  tablePos: number
}

interface FixtureOptions {
  activeHeader?: boolean
  extensions?: string[]
  isEditable?: boolean
}

function createCell(text = '', attrs: CellAttrs = {}, isHeader = false): ProseMirrorNode {
  const content = text ? schema.text(text) : undefined
  const cellType = isHeader ? schema.nodes.tableHeader : schema.nodes.tableCell

  return cellType.create(attrs, schema.nodes.paragraph.create(null, content))
}

function createTable(rows: ProseMirrorNode[][]): ProseMirrorNode {
  return schema.nodes.table.create(
    null,
    rows.map((cells) => schema.nodes.tableRow.create(null, cells)),
  )
}

function cellPosAt(table: ProseMirrorNode, tablePos: number, row: number, column: number): number {
  const map = TableMap.get(table)
  return tablePos + 1 + map.map[row * map.width + column]!
}

function tableNode(editor: Editor): ProseMirrorNode {
  const table = editor.state.doc.firstChild
  if (!table || table.type.name !== 'table') throw new Error('Expected a table document')
  return table
}

function tableDimensions(editor: Editor): [height: number, width: number] {
  const map = TableMap.get(tableNode(editor))
  return [map.height, map.width]
}

function cellAt(editor: Editor, row: number, column: number): ProseMirrorNode {
  const table = tableNode(editor)
  const map = TableMap.get(table)
  return table.nodeAt(map.map[row * map.width + column]!)!
}

function tableTextGrid(editor: Editor): string[][] {
  const table = tableNode(editor)
  const map = TableMap.get(table)

  return Array.from({ length: map.height }, (_, row) =>
    Array.from(
      { length: map.width },
      (_, column) => table.nodeAt(map.map[row * map.width + column]!)?.textContent ?? '',
    ),
  )
}

function createEditorHarness(state: EditorState, options: FixtureOptions = {}): EditorHarness {
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

function createTableFixture(
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

function createPlainEditor(options: FixtureOptions = {}): EditorHarness {
  const doc = schema.nodes.doc.create(
    null,
    schema.nodes.paragraph.create(null, schema.text('outside table')),
  )
  const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1) })

  return createEditorHarness(state, options)
}

function selectTextCell(fixture: TableFixture, row: number, column: number): void {
  const table = tableNode(fixture.editor)
  const selectionPos = cellPosAt(table, fixture.tablePos, row, column) + 2
  fixture.editor.view.dispatch(
    fixture.editor.state.tr.setSelection(
      TextSelection.create(fixture.editor.state.doc, selectionPos),
    ),
  )
}

function selectCells(
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

describe('table actions', () => {
  describe('duplicateRowColumn', () => {
    it('refuses unavailable, invalid, and merged source lines', () => {
      const missingHandle = createTableFixture(createTable([[createCell('a')]]), undefined, {
        extensions: ['table'],
      })
      const readOnly = createTableFixture(createTable([[createCell('a')]]), undefined, {
        isEditable: false,
      })
      const invalidIndex = createTableFixture(createTable([[createCell('a')]]))
      const merged = createTableFixture(
        createTable([[createCell('merged', { colspan: 2 }), createCell('tail')]]),
      )
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      expect(
        canDuplicateRowColumn({ editor: null, index: 0, orientation: 'row', tablePos: 0 }),
      ).toBe(false)
      expect(
        canDuplicateRowColumn({
          editor: missingHandle.editor,
          index: 0,
          orientation: 'row',
          tablePos: missingHandle.tablePos,
        }),
      ).toBe(false)
      expect(
        canDuplicateRowColumn({
          editor: readOnly.editor,
          index: 0,
          orientation: 'row',
          tablePos: readOnly.tablePos,
        }),
      ).toBe(false)
      expect(
        canDuplicateRowColumn({
          editor: invalidIndex.editor,
          index: 1,
          orientation: 'row',
          tablePos: invalidIndex.tablePos,
        }),
      ).toBe(false)
      expect(
        canDuplicateRowColumn({
          editor: merged.editor,
          index: 0,
          orientation: 'row',
          tablePos: merged.tablePos,
        }),
      ).toBe(false)
      expect(warn).toHaveBeenCalledOnce()
    })

    it('duplicates explicit row and column sources with content and cell attributes intact', () => {
      const rowFixture = createTableFixture(
        createTable([
          [createCell('row-a', { backgroundColor: 'yellow' }), createCell('row-b')],
          [createCell('tail-a'), createCell('tail-b')],
        ]),
      )
      const columnFixture = createTableFixture(
        createTable([
          [createCell('left-1'), createCell('right-1', { backgroundColor: 'blue' })],
          [createCell('left-2'), createCell('right-2')],
        ]),
      )

      expect(
        duplicateRowColumn({
          editor: rowFixture.editor,
          index: 0,
          orientation: 'row',
          tablePos: rowFixture.tablePos,
        }),
      ).toBe(true)
      expect(tableDimensions(rowFixture.editor)).toEqual([3, 2])
      expect(tableTextGrid(rowFixture.editor)).toEqual([
        ['row-a', 'row-b'],
        ['row-a', 'row-b'],
        ['tail-a', 'tail-b'],
      ])
      expect(cellAt(rowFixture.editor, 1, 0).attrs.backgroundColor).toBe('yellow')

      expect(
        duplicateRowColumn({
          editor: columnFixture.editor,
          index: 1,
          orientation: 'column',
          tablePos: columnFixture.tablePos,
        }),
      ).toBe(true)
      expect(tableDimensions(columnFixture.editor)).toEqual([2, 3])
      expect(tableTextGrid(columnFixture.editor)).toEqual([
        ['left-1', 'right-1', 'right-1'],
        ['left-2', 'right-2', 'right-2'],
      ])
      expect(cellAt(columnFixture.editor, 0, 2).attrs.backgroundColor).toBe('blue')
    })

    it('uses the row and column chain commands for CellSelection sources', () => {
      const rowFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )
      const columnFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )

      selectCells(rowFixture, { row: 0, column: 0 }, { row: 0, column: 1 })
      expect(duplicateRowColumn({ editor: rowFixture.editor })).toBe(true)
      expect(rowFixture.chain.addRowAfter).toHaveBeenCalledOnce()
      expect(tableTextGrid(rowFixture.editor)).toEqual([
        ['a', 'b'],
        ['a', 'b'],
        ['c', 'd'],
      ])

      selectCells(columnFixture, { row: 0, column: 0 }, { row: 1, column: 0 })
      expect(duplicateRowColumn({ editor: columnFixture.editor })).toBe(true)
      expect(columnFixture.chain.addColumnAfter).toHaveBeenCalledOnce()
      expect(tableTextGrid(columnFixture.editor)).toEqual([
        ['a', 'a', 'b'],
        ['c', 'c', 'd'],
      ])
    })
  })

  describe('moveRowColumn', () => {
    it('accepts only directions that match the requested orientation', () => {
      expect(isMoveDirectionValid('row', 'up')).toBe(true)
      expect(isMoveDirectionValid('row', 'down')).toBe(true)
      expect(isMoveDirectionValid('row', 'left')).toBe(false)
      expect(isMoveDirectionValid('column', 'left')).toBe(true)
      expect(isMoveDirectionValid('column', 'right')).toBe(true)
      expect(isMoveDirectionValid('column', 'up')).toBe(false)
    })

    it('refuses boundaries and header lines while allowing valid merged-table moves', () => {
      const boundary = createTableFixture(
        createTable([[createCell('first')], [createCell('last')]]),
      )
      const header = createTableFixture(
        createTable([[createCell('header', {}, true)], [createCell('data')]]),
      )
      const merged = createTableFixture(
        createTable([
          [createCell('vertical merge', { rowspan: 2 }), createCell('a')],
          [createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )

      expect(
        canMoveRowColumn({
          editor: boundary.editor,
          index: 0,
          orientation: 'row',
          direction: 'up',
          tablePos: boundary.tablePos,
        }),
      ).toBe(false)
      expect(
        canMoveRowColumn({
          editor: boundary.editor,
          index: 1,
          orientation: 'row',
          direction: 'down',
          tablePos: boundary.tablePos,
        }),
      ).toBe(false)
      expect(
        canMoveRowColumn({
          editor: boundary.editor,
          index: 0,
          orientation: 'row',
          direction: 'left',
          tablePos: boundary.tablePos,
        }),
      ).toBe(false)
      expect(
        canMoveRowColumn({
          editor: header.editor,
          index: 0,
          orientation: 'row',
          direction: 'down',
          tablePos: header.tablePos,
        }),
      ).toBe(false)
      expect(
        canMoveRowColumn({
          editor: merged.editor,
          index: 0,
          orientation: 'row',
          direction: 'down',
          tablePos: merged.tablePos,
        }),
      ).toBe(true)
    })

    it('returns false without mutating table content when the underlying move command rejects', () => {
      const rowFixture = createTableFixture(
        createTable([[createCell('first')], [createCell('middle')], [createCell('last')]]),
      )
      const columnFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b'), createCell('c')],
          [createCell('d'), createCell('e'), createCell('f')],
        ]),
      )

      const moveError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      expect(
        moveRowColumn({
          editor: rowFixture.editor,
          index: 1,
          orientation: 'row',
          direction: 'up',
          tablePos: rowFixture.tablePos,
        }),
      ).toBe(false)
      expect(tableTextGrid(rowFixture.editor)).toEqual([['first'], ['middle'], ['last']])

      selectCells(columnFixture, { row: 0, column: 1 }, { row: 1, column: 1 })
      expect(moveRowColumn({ editor: columnFixture.editor, direction: 'left' })).toBe(false)
      expect(tableTextGrid(columnFixture.editor)).toEqual([
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
      ])
      expect(moveError).toHaveBeenCalled()
    })
  })

  describe('sortRowColumn', () => {
    it('refuses unavailable, undersized, merged, and empty-only table lines', () => {
      const unavailable = createTableFixture(
        createTable([[createCell('a'), createCell('b')]]),
        undefined,
        {
          extensions: ['table'],
        },
      )
      const readOnly = createTableFixture(
        createTable([[createCell('a'), createCell('b')]]),
        undefined,
        {
          isEditable: false,
        },
      )
      const undersized = createTableFixture(createTable([[createCell('only')]]))
      const merged = createTableFixture(
        createTable([[createCell('merged', { colspan: 2 }), createCell('tail')]]),
      )
      const emptyOnly = createTableFixture(createTable([[createCell(), createCell()]]))
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      expect(
        canSortRowColumn({
          editor: unavailable.editor,
          index: 0,
          orientation: 'row',
          tablePos: unavailable.tablePos,
        }),
      ).toBe(false)
      expect(
        canSortRowColumn({
          editor: readOnly.editor,
          index: 0,
          orientation: 'row',
          tablePos: readOnly.tablePos,
        }),
      ).toBe(false)
      expect(
        canSortRowColumn({
          editor: undersized.editor,
          index: 0,
          orientation: 'row',
          tablePos: undersized.tablePos,
        }),
      ).toBe(false)
      expect(
        canSortRowColumn({
          editor: merged.editor,
          index: 0,
          orientation: 'row',
          tablePos: merged.tablePos,
        }),
      ).toBe(false)
      expect(
        canSortRowColumn({
          editor: emptyOnly.editor,
          index: 0,
          orientation: 'row',
          tablePos: emptyOnly.tablePos,
        }),
      ).toBe(false)
      expect(warn).toHaveBeenCalledOnce()
    })

    it('sorts rows stably, case-insensitively, and leaves headers and empty cells in place', () => {
      const fixture = createTableFixture(
        createTable([
          [
            createCell('name', {}, true),
            createCell('Beta'),
            createCell('alpha'),
            createCell('ALPHA'),
            createCell(),
          ],
          [
            createCell('unused'),
            createCell('1'),
            createCell('2'),
            createCell('3'),
            createCell('4'),
          ],
        ]),
      )

      expect(
        sortRowColumn({
          editor: fixture.editor,
          index: 0,
          orientation: 'row',
          direction: 'asc',
          tablePos: fixture.tablePos,
        }),
      ).toBe(true)
      expect(tableTextGrid(fixture.editor)[0]).toEqual(['name', 'alpha', 'ALPHA', 'Beta', ''])
      expect(cellAt(fixture.editor, 0, 0).type.name).toBe('tableHeader')
    })

    it('sorts columns in descending order without moving the header cell', () => {
      const fixture = createTableFixture(
        createTable([
          [createCell('priority', {}, true), createCell('other')],
          [createCell('Beta'), createCell('1')],
          [createCell('alpha'), createCell('2')],
          [createCell(), createCell('3')],
        ]),
      )

      expect(
        sortRowColumn({
          editor: fixture.editor,
          index: 0,
          orientation: 'column',
          direction: 'desc',
          tablePos: fixture.tablePos,
        }),
      ).toBe(true)
      expect(tableTextGrid(fixture.editor).map((row) => row[0])).toEqual([
        'priority',
        'Beta',
        'alpha',
        '',
      ])
      expect(cellAt(fixture.editor, 0, 0).type.name).toBe('tableHeader')
    })
  })

  describe('toggleHeaderRowColumn', () => {
    it('requires the table extension, editability, and the first line', () => {
      const readOnly = createTableFixture(
        createTable([[createCell('a'), createCell('b')]]),
        undefined,
        {
          isEditable: false,
        },
      )
      const missingTable = createTableFixture(
        createTable([[createCell('a'), createCell('b')]]),
        undefined,
        {
          extensions: ['tableHandleExtension'],
        },
      )
      const secondRow = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      expect(
        canToggleHeaderRowColumn({
          editor: readOnly.editor,
          index: 0,
          orientation: 'row',
          tablePos: readOnly.tablePos,
        }),
      ).toBe(false)
      expect(
        canToggleHeaderRowColumn({
          editor: missingTable.editor,
          index: 0,
          orientation: 'row',
          tablePos: missingTable.tablePos,
        }),
      ).toBe(false)
      expect(
        canToggleHeaderRowColumn({
          editor: secondRow.editor,
          index: 1,
          orientation: 'row',
          tablePos: secondRow.tablePos,
        }),
      ).toBe(false)
      expect(warn).toHaveBeenCalledOnce()
    })

    it('toggles explicit first rows and columns between table cells and headers', () => {
      const rowFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )
      const columnFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )

      expect(
        toggleHeaderRowColumn({
          editor: rowFixture.editor,
          index: 0,
          orientation: 'row',
          tablePos: rowFixture.tablePos,
        }),
      ).toBe(true)
      expect(cellAt(rowFixture.editor, 0, 0).type.name).toBe('tableHeader')
      expect(cellAt(rowFixture.editor, 0, 1).type.name).toBe('tableHeader')
      expect(
        toggleHeaderRowColumn({
          editor: rowFixture.editor,
          index: 0,
          orientation: 'row',
          tablePos: rowFixture.tablePos,
        }),
      ).toBe(true)
      expect(cellAt(rowFixture.editor, 0, 0).type.name).toBe('tableCell')

      expect(
        toggleHeaderRowColumn({
          editor: columnFixture.editor,
          index: 0,
          orientation: 'column',
          tablePos: columnFixture.tablePos,
        }),
      ).toBe(true)
      expect(cellAt(columnFixture.editor, 0, 0).type.name).toBe('tableHeader')
      expect(cellAt(columnFixture.editor, 1, 0).type.name).toBe('tableHeader')
    })

    it('uses CellSelection commands and reports active header state for both selection strategies', () => {
      const rowFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )
      const columnFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )
      const activeFixture = createTableFixture(
        createTable([[createCell('a'), createCell('b')]]),
        undefined,
        { activeHeader: true },
      )
      const inspectedFixture = createTableFixture(
        createTable([[createCell('a', {}, true), createCell('b', {}, true)]]),
      )

      selectCells(rowFixture, { row: 0, column: 0 }, { row: 0, column: 1 })
      expect(toggleHeaderRowColumn({ editor: rowFixture.editor })).toBe(true)
      expect(rowFixture.commands.toggleHeaderRow).toHaveBeenCalledOnce()

      selectCells(columnFixture, { row: 0, column: 0 }, { row: 1, column: 0 })
      expect(toggleHeaderRowColumn({ editor: columnFixture.editor })).toBe(true)
      expect(columnFixture.commands.toggleHeaderColumn).toHaveBeenCalledOnce()

      selectCells(activeFixture, { row: 0, column: 0 }, { row: 0, column: 1 })
      expect(isHeaderRowColumnActive({ editor: activeFixture.editor })).toBe(true)
      expect(activeFixture.isActive).toHaveBeenCalledWith('tableHeader')

      expect(
        isHeaderRowColumnActive({
          editor: inspectedFixture.editor,
          index: 0,
          orientation: 'row',
          tablePos: inspectedFixture.tablePos,
        }),
      ).toBe(true)
    })
  })

  describe('mergeSplitCells', () => {
    it('refuses unavailable, read-only, and ineligible selections without dispatching', () => {
      const unavailable = createTableFixture(
        createTable([[createCell('a'), createCell('b')]]),
        undefined,
        {
          extensions: ['tableHandleExtension'],
        },
      )
      const readOnly = createTableFixture(
        createTable([[createCell('a'), createCell('b')]]),
        undefined,
        {
          isEditable: false,
        },
      )
      const ineligible = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      expect(canMergeCells(null)).toBe(false)
      expect(canSplitCell(null)).toBe(false)
      expect(mergeSplitCells(null, 'merge')).toBe(false)
      expect(canMergeCells(unavailable.editor)).toBe(false)
      expect(canSplitCell(unavailable.editor)).toBe(false)
      expect(canSplitCell(readOnly.editor)).toBe(false)
      expect(canMergeCells(ineligible.editor)).toBe(false)
      expect(mergeSplitCells(ineligible.editor, 'merge')).toBe(false)
      expect(ineligible.dispatch).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledTimes(2)
    })

    it('merges a rectangular CellSelection and splits it back into the original grid', () => {
      const fixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )

      selectCells(fixture, { row: 0, column: 0 }, { row: 1, column: 1 })
      expect(canMergeCells(fixture.editor)).toBe(true)
      expect(mergeSplitCells(fixture.editor, 'merge')).toBe(true)
      expect(tableDimensions(fixture.editor)).toEqual([2, 2])
      expect(cellAt(fixture.editor, 0, 0).attrs).toMatchObject({ colspan: 2, rowspan: 2 })

      selectTextCell(fixture, 0, 0)
      expect(canSplitCell(fixture.editor)).toBe(true)
      expect(mergeSplitCells(fixture.editor, 'split')).toBe(true)
      expect(tableDimensions(fixture.editor)).toEqual([2, 2])
      expect(tableNode(fixture.editor).child(0).childCount).toBe(2)
      expect(tableNode(fixture.editor).child(1).childCount).toBe(2)
      expect(cellAt(fixture.editor, 0, 0).type.name).toBe('tableCell')
      expect(cellAt(fixture.editor, 1, 1).type.name).toBe('tableCell')
    })
  })

  describe('table availability', () => {
    it('refuses row actions when the selection is outside a table', () => {
      const plain = createPlainEditor()

      expect(canDuplicateRowColumn({ editor: plain.editor, index: 0, orientation: 'row' })).toBe(
        false,
      )
      expect(
        canMoveRowColumn({ editor: plain.editor, index: 0, orientation: 'row', direction: 'down' }),
      ).toBe(false)
      expect(canSortRowColumn({ editor: plain.editor, index: 0, orientation: 'row' })).toBe(false)
    })
  })

  describe('add, delete, and clear actions', () => {
    it('adds rows and columns from a cursor or a cell selection', () => {
      const rowFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )
      const columnFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
      )

      expect(
        canAddRowColumn({
          editor: rowFixture.editor,
          index: 0,
          orientation: 'row',
          side: 'below',
          tablePos: rowFixture.tablePos,
        }),
      ).toBe(true)
      expect(
        addRowColumn({
          editor: rowFixture.editor,
          index: 0,
          orientation: 'row',
          side: 'below',
          tablePos: rowFixture.tablePos,
        }),
      ).toBe(true)
      expect(tableDimensions(rowFixture.editor)).toEqual([3, 2])

      selectCells(columnFixture, { row: 0, column: 1 }, { row: 1, column: 1 })
      expect(addRowColumn({ editor: columnFixture.editor, side: 'left' })).toBe(true)
      expect(tableDimensions(columnFixture.editor)).toEqual([2, 3])
    })

    it('refuses insertions before header lines and unavailable tables', () => {
      const header = createTableFixture(
        createTable([[createCell('heading', {}, true)], [createCell('body')]]),
      )
      const unavailable = createTableFixture(createTable([[createCell('body')]]), undefined, {
        extensions: ['tableHandleExtension'],
      })

      expect(
        canAddRowColumn({
          editor: header.editor,
          index: 0,
          orientation: 'row',
          side: 'above',
          tablePos: header.tablePos,
        }),
      ).toBe(false)
      expect(
        addRowColumn({
          editor: unavailable.editor,
          index: 0,
          orientation: 'row',
          side: 'below',
          tablePos: unavailable.tablePos,
        }),
      ).toBe(false)
    })

    it('deletes a cursor-selected row and a CellSelection column', () => {
      const rowFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
          [createCell('e'), createCell('f')],
        ]),
        { row: 1, column: 0 },
      )
      const columnFixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b'), createCell('c')],
          [createCell('d'), createCell('e'), createCell('f')],
        ]),
      )

      expect(
        canDeleteRowColumn({
          editor: rowFixture.editor,
          index: 1,
          orientation: 'row',
          tablePos: rowFixture.tablePos,
        }),
      ).toBe(true)
      expect(
        deleteRowColumn({
          editor: rowFixture.editor,
          index: 1,
          orientation: 'row',
          tablePos: rowFixture.tablePos,
        }),
      ).toBe(true)
      expect(tableTextGrid(rowFixture.editor)).toEqual([
        ['a', 'b'],
        ['e', 'f'],
      ])

      selectCells(columnFixture, { row: 0, column: 1 }, { row: 1, column: 1 })
      expect(deleteRowColumn({ editor: columnFixture.editor })).toBe(true)
      expect(tableTextGrid(columnFixture.editor)).toEqual([
        ['a', 'c'],
        ['d', 'f'],
      ])
    })

    it('handles clear requests without mutating unavailable table content', () => {
      const fixture = createTableFixture(
        createTable([[createCell('clear', { backgroundColor: 'blue' }), createCell('also clear')]]),
      )
      const unavailable = createTableFixture(createTable([[createCell('keep')]]), undefined, {
        extensions: ['tableHandleExtension'],
      })
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      expect(
        canClearRowColumnContent({
          editor: fixture.editor,
          index: 0,
          orientation: 'row',
          tablePos: fixture.tablePos,
        }),
      ).toBe(true)
      expect(
        clearRowColumnContent({
          editor: fixture.editor,
          index: 0,
          orientation: 'row',
          tablePos: fixture.tablePos,
          resetAttrs: true,
        }),
      ).toBe(false)
      expect(error).toHaveBeenCalled()
      expect(tableTextGrid(fixture.editor)).toEqual([['clear', 'also clear']])

      expect(
        canClearAllTableContent({ editor: unavailable.editor, tablePos: unavailable.tablePos }),
      ).toBe(false)
      expect(
        clearAllTableContent({ editor: unavailable.editor, tablePos: unavailable.tablePos }),
      ).toBe(false)
    })

    it('inserts a row above an explicit source row through the compatibility facade', () => {
      const fixture = createTableFixture(
        createTable([
          [createCell('a'), createCell('b')],
          [createCell('c'), createCell('d')],
        ]),
        { row: 1, column: 0 },
      )

      expect(
        canAddRowColumn({
          editor: fixture.editor,
          index: 1,
          orientation: 'row',
          side: 'above',
          tablePos: fixture.tablePos,
        }),
      ).toBe(true)
      expect(
        addRowColumn({
          editor: fixture.editor,
          index: 1,
          orientation: 'row',
          side: 'above',
          tablePos: fixture.tablePos,
        }),
      ).toBe(true)
      expect(tableTextGrid(fixture.editor)).toEqual([
        ['a', 'b'],
        ['', ''],
        ['c', 'd'],
      ])
    })
  })
})
