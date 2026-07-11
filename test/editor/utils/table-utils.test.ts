import type { Editor } from '@tiptap/core'
import { Schema, type Node as ProseMirrorNode, type NodeSpec } from '@tiptap/pm/model'
import { EditorState, TextSelection, Transaction } from '@tiptap/pm/state'
import { CellSelection, TableMap, tableNodes, type Rect } from '@tiptap/pm/tables'
import { describe, expect, it, vi } from 'vitest'
import {
  cellsOverlapRectangle,
  countEmptyColumnsFromEnd,
  countEmptyRowsFromEnd,
  getTable,
  selectCellsByCoords,
} from '../../../src/editor/utils/table-utils'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { content: 'inline*', group: 'block' },
    ...tableNodes({ cellAttributes: {}, cellContent: 'paragraph+' }),
  } as Record<string, NodeSpec>,
  marks: {},
})

type CellAttrs = { colspan?: number; rowspan?: number }
type EditorMock = Pick<Editor, 'state'>

interface TableFixture {
  editor: Editor
  map: TableMap
  state: EditorState
  table: ProseMirrorNode
  tablePos: number
}

function createCell(text = '', attrs: CellAttrs = {}) {
  const content = text ? schema.text(text) : undefined
  return schema.nodes.table_cell.create(attrs, schema.nodes.paragraph.create(null, content))
}

function createTable(rows: ProseMirrorNode[][]) {
  return schema.nodes.table.create(
    null,
    rows.map((cells) => schema.nodes.table_row.create(null, cells)),
  )
}

function cellPosAt(table: ProseMirrorNode, tablePos: number, row: number, col: number) {
  const map = TableMap.get(table)
  return tablePos + 1 + map.map[row * map.width + col]!
}

function createTableFixture(table: ProseMirrorNode, selection = { row: 0, col: 0 }): TableFixture {
  const tablePos = 0
  const doc = schema.nodes.doc.create(null, table)
  const selectionPos = cellPosAt(table, tablePos, selection.row, selection.col) + 2
  const state = EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, selectionPos),
  })
  const editorMock: EditorMock = { state }

  return {
    editor: editorMock as Editor,
    map: TableMap.get(table),
    state,
    table,
    tablePos,
  }
}

function createPlainEditor() {
  const doc = schema.nodes.doc.create(
    null,
    schema.nodes.paragraph.create(null, schema.text('outside')),
  )
  const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1) })
  const editorMock: EditorMock = { state }

  return editorMock as Editor
}

function expectCellSelection(result: EditorState | Transaction | undefined) {
  expect(result).toBeDefined()
  expect(result?.selection).toBeInstanceOf(CellSelection)
  return result?.selection as CellSelection
}

describe('table utilities', () => {
  describe('getTable', () => {
    it('returns null when the editor is absent or selection is outside a table', () => {
      const editor = createPlainEditor()

      expect(getTable(null)).toBeNull()
      expect(getTable(undefined)).toBeNull()
      expect(getTable(editor)).toBeNull()
    })

    it('returns the real table map and resolved metadata for an explicit table position', () => {
      const table = createTable([
        [createCell(), createCell('filled')],
        [createCell('  '), createCell()],
      ])
      const fixture = createTableFixture(table)

      const result = getTable(fixture.editor, fixture.tablePos)

      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        node: fixture.table,
        pos: fixture.tablePos,
        start: fixture.tablePos + 1,
        depth: fixture.state.doc.resolve(fixture.tablePos).depth,
        map: fixture.map,
      })
      expect(result?.map).toBeInstanceOf(TableMap)
    })

    it('falls back to the table around the current selection for an invalid explicit position', () => {
      const fixture = createTableFixture(createTable([[createCell('selected')]]))

      expect(getTable(fixture.editor, fixture.tablePos + 1)).toMatchObject({
        node: fixture.table,
        pos: fixture.tablePos,
        start: fixture.tablePos + 1,
        map: fixture.map,
      })
    })
  })

  describe('cellsOverlapRectangle', () => {
    it('returns false for ordinary, edge-aligned, and fully-contained rectangles', () => {
      const ordinary = createTableFixture(
        createTable([
          [createCell(), createCell()],
          [createCell(), createCell()],
        ]),
      )
      const horizontal = createTableFixture(
        createTable([
          [createCell('merged', { colspan: 2 }), createCell()],
          [createCell(), createCell(), createCell()],
        ]),
      )

      expect(cellsOverlapRectangle(ordinary.map, { left: 0, top: 0, right: 2, bottom: 2 })).toBe(
        false,
      )
      expect(cellsOverlapRectangle(ordinary.map, { left: 0, top: 1, right: 1, bottom: 2 })).toBe(
        false,
      )
      expect(cellsOverlapRectangle(horizontal.map, { left: 0, top: 0, right: 2, bottom: 1 })).toBe(
        false,
      )
    })

    it('detects left and right boundaries that cut through a horizontal merge', () => {
      const fixture = createTableFixture(
        createTable([
          [createCell('merged', { colspan: 2 }), createCell()],
          [createCell(), createCell(), createCell()],
        ]),
      )

      const rightBoundary: Rect = { left: 0, top: 0, right: 1, bottom: 1 }
      const leftBoundary: Rect = { left: 1, top: 0, right: 2, bottom: 1 }

      expect(cellsOverlapRectangle(fixture.map, rightBoundary)).toBe(true)
      expect(cellsOverlapRectangle(fixture.map, leftBoundary)).toBe(true)
    })

    it('detects top and bottom boundaries that cut through a vertical merge', () => {
      const fixture = createTableFixture(
        createTable([[createCell('merged', { rowspan: 2 }), createCell()], [createCell()]]),
      )

      const bottomBoundary: Rect = { left: 0, top: 0, right: 1, bottom: 1 }
      const topBoundary: Rect = { left: 0, top: 1, right: 1, bottom: 2 }

      expect(cellsOverlapRectangle(fixture.map, bottomBoundary)).toBe(true)
      expect(cellsOverlapRectangle(fixture.map, topBoundary)).toBe(true)
    })
  })

  describe('trailing empty rows and columns', () => {
    it('returns zero without a table at the supplied position', () => {
      const editor = createPlainEditor()

      expect(countEmptyRowsFromEnd(null, 0)).toBe(0)
      expect(countEmptyColumnsFromEnd(null, 0)).toBe(0)
      expect(countEmptyRowsFromEnd(editor, 0)).toBe(0)
      expect(countEmptyColumnsFromEnd(editor, 0)).toBe(0)
    })

    it('counts completely empty rows and columns from the table end', () => {
      const fixture = createTableFixture(
        createTable([
          [createCell(), createCell()],
          [createCell(), createCell()],
        ]),
      )

      expect(countEmptyRowsFromEnd(fixture.editor, fixture.tablePos)).toBe(2)
      expect(countEmptyColumnsFromEnd(fixture.editor, fixture.tablePos)).toBe(2)
    })

    it('counts whitespace-only trailing lines until the first non-empty row or column', () => {
      const fixture = createTableFixture(
        createTable([
          [createCell('filled'), createCell('  '), createCell()],
          [createCell(), createCell('\n\t'), createCell()],
          [createCell(), createCell(), createCell()],
        ]),
      )

      expect(countEmptyRowsFromEnd(fixture.editor, fixture.tablePos)).toBe(2)
      expect(countEmptyColumnsFromEnd(fixture.editor, fixture.tablePos)).toBe(2)
    })

    it('does not double-count horizontally or vertically merged empty cells', () => {
      const horizontal = createTableFixture(
        createTable([[createCell('', { colspan: 2 })], [createCell(), createCell()]]),
      )
      const vertical = createTableFixture(
        createTable([[createCell('', { rowspan: 2 }), createCell()], [createCell()]]),
      )

      expect(countEmptyRowsFromEnd(horizontal.editor, horizontal.tablePos)).toBe(2)
      expect(countEmptyColumnsFromEnd(vertical.editor, vertical.tablePos)).toBe(2)
    })
  })

  describe('selectCellsByCoords', () => {
    it('returns undefined without an editor, a table, or coordinates and does not dispatch', () => {
      const dispatch = vi.fn()
      const table = createTableFixture(createTable([[createCell()]]))

      expect(
        selectCellsByCoords(null, 0, [{ row: 0, col: 0 }], { mode: 'dispatch', dispatch }),
      ).toBe(undefined)
      expect(selectCellsByCoords(createPlainEditor(), 0, [{ row: 0, col: 0 }])).toBe(undefined)
      expect(selectCellsByCoords(table.editor, table.tablePos, [])).toBe(undefined)
      expect(dispatch).not.toHaveBeenCalled()
    })

    it('returns a new state with the rectangular range bounded by supplied coordinates', () => {
      const fixture = createTableFixture(
        createTable([
          [createCell('top left'), createCell('top right')],
          [createCell('bottom left'), createCell('bottom right')],
        ]),
      )

      const result = selectCellsByCoords(fixture.editor, fixture.tablePos, [
        { row: 1, col: 1 },
        { row: 0, col: 0 },
      ])
      const selection = expectCellSelection(result)

      expect(result).toBeInstanceOf(EditorState)
      expect(fixture.state.selection).not.toBeInstanceOf(CellSelection)
      expect(selection.$anchorCell.pos).toBe(cellPosAt(fixture.table, fixture.tablePos, 0, 0))
      expect(selection.$headCell.pos).toBe(cellPosAt(fixture.table, fixture.tablePos, 1, 1))
    })

    it('clamps coordinate bounds and selects a distinct cell beside a merged position', () => {
      const fixture = createTableFixture(
        createTable([
          [createCell('merged', { colspan: 2 }), createCell('right')],
          [createCell('bottom left'), createCell('bottom middle'), createCell('bottom right')],
        ]),
      )

      const result = selectCellsByCoords(fixture.editor, fixture.tablePos, [
        { row: -3, col: -4 },
        { row: 99, col: 99 },
      ])
      const selection = expectCellSelection(result)

      expect(selection.$anchorCell.pos).toBe(cellPosAt(fixture.table, fixture.tablePos, 0, 0))
      expect(selection.$headCell.pos).toBe(cellPosAt(fixture.table, fixture.tablePos, 1, 2))
    })

    it('handles equal anchor and head positions for a rectangle fully covered by a merged cell', () => {
      const fixture = createTableFixture(
        createTable([[createCell('merged', { colspan: 2 }), createCell('right')]]),
      )

      const anchorPos = cellPosAt(fixture.table, fixture.tablePos, 0, 0)
      const headPos = cellPosAt(fixture.table, fixture.tablePos, 0, 1)
      const result = selectCellsByCoords(fixture.editor, fixture.tablePos, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ])
      const selection = expectCellSelection(result)

      expect(anchorPos).toBe(headPos)
      expect(selection.$anchorCell.pos).toBe(anchorPos)
      expect(selection.$headCell.pos).toBe(headPos)
    })

    it('returns an unapplied transaction in transaction mode', () => {
      const fixture = createTableFixture(createTable([[createCell(), createCell()]]))

      const result = selectCellsByCoords(
        fixture.editor,
        fixture.tablePos,
        [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
        { mode: 'transaction' },
      )
      const selection = expectCellSelection(result)

      expect(result).toBeInstanceOf(Transaction)
      expect(fixture.state.selection).not.toBeInstanceOf(CellSelection)
      expect(selection.$anchorCell.pos).toBe(cellPosAt(fixture.table, fixture.tablePos, 0, 0))
      expect(selection.$headCell.pos).toBe(cellPosAt(fixture.table, fixture.tablePos, 0, 1))
    })

    it('dispatches the selection transaction exactly once in dispatch mode', () => {
      const fixture = createTableFixture(createTable([[createCell(), createCell()]]))
      const dispatch = vi.fn()

      const result = selectCellsByCoords(
        fixture.editor,
        fixture.tablePos,
        [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
        { mode: 'dispatch', dispatch },
      )

      expect(result).toBeUndefined()
      expect(dispatch).toHaveBeenCalledOnce()
      expect(dispatch.mock.calls[0]?.[0]).toBeInstanceOf(Transaction)
      expect(dispatch.mock.calls[0]?.[0].selection).toBeInstanceOf(CellSelection)
      expect(fixture.state.selection).not.toBeInstanceOf(CellSelection)
    })
  })
})
