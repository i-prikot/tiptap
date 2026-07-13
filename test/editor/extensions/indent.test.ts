import type { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { afterEach, describe, expect, it } from 'vitest'
import { Indent } from '../../../src/editor/extensions/indent'
import {
  createExtensionEditor,
  destroyExtensionEditor,
  dispatchShortcut,
  findNodePosition,
  getNodeAttributes,
  runExtensionShortcut,
  selectNode,
  setTextCursor,
} from './extension-test-utils'

let editor: Editor | undefined

afterEach(() => {
  if (editor) destroyExtensionEditor(editor)
  editor = undefined
})

function createIndentEditor(content: string, options = {}) {
  editor = createExtensionEditor({
    content,
    extensions: [Indent.configure(options)],
    includeLists: true,
    includeTables: true,
  })
  return editor
}

describe('Indent', () => {
  it('updates eligible blocks, respects command bounds, and rejects unsupported selections', () => {
    const instance = createIndentEditor('<p>Paragraph</p><h2>Heading</h2><hr>')

    setTextCursor(instance, 'paragraph')
    expect(instance.commands.indent()).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({ indent: 1 })
    expect(getNodeAttributes(instance, 'heading')).toMatchObject({ indent: 0 })

    expect(instance.commands.setIndent(99)).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({ indent: 8 })
    expect(instance.commands.indent()).toBe(false)
    expect(instance.commands.setIndent(99)).toBe(false)
    expect(instance.commands.unsetIndent()).toBe(true)
    expect(instance.commands.outdent()).toBe(false)

    setTextCursor(instance, 'heading')
    expect(instance.commands.setIndent(2)).toBe(true)
    expect(getNodeAttributes(instance, 'heading')).toMatchObject({ indent: 2 })

    selectNode(instance, 'horizontalRule')
    expect(instance.commands.indent()).toBe(false)
  })

  it('parses data-indent before styles, clamps values, and renders configured output', () => {
    const dataFirst = createIndentEditor(
      '<p data-indent="2" style="margin-left: 72px">Text</p><p style="padding-left: 49px">Padding</p><p style="text-indent: 120px">Text indent</p><p data-indent="oops" style="margin-left: -12px">Malformed</p>',
    )

    expect(getNodeAttributes(dataFirst, 'paragraph', 0)).toMatchObject({ indent: 2 })
    expect(getNodeAttributes(dataFirst, 'paragraph', 1)).toMatchObject({ indent: 2 })
    expect(getNodeAttributes(dataFirst, 'paragraph', 2)).toMatchObject({ indent: 5 })
    expect(getNodeAttributes(dataFirst, 'paragraph', 3)).toMatchObject({ indent: 0 })
    expect(dataFirst.getHTML()).toContain('data-indent="2"')
    expect(dataFirst.getHTML()).toContain('--tt-indent-level: 2')

    destroyExtensionEditor(dataFirst)
    editor = createIndentEditor('<p data-indent="3">Styled</p>', { useStyle: true, indentUnit: 30 })
    expect(editor.getHTML()).toContain('margin-left: 90px')
  })

  it('handles Tab and Shift-Tab for supported blocks and leaves table navigation alone', () => {
    const instance = createIndentEditor(
      '<p>Paragraph</p><table><tr><td><p>Cell</p></td></tr></table>',
    )

    setTextCursor(instance, 'paragraph')
    expect(dispatchShortcut(instance, 'Tab')).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({ indent: 1 })
    expect(dispatchShortcut(instance, 'Tab', { shiftKey: true })).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph')).toMatchObject({ indent: 0 })

    setTextCursor(instance, 'paragraph', 1)
    const beforeTableSelection = instance.state.selection.toJSON()
    expect(runExtensionShortcut(instance, 'indent', 'Tab')).toBe(false)
    expect(instance.state.selection.toJSON()).toEqual(beforeTableSelection)
    expect(getNodeAttributes(instance, 'paragraph', 1)).toMatchObject({ indent: 0 })
  })

  it('delegates Tab and Shift-Tab on list items to sink and lift commands', () => {
    const instance = createIndentEditor('<ul><li><p>First</p></li><li><p>Second</p></li></ul>')

    setTextCursor(instance, 'paragraph', 1)
    expect(dispatchShortcut(instance, 'Tab')).toBe(true)
    expect(instance.state.doc.firstChild?.childCount).toBe(1)
    expect(instance.state.doc.firstChild?.child(0).lastChild?.type.name).toBe('bulletList')
    expect(instance.state.doc.firstChild?.child(0).lastChild?.textContent).toBe('Second')

    setTextCursor(instance, 'paragraph', 1)
    expect(dispatchShortcut(instance, 'Tab', { shiftKey: true })).toBe(true)
    expect(instance.state.doc.firstChild?.childCount).toBe(2)
    expect(instance.state.doc.firstChild?.child(1).textContent).toBe('Second')
  })

  it('auto-outdents only empty Enter blocks and Backspace cursors at their start', () => {
    const instance = createIndentEditor(
      '<p data-indent="2"></p><p data-indent="2">Text</p><ul><li><p data-indent="2">List item</p></li></ul>',
    )

    setTextCursor(instance, 'paragraph', 0)
    expect(dispatchShortcut(instance, 'Enter')).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph', 0)).toMatchObject({ indent: 1 })

    setTextCursor(instance, 'paragraph', 1)
    expect(dispatchShortcut(instance, 'Backspace')).toBe(true)
    expect(getNodeAttributes(instance, 'paragraph', 1)).toMatchObject({ indent: 1 })

    setTextCursor(instance, 'paragraph', 1, 2)
    expect(dispatchShortcut(instance, 'Backspace')).toBe(false)
    expect(getNodeAttributes(instance, 'paragraph', 1)).toMatchObject({ indent: 1 })

    setTextCursor(instance, 'paragraph', 2)
    dispatchShortcut(instance, 'Enter')
    expect(getNodeAttributes(instance, 'paragraph', 2)).toMatchObject({ indent: 2 })
  })

  it('normalizes a dropped supported block to an adjacent block indentation', () => {
    const instance = createIndentEditor(
      '<p>Leading</p><p>Moved</p><p data-indent="3">Following</p><hr>',
    )
    const leadingPosition = findNodePosition(instance, 'paragraph')
    const movedPosition = findNodePosition(instance, 'paragraph', 1)

    instance.view.dispatch(
      instance.state.tr
        .setSelection(
          TextSelection.create(instance.state.doc, leadingPosition + 1, movedPosition + 1),
        )
        .setMeta('uiEvent', 'drop'),
    )

    expect(getNodeAttributes(instance, 'paragraph', 1)).toMatchObject({ indent: 3 })
    expect(getNodeAttributes(instance, 'horizontalRule')).toMatchObject({})
  })
})
