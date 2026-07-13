import type { Editor } from '@tiptap/core'
import { posToDOMRect } from '@tiptap/core'
import { Schema, type NodeSpec } from '@tiptap/pm/model'
import { AllSelection, EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state'
import { CellSelection, tableNodes } from '@tiptap/pm/tables'
import { describe, expect, it, vi } from 'vitest'
import {
  findSelectionPosition,
  getElementOverflowPosition,
  getNodeDisplayName,
  getSelectionBoundingRect,
  hasContentAbove,
  isSelectionValid,
  isTextSelectionValid,
  removeEmptyParagraphs,
  selectionHasText,
} from '../../../src/editor/utils/selection-utils'

vi.mock('@tiptap/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tiptap/core')>()

  return {
    ...actual,
    posToDOMRect: vi.fn(),
  }
})

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { content: 'inline*', group: 'block' },
    codeBlock: { content: 'text*', group: 'block', code: true },
    image: { atom: true, group: 'block', selectable: true },
    ...tableNodes({ cellAttributes: {}, cellContent: 'paragraph+' }),
  } as Record<string, NodeSpec>,
  marks: {},
})

function paragraph(text = '') {
  return schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined)
}

function createEditor(state: EditorState, nodeDOM = vi.fn()): Editor {
  return {
    state,
    view: {
      state,
      nodeDOM,
    },
  } as unknown as Editor
}

function createTableDocument() {
  const cell = schema.nodes.table_cell.create(null, paragraph('cell'))
  const row = schema.nodes.table_row.create(null, cell)
  const table = schema.nodes.table.create(null, row)

  return schema.nodes.doc.create(null, table)
}

function setRect(element: Element, top: number, bottom: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom,
  } as DOMRect)
}

describe('selection utilities', () => {
  describe('getSelectionBoundingRect', () => {
    it('returns the selected DOM node rectangle for a node selection', () => {
      const doc = schema.nodes.doc.create(null, schema.nodes.image.create())
      const state = EditorState.create({ schema, doc, selection: NodeSelection.create(doc, 0) })
      const element = document.createElement('img')
      const rect = { top: 12, left: 8, bottom: 36, right: 48 } as DOMRect
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect)
      const editor = createEditor(state, vi.fn().mockReturnValue(element))

      expect(getSelectionBoundingRect(editor)).toBe(rect)
      expect(posToDOMRect).not.toHaveBeenCalled()
    })

    it('delegates non-node selections to posToDOMRect using the range boundaries', () => {
      const doc = schema.nodes.doc.create(null, paragraph('text'))
      const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1, 3) })
      const editor = createEditor(state)
      const rect = { top: 4, left: 5, bottom: 20, right: 30 } as DOMRect
      vi.mocked(posToDOMRect).mockReturnValue(rect)

      expect(getSelectionBoundingRect(editor)).toBe(rect)
      expect(posToDOMRect).toHaveBeenCalledWith(editor.view, 1, 3)
    })
  })

  describe('selection validity', () => {
    it('rejects a missing editor, empty text, and code-block selections', () => {
      const emptyDoc = schema.nodes.doc.create(null, paragraph())
      const emptyState = EditorState.create({
        schema,
        doc: emptyDoc,
        selection: TextSelection.create(emptyDoc, 1),
      })
      const codeDoc = schema.nodes.doc.create(
        null,
        schema.nodes.codeBlock.create(null, schema.text('code')),
      )
      const codeState = EditorState.create({
        schema,
        doc: codeDoc,
        selection: TextSelection.create(codeDoc, 1, 3),
      })

      expect(isSelectionValid(null)).toBe(false)
      expect(isSelectionValid(createEditor(emptyState))).toBe(false)
      expect(isSelectionValid(createEditor(codeState))).toBe(false)
      expect(isTextSelectionValid(null)).toBe(false)
      expect(isTextSelectionValid(createEditor(codeState))).toBe(false)
    })

    it('accepts ordinary and whitespace-only text selections, but rejects selected excluded nodes', () => {
      const textDoc = schema.nodes.doc.create(null, paragraph('hello'))
      const textState = EditorState.create({
        schema,
        doc: textDoc,
        selection: TextSelection.create(textDoc, 1, 3),
      })
      const whitespaceDoc = schema.nodes.doc.create(null, paragraph('   '))
      const whitespaceState = EditorState.create({
        schema,
        doc: whitespaceDoc,
        selection: TextSelection.create(whitespaceDoc, 1, 4),
      })
      const imageDoc = schema.nodes.doc.create(null, schema.nodes.image.create())
      const imageState = EditorState.create({
        schema,
        doc: imageDoc,
        selection: NodeSelection.create(imageDoc, 0),
      })

      expect(isSelectionValid(createEditor(textState))).toBe(true)
      expect(isTextSelectionValid(createEditor(textState))).toBe(true)
      expect(isSelectionValid(createEditor(whitespaceState))).toBe(true)
      expect(isTextSelectionValid(createEditor(whitespaceState))).toBe(true)
      expect(isSelectionValid(createEditor(imageState), undefined, ['image'])).toBe(false)
      expect(isTextSelectionValid(createEditor(imageState))).toBe(false)
    })

    it('rejects table cell selections and node selections of code blocks', () => {
      const tableDoc = createTableDocument()
      const tableState = EditorState.create({
        schema,
        doc: tableDoc,
        selection: CellSelection.create(tableDoc, 2),
      })
      const codeDoc = schema.nodes.doc.create(
        null,
        schema.nodes.codeBlock.create(null, schema.text('code')),
      )
      const codeState = EditorState.create({
        schema,
        doc: codeDoc,
        selection: NodeSelection.create(codeDoc, 0),
      })

      expect(isSelectionValid(createEditor(tableState))).toBe(false)
      expect(isSelectionValid(createEditor(codeState))).toBe(false)
    })
  })

  describe('content and display helpers', () => {
    it('removes only empty paragraphs from JSON content', () => {
      const content = {
        type: 'doc',
        content: [
          { type: 'paragraph' },
          { type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'kept' }] },
          { type: 'image', attrs: { src: 'image.png' } },
          { type: 'paragraph', content: [{ type: 'hardBreak' }] },
        ],
      }

      expect(removeEmptyParagraphs(content).content).toEqual([
        { type: 'paragraph', content: [{ type: 'text', text: 'kept' }] },
        { type: 'image', attrs: { src: 'image.png' } },
        { type: 'paragraph', content: [{ type: 'hardBreak' }] },
      ])
    })

    it('reports every overflow outcome for the element and container rectangles', () => {
      const element = document.createElement('div')
      const container = document.createElement('div')
      setRect(container, 10, 30)

      setRect(element, 0, 40)
      expect(getElementOverflowPosition(element, container)).toBe('both')
      setRect(element, 0, 20)
      expect(getElementOverflowPosition(element, container)).toBe('top')
      setRect(element, 20, 40)
      expect(getElementOverflowPosition(element, container)).toBe('bottom')
      setRect(element, 12, 28)
      expect(getElementOverflowPosition(element, container)).toBe('none')
    })

    it('uses known and fallback node display names for node, cell, and text selections', () => {
      const paragraphDoc = schema.nodes.doc.create(null, paragraph('text'))
      const paragraphState = EditorState.create({
        schema,
        doc: paragraphDoc,
        selection: NodeSelection.create(paragraphDoc, 0),
      })
      const imageDoc = schema.nodes.doc.create(null, schema.nodes.image.create())
      const imageState = EditorState.create({
        schema,
        doc: imageDoc,
        selection: NodeSelection.create(imageDoc, 0),
      })
      const tableDoc = createTableDocument()
      const tableState = EditorState.create({
        schema,
        doc: tableDoc,
        selection: CellSelection.create(tableDoc, 2),
      })
      const codeDoc = schema.nodes.doc.create(
        null,
        schema.nodes.codeBlock.create(null, schema.text('code')),
      )
      const codeState = EditorState.create({
        schema,
        doc: codeDoc,
        selection: TextSelection.create(codeDoc, 1),
      })

      expect(getNodeDisplayName(null)).toBe('Node')
      expect(getNodeDisplayName(createEditor(paragraphState))).toBe('Text')
      expect(getNodeDisplayName(createEditor(imageState))).toBe('image')
      expect(getNodeDisplayName(createEditor(tableState))).toBe('Table')
      expect(getNodeDisplayName(createEditor(codeState))).toBe('Code Block')
    })

    it('finds the closest non-empty block above the cursor', () => {
      const doc = schema.nodes.doc.create(null, [
        paragraph('Nearest content'),
        paragraph('  '),
        paragraph('Cursor'),
      ])
      const cursorPos = doc.child(0).nodeSize + doc.child(1).nodeSize + 1
      const state = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, cursorPos),
      })
      const emptyDoc = schema.nodes.doc.create(null, [paragraph('  '), paragraph()])
      const emptyState = EditorState.create({
        schema,
        doc: emptyDoc,
        selection: TextSelection.create(emptyDoc, emptyDoc.child(0).nodeSize + 1),
      })

      expect(hasContentAbove(null)).toEqual({ hasContent: false, content: '' })
      expect(hasContentAbove(createEditor(state))).toEqual({
        hasContent: true,
        content: 'Nearest content',
      })
      expect(hasContentAbove(createEditor(emptyState))).toEqual({ hasContent: false, content: '' })
    })

    it('detects selected text across block separators and leaf-node null characters', () => {
      const doc = schema.nodes.doc.create(null, [
        paragraph('first'),
        schema.nodes.image.create(),
        paragraph('second'),
      ])
      const state = EditorState.create({ schema, doc, selection: new AllSelection(doc) })
      const whitespaceDoc = schema.nodes.doc.create(null, paragraph('   '))
      const whitespaceState = EditorState.create({
        schema,
        doc: whitespaceDoc,
        selection: TextSelection.create(whitespaceDoc, 1, 4),
      })

      expect(doc.textBetween(state.selection.from, state.selection.to, '\n', '\0')).toContain('\0')
      expect(selectionHasText(createEditor(state))).toBe(true)
      expect(selectionHasText(createEditor(whitespaceState))).toBe(false)
      expect(selectionHasText(null)).toBe(false)
    })
  })

  describe('findSelectionPosition', () => {
    it('prioritizes an explicit position before the supplied node', () => {
      const doc = schema.nodes.doc.create(null, [paragraph('first'), schema.nodes.image.create()])
      const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1) })

      expect(
        findSelectionPosition({ editor: createEditor(state), node: doc.child(1), nodePos: 0 }),
      ).toBe(0)
    })

    it('uses the matching node position, then the empty cursor block fallback', () => {
      const image = schema.nodes.image.create()
      const doc = schema.nodes.doc.create(null, [paragraph('first'), image, paragraph()])
      const imageState = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1),
      })
      const cursorPos = doc.child(0).nodeSize + image.nodeSize + 1
      const cursorState = EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, cursorPos),
      })

      expect(findSelectionPosition({ editor: createEditor(imageState), node: image })).toBe(
        doc.child(0).nodeSize,
      )
      expect(findSelectionPosition({ editor: createEditor(cursorState) })).toBe(
        doc.child(0).nodeSize + image.nodeSize,
      )
    })

    it('returns null for unsupported non-empty selections', () => {
      const doc = schema.nodes.doc.create(null, paragraph('text'))
      const state = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 1, 3) })

      expect(findSelectionPosition({ editor: createEditor(state) })).toBeNull()
    })
  })
})
