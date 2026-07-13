import { Editor } from '@tiptap/vue-3'
import Image from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as tiptapUtils from '../../../../src/editor/utils/tiptap-utils'
import {
  CONVERTIBLE_TYPES,
  convertSelectedBlock,
} from '../../../../src/editor/composables/blocks/block-conversion'

const editors: Editor[] = []

function createEditor(content: string): Editor {
  const element = document.createElement('div')
  document.body.append(element)

  const editor = new Editor({
    element,
    extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true }), Image],
    content,
  })
  editors.push(editor)
  return editor
}

function selectFirstText(editor: Editor): void {
  let textPosition = -1
  editor.state.doc.descendants((node, position) => {
    if (node.isText && textPosition === -1) {
      textPosition = position
      return false
    }
    return true
  })

  if (textPosition === -1) throw new Error('Expected a text node in the editor document.')

  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, textPosition + 1)),
  )
}

function selectTopLevelNode(editor: Editor): void {
  editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))
}

function topLevelBlock(editor: Editor) {
  const block = editor.state.doc.firstChild
  if (!block) throw new Error('Expected an editor document with a top-level block.')
  return block
}

function expectTextblockCaretAtEnd(editor: Editor): void {
  const { selection } = editor.state
  expect(selection).toBeInstanceOf(TextSelection)
  expect(selection.$head.parent.isTextblock).toBe(true)
  expect(selection.$head.parentOffset).toBe(selection.$head.parent.content.size)
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('block conversion', () => {
  it('exports every supported source block type', () => {
    expect(CONVERTIBLE_TYPES).toEqual([
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'taskList',
      'blockquote',
      'codeBlock',
    ])
  })

  it.each([
    {
      name: 'paragraph to heading',
      content: '<p>Heading text</p>',
      apply: (chain: ReturnType<Editor['chain']>) => chain.setNode('heading', { level: 2 }),
      expectedType: 'heading',
    },
    {
      name: 'paragraph to bullet list',
      content: '<p>List text</p>',
      apply: (chain: ReturnType<Editor['chain']>) => chain.toggleBulletList(),
      expectedType: 'bulletList',
    },
    {
      name: 'paragraph to blockquote',
      content: '<p>Quoted text</p>',
      apply: (chain: ReturnType<Editor['chain']>) => chain.wrapIn('blockquote'),
      expectedType: 'blockquote',
    },
    {
      name: 'paragraph to code block',
      content: '<p>Code text</p>',
      apply: (chain: ReturnType<Editor['chain']>) => chain.toggleNode('codeBlock', 'paragraph'),
      expectedType: 'codeBlock',
    },
  ])('normalizes a text selection and converts $name', ({ content, apply, expectedType }) => {
    const editor = createEditor(content)
    const originalText = editor.getText()
    selectFirstText(editor)

    expect(convertSelectedBlock(editor, apply)).toBe(true)
    expect(topLevelBlock(editor).type.name).toBe(expectedType)
    expect(topLevelBlock(editor).textContent).toBe(originalText)
    expectTextblockCaretAtEnd(editor)
  })

  it('clears nested list wrappers before converting the selected list block', () => {
    const editor = createEditor('<ul><li><p>Nested text</p></li></ul>')
    selectFirstText(editor)

    expect(convertSelectedBlock(editor, (chain) => chain.setNode('heading', { level: 3 }))).toBe(
      true,
    )
    expect(topLevelBlock(editor).type.name).toBe('heading')
    expect(topLevelBlock(editor).attrs.level).toBe(3)
    expect(topLevelBlock(editor).textContent).toBe('Nested text')
    expectTextblockCaretAtEnd(editor)
  })

  it('converts an existing node selection without resolving the selected node position', () => {
    const editor = createEditor('<p>Selected block</p>')
    selectTopLevelNode(editor)
    const findPosition = vi.spyOn(tiptapUtils, 'findNodePosition').mockReturnValue(null)

    expect(convertSelectedBlock(editor, (chain) => chain.setNode('heading', { level: 4 }))).toBe(
      true,
    )
    expect(findPosition).not.toHaveBeenCalled()
    expect(topLevelBlock(editor).type.name).toBe('heading')
    expect(topLevelBlock(editor).attrs.level).toBe(4)
    expect(topLevelBlock(editor).textContent).toBe('Selected block')
  })

  it('returns false and preserves the document when the selected node position is unavailable', () => {
    const editor = createEditor('<p>Lookup failure</p>')
    const originalDocument = editor.getJSON()
    selectFirstText(editor)
    vi.spyOn(tiptapUtils, 'findNodePosition').mockReturnValue(null)

    expect(convertSelectedBlock(editor, (chain) => chain.setNode('heading', { level: 2 }))).toBe(
      false,
    )
    expect(editor.getJSON()).toEqual(originalDocument)
  })

  it('returns false and preserves the document when a conversion chain throws', () => {
    const editor = createEditor('<p>Command failure</p>')
    const originalDocument = editor.getJSON()
    selectFirstText(editor)
    vi.spyOn(editor, 'chain').mockImplementation(() => {
      throw new Error('chain command failed')
    })

    expect(convertSelectedBlock(editor, (chain) => chain.setNode('heading', { level: 2 }))).toBe(
      false,
    )
    expect(editor.getJSON()).toEqual(originalDocument)
  })
})
