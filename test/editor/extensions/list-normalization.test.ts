import type { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it } from 'vitest'
import { ListNormalization } from '../../../src/editor/extensions/list-normalization'
import {
  createExtensionEditor,
  destroyExtensionEditor,
  runExtensionShortcut,
  setTextCursor,
  setTextSelection,
} from './extension-test-utils'

let editor: Editor | undefined

afterEach(() => {
  if (editor) destroyExtensionEditor(editor)
  editor = undefined
})

function createListEditor(content: string) {
  editor = createExtensionEditor({
    content,
    extensions: [ListNormalization],
    includeLists: true,
  })
  return editor
}

describe('ListNormalization', () => {
  it('joins same-type bullet lists and places the cursor after the leading list item', () => {
    const instance = createListEditor(
      '<ul><li><p>Leading</p></li></ul><p></p><ul><li><p>Trailing</p></li></ul>',
    )

    setTextCursor(instance, 'paragraph', 1)
    expect(runExtensionShortcut(instance, 'listNormalization', 'Backspace')).toBe(true)

    const list = instance.state.doc.firstChild
    expect(list?.type.name).toBe('bulletList')
    expect(list?.childCount).toBe(2)
    expect(
      instance.state.doc.content.content.filter((node) => node.type.name === 'bulletList'),
    ).toHaveLength(1)
    expect(instance.state.doc.lastChild?.type.name).toBe('paragraph')
    expect(instance.state.doc.lastChild?.content.size).toBe(0)
    expect(instance.state.selection.$from.parent.textContent).toBe('Leading')
    expect(instance.state.selection.$from.parentOffset).toBe('Leading'.length)
  })

  it('preserves ordered-list attributes and task-item structure while joining', () => {
    const ordered = createListEditor(
      '<ol start="3"><li><p>First</p></li></ol><p></p><ol start="7"><li><p>Second</p></li></ol>',
    )
    setTextCursor(ordered, 'paragraph', 1)
    expect(runExtensionShortcut(ordered, 'listNormalization', 'Backspace')).toBe(true)
    expect(ordered.state.doc.firstChild?.attrs).toMatchObject({ start: 3 })
    expect(ordered.state.doc.firstChild?.childCount).toBe(2)

    destroyExtensionEditor(ordered)
    editor = createListEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Done</p></li></ul><p></p><ul data-type="taskList"><li data-type="taskItem"><p>Todo</p></li></ul>',
    )
    setTextCursor(editor, 'paragraph', 1)
    expect(runExtensionShortcut(editor, 'listNormalization', 'Backspace')).toBe(true)
    expect(editor.state.doc.firstChild?.type.name).toBe('taskList')
    expect(editor.state.doc.firstChild?.child(0).attrs).toMatchObject({ checked: true })
    expect(editor.state.doc.firstChild?.childCount).toBe(2)
  })

  it('returns false without changing content or selection for unsupported separator contexts', () => {
    const cases = [
      {
        content: '<ul><li><p>Before</p></li></ul><p>Not empty</p><ul><li><p>After</p></li></ul>',
        paragraphOccurrence: 1,
        cursorOffset: 0,
      },
      {
        content:
          '<ul><li><p>Before</p></li></ul><p>Mid-text separator</p><ul><li><p>After</p></li></ul>',
        paragraphOccurrence: 1,
        cursorOffset: 1,
      },
      {
        content: '<p></p><ul><li><p>After</p></li></ul>',
        paragraphOccurrence: 0,
        cursorOffset: 0,
      },
      {
        content: '<ul><li><p>Before</p></li></ul><p></p><ol><li><p>After</p></li></ol>',
        paragraphOccurrence: 1,
        cursorOffset: 0,
      },
      {
        content: '<blockquote><p>Before</p></blockquote><p></p><ul><li><p>After</p></li></ul>',
        paragraphOccurrence: 1,
        cursorOffset: 0,
      },
    ]

    for (const testCase of cases) {
      const instance = createListEditor(testCase.content)
      setTextCursor(instance, 'paragraph', testCase.paragraphOccurrence, testCase.cursorOffset)
      const beforeDocument = instance.getJSON()
      const beforeSelection = instance.state.selection.toJSON()

      expect(runExtensionShortcut(instance, 'listNormalization', 'Backspace')).toBe(false)
      expect(instance.getJSON()).toEqual(beforeDocument)
      expect(instance.state.selection.toJSON()).toEqual(beforeSelection)

      destroyExtensionEditor(instance)
      editor = undefined
    }
  })

  it('returns false for a range selection at an otherwise valid separator', () => {
    const instance = createListEditor(
      '<ul><li><p>Before</p></li></ul><p></p><ul><li><p>After</p></li></ul>',
    )
    const separatorPosition = instance.state.doc.child(0).nodeSize
    setTextSelection(instance, separatorPosition + 1, separatorPosition + 2)

    const beforeDocument = instance.getJSON()
    expect(runExtensionShortcut(instance, 'listNormalization', 'Backspace')).toBe(false)
    expect(instance.getJSON()).toEqual(beforeDocument)
  })
})
