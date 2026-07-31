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
  canDuplicateRowColumn,
  duplicateRowColumn,
} from '../../../../src/editor/utils/table-actions'

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

  expect(canDuplicateRowColumn({ editor: null, index: 0, orientation: 'row', tablePos: 0 })).toBe(
    false,
  )
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
