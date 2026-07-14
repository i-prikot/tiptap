import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import { afterEach, describe, expect, it } from 'vitest'
import { TableKit } from '../../../src/editor/extensions/table-kit'

interface TableFixture {
  map: TableMap
  node: ProseMirrorNode
  pos: number
}

interface TableDimensions {
  height: number
  width: number
}

const editors: Editor[] = []
const hosts: HTMLElement[] = []

function createTableEditor(): Editor {
  const host = document.createElement('div')
  document.body.append(host)

  const editor = new Editor({
    element: host,
    extensions: [StarterKit, TableKit.configure({ table: { resizable: true, cellMinWidth: 120 } })],
  })

  editors.push(editor)
  hosts.push(host)

  return editor
}

function insertThreeByThreeTable(editor: Editor): void {
  expect(
    editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: false }),
    'Inserting a 3×3 table without a header row should succeed.',
  ).toBe(true)
}

function getSingleTable(editor: Editor): TableFixture {
  const tables: Array<{ node: ProseMirrorNode; pos: number }> = []

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'table') tables.push({ node, pos })
  })

  expect(tables, 'The editor document should contain exactly one table.').toHaveLength(1)

  const table = tables[0]
  if (!table) throw new Error('Expected exactly one table in the editor document.')

  return { ...table, map: TableMap.get(table.node) }
}

function getTableDimensions(editor: Editor): TableDimensions {
  const { map } = getSingleTable(editor)
  return { height: map.height, width: map.width }
}

function getCellPosition(fixture: TableFixture, row: number, column: number): number {
  if (row < 0 || row >= fixture.map.height || column < 0 || column >= fixture.map.width) {
    throw new Error(
      `Expected cell coordinates within ${fixture.map.height}×${fixture.map.width}, received row ${row}, column ${column}.`,
    )
  }

  const offset = fixture.map.map[row * fixture.map.width + column]
  if (offset === undefined) {
    throw new Error(`Expected a table cell at row ${row}, column ${column}.`)
  }

  return fixture.pos + 1 + offset
}

function selectCells(editor: Editor, anchor: [row: number, column: number], head = anchor): void {
  const fixture = getSingleTable(editor)
  const anchorPos = getCellPosition(fixture, ...anchor)
  const headPos = getCellPosition(fixture, ...head)
  const selection = new CellSelection(
    editor.state.doc.resolve(anchorPos),
    editor.state.doc.resolve(headPos),
  )

  editor.view.dispatch(editor.state.tr.setSelection(selection))
}

function countPhysicalCells(table: ProseMirrorNode): number {
  let count = 0

  table.descendants((node) => {
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') count += 1
  })

  return count
}

afterEach(() => {
  while (editors.length) {
    const editor = editors.pop()
    if (editor && !editor.isDestroyed) editor.destroy()
  }

  while (hosts.length) hosts.pop()?.remove()
  document.body.replaceChildren()
})

describe('TableKit command integration', () => {
  it('inserts a 3×3 table without header cells', () => {
    const editor = createTableEditor()

    insertThreeByThreeTable(editor)

    const table = getSingleTable(editor)
    expect(
      { height: table.map.height, width: table.map.width },
      'The inserted table should report 3 rows and 3 columns through TableMap.',
    ).toEqual({ height: 3, width: 3 })
    expect(
      countPhysicalCells(table.node),
      'The inserted 3×3 grid should contain nine physical table cells.',
    ).toBe(9)
    expect(
      table.node.firstChild?.firstChild?.type.name,
      'A table inserted without a header row should start with a regular table cell.',
    ).toBe('tableCell')
  })

  it('adds and removes a row while preserving the original 3×3 grid', () => {
    const editor = createTableEditor()
    insertThreeByThreeTable(editor)
    selectCells(editor, [1, 1])

    expect(
      editor.commands.addRowAfter(),
      'Adding a row after the selected row 2, column 2 cell should succeed.',
    ).toBe(true)
    expect(
      getTableDimensions(editor),
      'Adding a row to the 3×3 table should produce a 4×3 table.',
    ).toEqual({ height: 4, width: 3 })

    selectCells(editor, [2, 0])
    expect(
      editor.commands.deleteRow(),
      'Deleting the selected third row from the expanded 4×3 table should succeed.',
    ).toBe(true)
    expect(
      getTableDimensions(editor),
      'Deleting one row from the expanded table should restore 3×3 dimensions.',
    ).toEqual({ height: 3, width: 3 })

    const table = getSingleTable(editor)
    expect(
      table.node.type.name,
      'Deleting a row should leave a valid table node in the document.',
    ).toBe('table')
    expect(
      countPhysicalCells(table.node),
      'The restored 3×3 table should retain nine physical cells.',
    ).toBe(9)
  })

  it('merges adjacent cells and splits the merged cell back into a 3×3 grid', () => {
    const editor = createTableEditor()
    insertThreeByThreeTable(editor)
    selectCells(editor, [0, 0], [0, 1])

    expect(
      editor.commands.mergeCells(),
      'Merging the adjacent cells at row 1, columns 1–2 should succeed.',
    ).toBe(true)

    const mergedTable = getSingleTable(editor)
    const mergedCell = mergedTable.node.nodeAt(mergedTable.map.map[0] ?? -1)
    expect(
      mergedCell?.attrs,
      'The merged top-left cell should span exactly the two selected columns.',
    ).toMatchObject({ colspan: 2, rowspan: 1 })
    expect(
      countPhysicalCells(mergedTable.node),
      'Merging two cells should reduce the physical cell count from nine to eight.',
    ).toBe(8)
    expect(
      editor.state.selection,
      'The merged cell should remain selected so splitCell operates on it.',
    ).toBeInstanceOf(CellSelection)

    expect(editor.commands.splitCell(), 'Splitting the selected merged cell should succeed.').toBe(
      true,
    )

    const splitTable = getSingleTable(editor)
    expect(
      { height: splitTable.map.height, width: splitTable.map.width },
      'Splitting the merged cell should restore the 3×3 table grid.',
    ).toEqual({ height: 3, width: 3 })
    expect(
      countPhysicalCells(splitTable.node),
      'Splitting the merged cell should restore nine physical cells.',
    ).toBe(9)

    splitTable.node.descendants((node) => {
      if (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader') return
      expect(
        { colspan: node.attrs.colspan, rowspan: node.attrs.rowspan },
        'Every cell should have unmerged spans after splitCell.',
      ).toEqual({ colspan: 1, rowspan: 1 })
    })
  })

  it('rejects deletion of the sole remaining row without changing the table', () => {
    const editor = createTableEditor()
    insertThreeByThreeTable(editor)

    for (const expectedHeight of [2, 1]) {
      selectCells(editor, [0, 0])
      expect(
        editor.commands.deleteRow(),
        `Deleting a row should reduce the table to ${expectedHeight}×3 before last-row protection is checked.`,
      ).toBe(true)
      expect(
        getTableDimensions(editor),
        `The table should measure ${expectedHeight}×3 after deleting one row.`,
      ).toEqual({ height: expectedHeight, width: 3 })
    }

    selectCells(editor, [0, 0])
    const beforeDocument = editor.getJSON()
    const beforeDimensions = getTableDimensions(editor)

    expect(
      editor.commands.deleteRow(),
      'Deleting the only remaining row should be rejected instead of removing the table.',
    ).toBe(false)
    expect(
      getTableDimensions(editor),
      'A rejected last-row deletion should leave the table dimensions at 1×3.',
    ).toEqual(beforeDimensions)
    expect(
      editor.getJSON(),
      'A rejected last-row deletion should not mutate or remove the table document.',
    ).toEqual(beforeDocument)
    expect(
      getSingleTable(editor).node.type.name,
      'A rejected last-row deletion should leave the table node intact.',
    ).toBe('table')
  })
})
