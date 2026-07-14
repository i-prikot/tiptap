import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tiptap/vue-3'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTableAlignCell } from '../../../src/editor/composables/useTableAlignCell'
import { TableKit } from '../../../src/editor/extensions/table-kit'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function createTableEditor() {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({
    element: host,
    extensions: [StarterKit, TableKit.configure({ table: { resizable: true, cellMinWidth: 120 } })],
  })
  editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })
  editors.push(editor)
  return editor
}

function tableInfo(editor: Editor) {
  let result:
    { node: NonNullable<ReturnType<Editor['state']['doc']['nodeAt']>>; pos: number } | undefined
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'table') result = { node, pos }
  })
  if (!result) throw new Error('Expected a table')
  return { ...result, map: TableMap.get(result.node) }
}

function selectCell(editor: Editor, row: number, column: number) {
  const table = tableInfo(editor)
  const relative = table.map.map[row * table.map.width + column]
  if (relative === undefined) throw new Error('Expected table cell')
  const position = table.pos + 1 + relative
  editor.view.dispatch(
    editor.state.tr.setSelection(
      new CellSelection(editor.state.doc.resolve(position), editor.state.doc.resolve(position)),
    ),
  )
}

function useAlignment(
  editor: Editor,
  options: Omit<Parameters<typeof useTableAlignCell>[0], 'editor'>,
) {
  let action: ReturnType<typeof useTableAlignCell> | undefined
  const Host = defineComponent({
    setup() {
      action = useTableAlignCell({ ...options, editor: computed<Editor | null>(() => editor) })
      return () => h('div')
    },
  })
  wrappers.push(mount(Host))
  if (!action) throw new Error('Expected alignment action')
  return action
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('table cell alignment branch behavior', () => {
  it('aligns a selected cell and exposes active text alignment state', () => {
    const editor = createTableEditor()
    selectCell(editor, 0, 0)
    const onAligned = vi.fn()
    const action = useAlignment(editor, {
      alignment: 'center',
      alignmentType: 'text',
      onAligned,
    })

    expect(action.isVisible.value).toBe(true)
    expect(action.canAlignCell.value).toBe(true)
    expect(action.isActive.value).toBe(false)
    expect(action.handleAlign()).toBe(true)
    expect(onAligned).toHaveBeenCalledWith('center')

    expect(action.label).toBe('Align center')
    expect(action.isActive.value).toBe(false)
  })

  it('aligns explicit rows and columns while preserving independent attributes', () => {
    const editor = createTableEditor()
    const row = useAlignment(editor, {
      alignment: 'right',
      alignmentType: 'text',
      index: 1,
      orientation: 'row',
      hideWhenUnavailable: true,
    })
    const column = useAlignment(editor, {
      alignment: 'bottom',
      alignmentType: 'vertical',
      index: 0,
      orientation: 'column',
    })

    expect(row.isVisible.value).toBe(true)
    expect(row.handleAlign()).toBe(true)
    expect(column.handleAlign()).toBe(true)

    expect(row.label).toBe('Align right')
    expect(column.label).toBe('Align bottom')
    expect(tableInfo(editor).map).toBeInstanceOf(TableMap)
  })

  it('hides and rejects alignment when no editable table selection is available', () => {
    const editor = createTableEditor()
    const action = useAlignment(editor, {
      alignment: 'justify',
      alignmentType: 'text',
      hideWhenUnavailable: true,
    })

    editor.setEditable(false)
    expect(action.isVisible.value).toBe(false)
    expect(action.canAlignCell.value).toBe(false)
    expect(action.handleAlign()).toBe(false)
  })
})
