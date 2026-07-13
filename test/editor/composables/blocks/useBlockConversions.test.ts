import { Editor } from '@tiptap/vue-3'
import Image from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { computed, effectScope, type ComputedRef, type EffectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BlockquoteIcon,
  CodeBlockIcon,
  HeadingFiveIcon,
  HeadingFourIcon,
  HeadingOneIcon,
  HeadingSixIcon,
  HeadingThreeIcon,
  HeadingTwoIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  TypeIcon,
} from '../../../../src/editor/icons'
import {
  BLOCKQUOTE_SHORTCUT_KEY,
  CODE_BLOCK_SHORTCUT_KEY,
  HEADING_SHORTCUT_KEYS,
  LIST_SHORTCUT_KEYS,
  TEXT_SHORTCUT_KEY,
  canToggleBlockquote,
  canToggleCodeBlock,
  canToggleHeading,
  canToggleList,
  canToggleText,
  headingIcons,
  listIcons,
  useBlockquoteBlock,
  useCodeBlockBlock,
  useHeadingBlock,
  useListBlock,
  useTextBlock,
  type BlockConversionApi,
  type ListType,
} from '../../../../src/editor/composables/blocks/useBlockConversions'

const editors: Editor[] = []
const scopes: EffectScope[] = []

function createEditor(content: string, editable = true, extensions = [StarterKit]): Editor {
  const element = document.createElement('div')
  document.body.append(element)

  const editor = new Editor({
    element,
    editable,
    extensions: [...extensions, TaskList, TaskItem.configure({ nested: true }), Image],
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

function selectNode(editor: Editor, nodeName: string): void {
  let nodePosition = -1
  editor.state.doc.descendants((node, position) => {
    if (node.type.name === nodeName && nodePosition === -1) {
      nodePosition = position
      return false
    }
    return true
  })

  if (nodePosition === -1) throw new Error(`Expected a ${nodeName} node in the editor document.`)

  editor.view.dispatch(
    editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, nodePosition)),
  )
}

function topLevelBlock(editor: Editor) {
  const block = editor.state.doc.firstChild
  if (!block) throw new Error('Expected an editor document with a top-level block.')
  return block
}

function emitSelectionUpdate(editor: Editor): void {
  editor.emit('selectionUpdate', { editor } as never)
}

function createApi(
  editor: Editor | null,
  factory: (editorRef: ComputedRef<Editor | null>) => BlockConversionApi,
): BlockConversionApi {
  const scope = effectScope()
  let api: BlockConversionApi | undefined
  const editorRef = computed<Editor | null>(() => editor)

  scope.run(() => {
    api = factory(editorRef)
  })
  scopes.push(scope)

  if (!api) throw new Error('Expected the block conversion composable to create an API.')
  return api
}

afterEach(() => {
  while (scopes.length) scopes.pop()?.stop()
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('block conversion capabilities', () => {
  it('exports labels, shortcuts, and icons for every block conversion factory', () => {
    const editor = createEditor('<p>Metadata</p>')

    const text = createApi(editor, useTextBlock)
    expect(text).toMatchObject({
      label: 'Text',
      shortcutKeys: TEXT_SHORTCUT_KEY,
      Icon: TypeIcon,
    })

    const headingIconsByLevel = [
      HeadingOneIcon,
      HeadingTwoIcon,
      HeadingThreeIcon,
      HeadingFourIcon,
      HeadingFiveIcon,
      HeadingSixIcon,
    ]
    for (const [index, Icon] of headingIconsByLevel.entries()) {
      const level = index + 1
      expect(createApi(editor, (editorRef) => useHeadingBlock(editorRef, level))).toMatchObject({
        label: `Heading ${level}`,
        shortcutKeys: HEADING_SHORTCUT_KEYS[level],
        Icon,
      })
      expect(headingIcons[level]).toBe(Icon)
    }

    const listMetadata: Array<{ type: ListType; label: string; Icon: unknown }> = [
      { type: 'bulletList', label: 'Bullet List', Icon: ListIcon },
      { type: 'orderedList', label: 'Numbered List', Icon: ListOrderedIcon },
      { type: 'taskList', label: 'To-do list', Icon: ListTodoIcon },
    ]
    for (const { type, label, Icon } of listMetadata) {
      expect(createApi(editor, (editorRef) => useListBlock(editorRef, type))).toMatchObject({
        label,
        shortcutKeys: LIST_SHORTCUT_KEYS[type],
        Icon,
      })
      expect(listIcons[type]).toBe(Icon)
    }

    expect(createApi(editor, useBlockquoteBlock)).toMatchObject({
      label: 'Blockquote',
      shortcutKeys: BLOCKQUOTE_SHORTCUT_KEY,
      Icon: BlockquoteIcon,
    })
    expect(createApi(editor, useCodeBlockBlock)).toMatchObject({
      label: 'Code Block',
      shortcutKeys: CODE_BLOCK_SHORTCUT_KEY,
      Icon: CodeBlockIcon,
    })
  })

  it('exposes active and available state for every block conversion factory', () => {
    const fixtures: Array<{
      content: string
      factory: (editorRef: ComputedRef<Editor | null>) => BlockConversionApi
      name: string
    }> = [
      { name: 'text', content: '<p>Text</p>', factory: useTextBlock },
      {
        name: 'heading',
        content: '<h2>Heading</h2>',
        factory: (editorRef) => useHeadingBlock(editorRef, 2),
      },
      {
        name: 'list',
        content: '<ul><li><p>List</p></li></ul>',
        factory: (editorRef) => useListBlock(editorRef, 'bulletList'),
      },
      {
        name: 'blockquote',
        content: '<blockquote><p>Quote</p></blockquote>',
        factory: useBlockquoteBlock,
      },
      { name: 'code block', content: '<pre><code>Code</code></pre>', factory: useCodeBlockBlock },
    ]

    for (const { content, factory, name } of fixtures) {
      const editor = createEditor(content)
      selectFirstText(editor)
      const api = createApi(editor, factory)

      expect(api.isActive.value, name).toBe(true)
      expect(api.canToggle.value, name).toBe(true)
    }
  })

  it('recomputes active and available state after a selection update in a Vue scope', () => {
    const editor = createEditor('<p>Paragraph</p><h2>Heading</h2>')
    selectFirstText(editor)
    const text = createApi(editor, useTextBlock)
    const heading = createApi(editor, (editorRef) => useHeadingBlock(editorRef, 2))

    expect(text.isActive.value).toBe(true)
    expect(text.canToggle.value).toBe(true)
    expect(heading.isActive.value).toBe(false)
    expect(heading.canToggle.value).toBe(true)

    selectNode(editor, 'heading')
    emitSelectionUpdate(editor)

    expect(text.isActive.value).toBe(false)
    expect(heading.isActive.value).toBe(true)
    expect(heading.canToggle.value).toBe(true)
  })

  it('uses direct target availability only when turnInto is false', () => {
    const editor = createEditor('<hr>')
    selectNode(editor, 'horizontalRule')

    expect(canToggleText(editor)).toBe(false)
    expect(canToggleHeading(editor, 2)).toBe(false)
    expect(canToggleBlockquote(editor)).toBe(false)
    expect(canToggleCodeBlock(editor)).toBe(false)

    vi.spyOn(editor, 'can').mockReturnValue({
      setNode: () => true,
      toggleWrap: () => true,
      toggleNode: () => true,
    } as never)

    expect(canToggleText(editor, false)).toBe(true)
    expect(canToggleHeading(editor, 2, false)).toBe(true)
    expect(canToggleBlockquote(editor, false)).toBe(true)
    expect(canToggleCodeBlock(editor, false)).toBe(true)
  })

  it('permits conversion when clearNodes is the remaining applicable command', () => {
    const editor = createEditor('<p>Fallback</p>')
    selectFirstText(editor)
    vi.spyOn(editor, 'can').mockReturnValue({
      setNode: () => false,
      clearNodes: () => true,
      toggleWrap: () => false,
      toggleNode: () => false,
    } as never)

    expect(canToggleText(editor)).toBe(true)
    expect(canToggleHeading(editor, 2)).toBe(true)
    expect(canToggleBlockquote(editor)).toBe(true)
    expect(canToggleCodeBlock(editor)).toBe(true)
  })

  it('rejects missing, read-only, schema-missing, image-selected, unsupported, and unknown-list inputs', () => {
    expect(canToggleText(null)).toBe(false)
    expect(canToggleHeading(null, 1)).toBe(false)
    expect(canToggleList(null, 'bulletList')).toBe(false)
    expect(canToggleBlockquote(null)).toBe(false)
    expect(canToggleCodeBlock(null)).toBe(false)

    const readOnlyEditor = createEditor('<p>Read-only</p>', false)
    selectFirstText(readOnlyEditor)
    expect(canToggleHeading(readOnlyEditor, 1)).toBe(false)
    expect(canToggleList(readOnlyEditor, 'bulletList')).toBe(false)
    expect(canToggleBlockquote(readOnlyEditor)).toBe(false)
    expect(canToggleCodeBlock(readOnlyEditor)).toBe(false)

    const noHeadingEditor = createEditor('<p>No heading schema</p>', true, [
      StarterKit.configure({ heading: false }),
    ])
    expect(canToggleHeading(noHeadingEditor, 1)).toBe(false)

    const imageEditor = createEditor('<img src="/image.png">')
    selectNode(imageEditor, 'image')
    expect(canToggleText(imageEditor)).toBe(false)
    expect(canToggleHeading(imageEditor, 1)).toBe(false)
    expect(canToggleList(imageEditor, 'bulletList')).toBe(false)
    expect(canToggleBlockquote(imageEditor)).toBe(false)
    expect(canToggleCodeBlock(imageEditor)).toBe(false)

    const unsupportedEditor = createEditor('<hr>')
    selectNode(unsupportedEditor, 'horizontalRule')
    expect(canToggleList(unsupportedEditor, 'bulletList')).toBe(false)
    expect(canToggleList(unsupportedEditor, 'unknownList' as ListType)).toBe(false)
  })
})

describe('block conversion toggles', () => {
  it('turns a heading into a paragraph and retains its text', () => {
    const editor = createEditor('<h2>Text block</h2>')
    selectFirstText(editor)
    const text = createApi(editor, useTextBlock)

    expect(text.handleToggle()).toBe(true)
    expect(topLevelBlock(editor).type.name).toBe('paragraph')
    expect(topLevelBlock(editor).textContent).toBe('Text block')
  })

  it('toggles a paragraph to a heading and the matching heading back to a paragraph', () => {
    const editor = createEditor('<p>Heading toggle</p>')
    selectFirstText(editor)
    const heading = createApi(editor, (editorRef) => useHeadingBlock(editorRef, 3))

    expect(heading.handleToggle()).toBe(true)
    expect(topLevelBlock(editor).type.name).toBe('heading')
    expect(topLevelBlock(editor).attrs.level).toBe(3)
    expect(topLevelBlock(editor).textContent).toBe('Heading toggle')

    expect(heading.handleToggle()).toBe(true)
    expect(topLevelBlock(editor).type.name).toBe('paragraph')
    expect(topLevelBlock(editor).textContent).toBe('Heading toggle')
  })

  it.each([
    ['bulletList', 'Bullet list'] as const,
    ['orderedList', 'Ordered list'] as const,
    ['taskList', 'Task list'] as const,
  ])('creates and lifts the active %s while preserving text', (type, textContent) => {
    const editor = createEditor(`<p>${textContent}</p>`)
    selectFirstText(editor)
    const list = createApi(editor, (editorRef) => useListBlock(editorRef, type))

    expect(list.handleToggle()).toBe(true)
    expect(topLevelBlock(editor).type.name).toBe(type)
    expect(topLevelBlock(editor).textContent).toBe(textContent)

    expect(list.handleToggle()).toBe(true)
    expect(topLevelBlock(editor).type.name).toBe('paragraph')
    expect(topLevelBlock(editor).textContent).toBe(textContent)
  })

  it('wraps a paragraph in a blockquote and lifts the active blockquote', () => {
    const editor = createEditor('<p>Quote toggle</p>')
    selectFirstText(editor)
    const blockquote = createApi(editor, useBlockquoteBlock)

    expect(blockquote.handleToggle()).toBe(true)
    expect(topLevelBlock(editor).type.name).toBe('blockquote')
    expect(topLevelBlock(editor).textContent).toBe('Quote toggle')

    expect(blockquote.handleToggle()).toBe(true)
    expect(topLevelBlock(editor).type.name).toBe('paragraph')
    expect(topLevelBlock(editor).textContent).toBe('Quote toggle')
  })

  it('toggles a paragraph and code block using the paragraph fallback', () => {
    const editor = createEditor('<p>Code toggle</p>')
    selectFirstText(editor)
    const codeBlock = createApi(editor, useCodeBlockBlock)

    expect(codeBlock.handleToggle()).toBe(true)
    expect(topLevelBlock(editor).type.name).toBe('codeBlock')
    expect(topLevelBlock(editor).textContent).toBe('Code toggle')

    selectFirstText(editor)
    expect(codeBlock.handleToggle()).toBe(true)
    expect(topLevelBlock(editor).type.name).toBe('paragraph')
    expect(topLevelBlock(editor).textContent).toBe('Code toggle')
  })

  it('refuses null, read-only, and non-toggleable calls without changing the document', () => {
    const nullText = createApi(null, useTextBlock)
    expect(nullText.handleToggle()).toBe(false)

    const readOnlyEditor = createEditor('<p>Read-only toggle</p>', false)
    const readOnlyDocument = readOnlyEditor.getJSON()
    selectFirstText(readOnlyEditor)
    expect(createApi(readOnlyEditor, useTextBlock).handleToggle()).toBe(false)
    expect(readOnlyEditor.getJSON()).toEqual(readOnlyDocument)

    const unsupportedEditor = createEditor('<hr>')
    selectNode(unsupportedEditor, 'horizontalRule')
    const unsupportedDocument = unsupportedEditor.getJSON()
    expect(createApi(unsupportedEditor, useBlockquoteBlock).handleToggle()).toBe(false)
    expect(unsupportedEditor.getJSON()).toEqual(unsupportedDocument)
  })
})
