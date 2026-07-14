import { describe, expect, it } from 'vitest'
import {
  NotionTable,
  TableKit,
  type TableKitOptions,
} from '../../../src/editor/extensions/table-kit'

function resolveExtensions(options: TableKitOptions) {
  const addExtensions = TableKit.config.addExtensions
  if (!addExtensions) throw new Error('Expected TableKit to expose addExtensions')
  return addExtensions.call({ options } as never)
}

describe('TableKit option branches', () => {
  it('adds every table extension when configured', () => {
    const extensions = resolveExtensions({
      table: { cellMinWidth: 120, resizable: true },
      tableCell: {},
      tableHeader: {},
      tableRow: {},
    })

    expect(extensions.map((extension) => extension.name)).toEqual([
      'table',
      'tableCell',
      'tableHeader',
      'tableRow',
    ])
  })

  it('omits every table extension when disabled', () => {
    expect(
      resolveExtensions({ table: false, tableCell: false, tableHeader: false, tableRow: false }),
    ).toEqual([])
  })
})

function resolveTablePlugins({
  cellMinWidth,
  isEditable,
  resizable,
}: {
  cellMinWidth: number
  isEditable: boolean
  resizable: boolean
}) {
  const addProseMirrorPlugins = TableKit.config.addExtensions
  if (!addProseMirrorPlugins) throw new Error('Expected TableKit extensions')

  const getPlugins = NotionTable.config.addProseMirrorPlugins
  if (!getPlugins) throw new Error('Expected NotionTable plugin factory')

  return getPlugins.call({
    editor: { isEditable },
    options: {
      allowTableNodeSelection: false,
      cellMinWidth,
      handleWidth: 5,
      lastColumnResizable: true,
      resizable,
    },
  } as ThisParameterType<typeof getPlugins>)
}

describe('NotionTable plugin option branches', () => {
  it('adds resizing only for editable resizable tables and enforces the minimum cell width', () => {
    expect(
      resolveTablePlugins({ cellMinWidth: 120, isEditable: true, resizable: true }),
    ).toHaveLength(2)
    expect(
      resolveTablePlugins({ cellMinWidth: 1, isEditable: true, resizable: false }),
    ).toHaveLength(1)
    expect(
      resolveTablePlugins({ cellMinWidth: 120, isEditable: false, resizable: true }),
    ).toHaveLength(1)
  })
})
