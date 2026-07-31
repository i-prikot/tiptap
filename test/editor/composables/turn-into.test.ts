import { Editor } from '@tiptap/vue-3'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  TURN_INTO_BLOCKS,
  TURN_INTO_BLOCK_TYPES,
  canTurnInto,
  filterTurnIntoBlocks,
  getActiveTurnIntoBlock,
} from '../../../src/editor/composables/useTurnInto'

const editors: Editor[] = []

function createEditor(content: string, editable = true) {
  const element = document.createElement('div')
  document.body.append(element)
  const editor = new Editor({ content, editable, element, extensions: [StarterKit] })
  editors.push(editor)
  return editor
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('turn into options', () => {
  it('exports every supported block type in menu order', () => {
    expect(TURN_INTO_BLOCKS.map((block) => block.type)).toEqual([
      'paragraph',
      'heading',
      'heading',
      'heading',
      'bulletList',
      'orderedList',
      'taskList',
      'blockquote',
      'codeBlock',
    ])
    expect(TURN_INTO_BLOCK_TYPES).toEqual([
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'taskList',
      'blockquote',
      'codeBlock',
    ])
  })

  it('filters configured menu options while retaining all options by default', () => {
    expect(filterTurnIntoBlocks()).toBe(TURN_INTO_BLOCKS)
    expect(filterTurnIntoBlocks(['heading', 'codeBlock']).map((block) => block.messageKey)).toEqual(
      [
        'menus.slash.heading1.title',
        'menus.slash.heading2.title',
        'menus.slash.heading3.title',
        'menus.slash.codeBlock.title',
      ],
    )
  })

  it('matches active options against the editor state', () => {
    const isActive = vi.fn((type: string, attributes?: { level?: number }) => {
      if (type === 'heading') return attributes?.level === 2
      return type === 'bulletList'
    })
    const editor = { isActive } as unknown as Editor

    expect(
      TURN_INTO_BLOCKS.find((block) => block.messageKey === 'menus.slash.heading2.title')?.isActive(
        editor,
      ),
    ).toBe(true)
    expect(
      TURN_INTO_BLOCKS.find(
        (block) => block.messageKey === 'menus.slash.bulletList.title',
      )?.isActive(editor),
    ).toBe(true)
    expect(
      TURN_INTO_BLOCKS.find((block) => block.messageKey === 'menus.slash.heading1.title')?.isActive(
        editor,
      ),
    ).toBe(false)
    expect(
      TURN_INTO_BLOCKS.find((block) => block.messageKey === 'menus.slash.text.title')?.isActive(
        editor,
      ),
    ).toBe(false)
  })

  it('recognizes a paragraph only when no alternate block type is active', () => {
    const inactiveEditor = { isActive: vi.fn(() => false) } as unknown as Editor
    const activeHeadingEditor = {
      isActive: vi.fn((type: string) => type === 'paragraph' || type === 'heading'),
    } as unknown as Editor
    const paragraph = TURN_INTO_BLOCKS[0]

    expect(paragraph.isActive(inactiveEditor)).toBe(false)
    expect(
      paragraph.isActive({
        isActive: vi.fn((type: string) => type === 'paragraph'),
      } as unknown as Editor),
    ).toBe(true)
    expect(paragraph.isActive(activeHeadingEditor)).toBe(false)
  })

  it('checks the selected node or text parent against allowed block types', () => {
    const editor = createEditor('<p>Text</p><h2>Heading</h2>')

    expect(canTurnInto(null)).toBe(false)
    expect(canTurnInto(createEditor('<p>Read only</p>', false))).toBe(false)

    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 2)))
    expect(canTurnInto(editor, ['paragraph'])).toBe(true)
    expect(canTurnInto(editor, ['heading'])).toBe(false)

    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 6)))
    expect(canTurnInto(editor, ['heading'])).toBe(true)
    expect(canTurnInto(editor, ['paragraph'])).toBe(false)
  })

  it('uses the active block as the trigger label and falls back predictably', () => {
    const headingEditor = {
      isActive: vi.fn(
        (type: string, attributes?: { level?: number }) =>
          type === 'heading' && attributes?.level === 3,
      ),
    } as unknown as Editor
    const inactiveEditor = { isActive: vi.fn(() => false) } as unknown as Editor

    expect(getActiveTurnIntoBlock(headingEditor).messageKey).toBe('menus.slash.heading3.title')
    expect(getActiveTurnIntoBlock(inactiveEditor, ['codeBlock', 'blockquote']).messageKey).toBe(
      'menus.slash.quote.title',
    )
    expect(getActiveTurnIntoBlock(null, ['orderedList']).messageKey).toBe(
      'menus.slash.orderedList.title',
    )
  })
})
