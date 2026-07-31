import { expect, it, vi } from 'vitest'
import {
  cellAt,
  createCell,
  createTable,
  createTableFixture,
  selectCells,
} from '../table-actions-fixtures'
import {
  canToggleHeaderRowColumn,
  isHeaderRowColumnActive,
  toggleHeaderRowColumn,
} from '../../../../src/editor/utils/table-actions'

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
