import { expect, it, vi } from 'vitest'
import {
  cellAt,
  createCell,
  createTable,
  createTableFixture,
  tableTextGrid,
} from '../table-actions-fixtures'
import { canSortRowColumn, sortRowColumn } from '../../../../src/editor/utils/table-actions'

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
      [createCell('unused'), createCell('1'), createCell('2'), createCell('3'), createCell('4')],
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
