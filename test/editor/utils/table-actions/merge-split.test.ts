import { expect, it, vi } from 'vitest'
import {
  cellAt,
  createCell,
  createPlainEditor,
  createTable,
  createTableFixture,
  selectCells,
  selectTextCell,
  tableDimensions,
  tableNode,
} from '../table-actions-fixtures'
import {
  canDuplicateRowColumn,
  canMergeCells,
  canMoveRowColumn,
  canSortRowColumn,
  canSplitCell,
  mergeSplitCells,
} from '../../../../src/editor/utils/table-actions'

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
it('refuses row actions when the selection is outside a table', () => {
  const plain = createPlainEditor()

  expect(canDuplicateRowColumn({ editor: plain.editor, index: 0, orientation: 'row' })).toBe(false)
  expect(
    canMoveRowColumn({ editor: plain.editor, index: 0, orientation: 'row', direction: 'down' }),
  ).toBe(false)
  expect(canSortRowColumn({ editor: plain.editor, index: 0, orientation: 'row' })).toBe(false)
})
