import { expect, it, vi } from 'vitest'
import {
  createCell,
  createTable,
  createTableFixture,
  selectCells,
  tableTextGrid,
} from '../table-actions-fixtures'
import {
  canMoveRowColumn,
  isMoveDirectionValid,
  moveRowColumn,
} from '../../../../src/editor/utils/table-actions'

it('accepts only directions that match the requested orientation', () => {
  expect(isMoveDirectionValid('row', 'up')).toBe(true)
  expect(isMoveDirectionValid('row', 'down')).toBe(true)
  expect(isMoveDirectionValid('row', 'left')).toBe(false)
  expect(isMoveDirectionValid('column', 'left')).toBe(true)
  expect(isMoveDirectionValid('column', 'right')).toBe(true)
  expect(isMoveDirectionValid('column', 'up')).toBe(false)
})

it('refuses boundaries and header lines while allowing valid merged-table moves', () => {
  const boundary = createTableFixture(createTable([[createCell('first')], [createCell('last')]]))
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
