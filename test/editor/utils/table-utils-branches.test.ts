import type { Editor } from '@tiptap/core'
import { Schema, type Node as ProseMirrorNode, type NodeSpec } from '@tiptap/pm/model'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import { CellSelection, TableMap, tableNodes } from '@tiptap/pm/tables'
import { describe, expect, it, vi } from 'vitest'
import {
  clamp,
  domCellAround,
  getColumnCells,
  getIndexCoordinates,
  getRowCells,
  getRowOrColumnCells,
  getTableSelectionType,
  isCellEmpty,
  isHTMLElement,
  isTableNode,
  marginRound,
  rectEq,
  safeClosest,
  selectLastCell,
  setCellAttr,
  updateSelectionAfterAction,
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

function createCell(text = '') {
  return schema.nodes.table_cell.create(
    null,
    schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined),
  )
}

function createTable(rows: ProseMirrorNode[][]) {
  return schema.nodes.table.create(
    null,
    rows.map((cells) => schema.nodes.table_row.create(null, cells)),
  )
}

function cellPosAt(table: ProseMirrorNode, row: number, column: number) {
  return 1 + TableMap.get(table).map[row * TableMap.get(table).width + column]!
}

function createFixture(
  table = createTable([
    [createCell('one'), createCell('two')],
    [createCell(), createCell()],
  ]),
) {
  const documentNode = schema.nodes.doc.create(null, table)
  const state = EditorState.create({
    schema,
    doc: documentNode,
    selection: TextSelection.create(documentNode, cellPosAt(table, 0, 0) + 2),
  })
  const editor = {
    state,
    view: { dispatch: vi.fn() },
  } as unknown as Editor & { state: EditorState; view: { dispatch: ReturnType<typeof vi.fn> } }
  return { editor, state, table }
}

describe('table utility branch behavior', () => {
  it('handles DOM cells, wrappers, missing ancestors, and numeric helpers', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'tableWrapper'
    const body = document.createElement('tbody')
    const header = document.createElement('th')
    const cell = document.createElement('td')
    const nested = document.createElement('span')
    cell.append(nested)
    body.append(header, cell)
    wrapper.append(body)
    document.body.append(wrapper)

    expect(isHTMLElement(cell)).toBe(true)
    expect(isHTMLElement({})).toBe(false)
    expect(safeClosest(nested, 'tbody')).toBe(body)
    expect(safeClosest(null, 'tbody')).toBeNull()
    expect(clamp(-1, 0, 2)).toBe(0)
    expect(clamp(3, 0, 2)).toBe(2)
    expect(domCellAround(nested)).toMatchObject({ type: 'cell', domNode: cell, tbodyNode: body })
    expect(domCellAround(header)).toMatchObject({ type: 'cell', domNode: header, tbodyNode: body })
    expect(domCellAround(wrapper)).toMatchObject({
      type: 'wrapper',
      domNode: wrapper,
      tbodyNode: body,
    })
    expect(domCellAround(document.createElement('span'))).toBeUndefined()

    const proseMirror = document.createElement('div')
    proseMirror.className = 'ProseMirror'
    proseMirror.append(document.createElement('span'))
    expect(domCellAround(proseMirror.firstElementChild)).toBeUndefined()

    expect(marginRound(1.1)).toBe(1)
    expect(marginRound(1.5)).toBe(2)
    expect(marginRound(1.9)).toBe(2)
    expect(rectEq(null, null)).toBe(true)
    expect(rectEq(new DOMRect(0, 0, 1, 1), new DOMRect(0, 0, 1, 1))).toBe(true)
    expect(rectEq(new DOMRect(0, 0, 1, 1), new DOMRect(1, 0, 1, 1))).toBe(false)
  })

  it('resolves explicit and cell-selection row and column helpers', () => {
    const { editor, state, table } = createFixture()

    expect(getRowCells(editor, 1, 0).cells.map((cell) => cell.column)).toEqual([0, 1])
    expect(getColumnCells(editor, 1, 0).cells.map((cell) => cell.row)).toEqual([0, 1])
    expect(getRowCells(null, 0, 0)).toEqual({ cells: [], mergedCells: [] })
    expect(getColumnCells(editor, 4, 0)).toEqual({ cells: [], mergedCells: [] })
    expect(getRowOrColumnCells(null)).toMatchObject({ cells: [], mergedCells: [] })
    expect(getRowOrColumnCells(editor, 0, 'row', 0)).toMatchObject({ index: 0, orientation: 'row' })
    expect(getIndexCoordinates({ editor, index: 0, orientation: 'row', tablePos: 0 })).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ])
    expect(getIndexCoordinates({ editor, index: 1, orientation: 'column', tablePos: 0 })).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 1 },
    ])
    expect(getIndexCoordinates({ editor, index: -1, orientation: 'row', tablePos: 0 })).toBeNull()
    expect(getTableSelectionType(editor, 1, 'column', 0)).toEqual({
      index: 1,
      orientation: 'column',
    })

    const first = cellPosAt(table, 0, 0)
    const last = cellPosAt(table, 0, 1)
    editor.state = state.apply(
      state.tr.setSelection(new CellSelection(state.doc.resolve(first), state.doc.resolve(last))),
    )
    expect(getTableSelectionType(editor, undefined, undefined, 0)).toEqual({
      index: 0,
      orientation: 'row',
    })
    expect(getRowOrColumnCells(editor, undefined, undefined, 0)).toMatchObject({
      index: 0,
      orientation: 'row',
    })
    expect(selectLastCell(editor, table, 0, 'row')).toBe(true)
    updateSelectionAfterAction(editor, 'row', 1, 0)
    updateSelectionAfterAction(editor, 'column', 1, 0)
    updateSelectionAfterAction(editor, 'column', 4, 0)
    expect(editor.view.dispatch).toHaveBeenCalledTimes(3)
  })

  it('updates attributes for text and cell selections and recognizes node variants', () => {
    const { state, table } = createFixture()
    const dispatch = vi.fn()
    expect(setCellAttr('colwidth', [120])(state, dispatch)).toBe(true)
    expect(dispatch).toHaveBeenCalledOnce()

    const first = cellPosAt(table, 0, 0)
    const last = cellPosAt(table, 0, 1)
    const selectedState = state.apply(
      state.tr.setSelection(new CellSelection(state.doc.resolve(first), state.doc.resolve(last))),
    )
    const selectedDispatch = vi.fn()
    expect(setCellAttr({ backgroundColor: '#fef3c7' })(selectedState, selectedDispatch)).toBe(true)
    expect(selectedDispatch).toHaveBeenCalledOnce()
    expect(setCellAttr('colwidth', 20)(EditorState.create({ schema }))).toBe(false)

    expect(isTableNode(table)).toBe(true)
    expect(isTableNode(null)).toBe(false)
    expect(isCellEmpty(createCell())).toBe(true)
    expect(isCellEmpty(createCell('content'))).toBe(false)
  })
})
