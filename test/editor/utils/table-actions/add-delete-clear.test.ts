import { expect, it, vi } from 'vitest'
import {
  cellAt,
  createCell,
  createTable,
  createTableFixture,
  selectCells,
  tableDimensions,
  tableTextGrid,
} from '../table-actions-fixtures'
import {
  addRowColumn,
  canAddRowColumn,
  canClearAllTableContent,
  canClearRowColumnContent,
  canDeleteRowColumn,
  clearAllTableContent,
  clearRowColumnContent,
  deleteRowColumn,
} from '../../../../src/editor/utils/table-actions'

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

it('deletes only the resolved line when every target cell spans that axis', () => {
  const rowFixture = createTableFixture(
    createTable([
      [createCell('merged rows', { colspan: 3, rowspan: 2 })],
      [],
      [createCell('a'), createCell('b'), createCell('c')],
    ]),
  )
  const columnFixture = createTableFixture(
    createTable([
      [createCell('merged columns', { colspan: 2, rowspan: 3 }), createCell('a')],
      [createCell('b')],
      [createCell('c')],
    ]),
  )

  expect(
    deleteRowColumn({
      editor: rowFixture.editor,
      index: 1,
      orientation: 'row',
      tablePos: rowFixture.tablePos,
    }),
  ).toBe(true)
  expect(tableDimensions(rowFixture.editor)).toEqual([2, 3])
  expect(tableTextGrid(rowFixture.editor)).toEqual([
    ['merged rows', 'merged rows', 'merged rows'],
    ['a', 'b', 'c'],
  ])
  expect(cellAt(rowFixture.editor, 0, 0).attrs.rowspan).toBe(1)

  expect(
    deleteRowColumn({
      editor: columnFixture.editor,
      index: 1,
      orientation: 'column',
      tablePos: columnFixture.tablePos,
    }),
  ).toBe(true)
  expect(tableDimensions(columnFixture.editor)).toEqual([3, 2])
  expect(tableTextGrid(columnFixture.editor)).toEqual([
    ['merged columns', 'a'],
    ['merged columns', 'b'],
    ['merged columns', 'c'],
  ])
  expect(cellAt(columnFixture.editor, 0, 0).attrs.colspan).toBe(1)
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
  expect(clearAllTableContent({ editor: unavailable.editor, tablePos: unavailable.tablePos })).toBe(
    false,
  )
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
