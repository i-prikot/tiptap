import type { Editor } from '@tiptap/core'
import { Schema, type NodeSpec } from '@tiptap/pm/model'
import { EditorState, NodeSelection, TextSelection, type Selection } from '@tiptap/pm/state'
import { describe, expect, it, vi } from 'vitest'
import {
  addEmojiTrigger,
  addMentionTrigger,
  addSlashTrigger,
} from '../../../src/editor/utils/trigger-utils'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { content: 'inline*', group: 'block' },
    image: { atom: true, group: 'block', selectable: true },
    widget: { atom: true, group: 'block', selectable: true },
  } as Record<string, NodeSpec>,
  marks: {},
})

interface ChainCall {
  args: unknown[]
  method: 'focus' | 'insertContent' | 'insertContentAt'
}

interface TriggerHarness {
  chainCalls: ChainCall[]
  dispatch: ReturnType<typeof vi.fn>
  editor: Editor
  focus: ReturnType<typeof vi.fn>
  insertText: ReturnType<typeof vi.fn>
  run: ReturnType<typeof vi.fn>
}

function paragraph(text = '') {
  return schema.nodes.paragraph.create(null, text ? schema.text(text) : undefined)
}

function createTriggerHarness({
  doc,
  selection,
  editable = true,
  runResult = true,
}: {
  doc: ReturnType<typeof schema.nodes.doc.create>
  selection: Selection
  editable?: boolean
  runResult?: boolean
}): TriggerHarness {
  const chainCalls: ChainCall[] = []
  const run = vi.fn(() => runResult)
  const chain = {
    focus: vi.fn((...args: unknown[]) => {
      chainCalls.push({ method: 'focus', args })
      return chain
    }),
    insertContent: vi.fn((...args: unknown[]) => {
      chainCalls.push({ method: 'insertContent', args })
      return chain
    }),
    insertContentAt: vi.fn((...args: unknown[]) => {
      chainCalls.push({ method: 'insertContentAt', args })
      return chain
    }),
    run,
  }
  const insertText = vi.fn()
  const transaction = {
    insertText: vi.fn((...args: unknown[]) => {
      insertText(...args)
      return transaction
    }),
    scrollIntoView: vi.fn(() => transaction),
  }
  const dispatch = vi.fn()
  const focus = vi.fn()
  const state = { doc, selection }
  const editor = {
    chain: vi.fn(() => chain),
    commands: { focus },
    isEditable: editable,
    state,
    view: {
      dispatch,
      state: { tr: transaction },
    },
  } as unknown as Editor

  return { chainCalls, dispatch, editor, focus, insertText, run }
}

function createInlineHarness(
  text: string,
  cursorOffset: number,
  options: { editable?: boolean } = {},
) {
  const doc = schema.nodes.doc.create(null, paragraph(text))
  const state = EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, cursorOffset + 1),
  })

  return createTriggerHarness({ doc, selection: state.selection, ...options })
}

function createParagraphSelection(after: number) {
  return {
    $from: {
      after: () => after,
      node: () => schema.nodes.widget,
    },
    empty: false,
  } as unknown as Selection
}

const paragraphTriggerContent = (trigger: string) => ({
  type: 'paragraph',
  content: [{ type: 'text', text: trigger }],
})

describe('trigger utilities', () => {
  describe('inline', () => {
    it.each([
      ['emoji default', addEmojiTrigger, ':'],
      ['emoji custom', (editor: Editor) => addEmojiTrigger(editor, '😀'), '😀'],
      ['mention default', addMentionTrigger, '@'],
      ['mention custom', (editor: Editor) => addMentionTrigger(editor, '#'), '#'],
      ['slash default', addSlashTrigger, '/'],
      ['slash custom', (editor: Editor) => addSlashTrigger(editor, '>'), '>'],
    ] as const)(
      'inserts the %s wrapper trigger through the shared inline chain',
      (_, add, trigger) => {
        const harness = createInlineHarness('', 0)

        expect(add(harness.editor)).toBe(true)
        expect(harness.chainCalls).toEqual([
          { method: 'insertContent', args: [{ type: 'text', text: trigger }] },
          { method: 'focus', args: [] },
        ])
        expect(harness.run).toHaveBeenCalledOnce()
      },
    )

    it('adds a leading space only when the preceding inline text is not a space', () => {
      const withoutSpace = createInlineHarness('word', 4)
      const withSpace = createInlineHarness('word ', 5)

      expect(addEmojiTrigger(withoutSpace.editor)).toBe(true)
      expect(addEmojiTrigger(withSpace.editor)).toBe(true)
      expect(withoutSpace.chainCalls[0]).toEqual({
        method: 'insertContent',
        args: [{ type: 'text', text: ' :' }],
      })
      expect(withSpace.chainCalls[0]).toEqual({
        method: 'insertContent',
        args: [{ type: 'text', text: ':' }],
      })
    })

    it('dispatches target-node and target-position inline transactions at their resolved positions', () => {
      const nonEmptyTarget = paragraph('body')
      const nonEmptyDoc = schema.nodes.doc.create(null, nonEmptyTarget)
      const nonEmptyState = EditorState.create({
        schema,
        doc: nonEmptyDoc,
        selection: TextSelection.create(nonEmptyDoc, 1),
      })
      const nonEmpty = createTriggerHarness({
        doc: nonEmptyDoc,
        selection: nonEmptyState.selection,
      })
      const emptyTarget = paragraph()
      const emptyDoc = schema.nodes.doc.create(null, emptyTarget)
      const emptyState = EditorState.create({
        schema,
        doc: emptyDoc,
        selection: TextSelection.create(emptyDoc, 1),
      })
      const empty = createTriggerHarness({ doc: emptyDoc, selection: emptyState.selection })

      expect(addMentionTrigger(nonEmpty.editor, '@', nonEmptyTarget)).toBe(true)
      expect(nonEmpty.insertText).toHaveBeenCalledWith(
        '@',
        nonEmptyTarget.nodeSize,
        nonEmptyTarget.nodeSize,
      )
      expect(nonEmpty.dispatch).toHaveBeenCalledOnce()
      expect(nonEmpty.focus).toHaveBeenCalledWith(nonEmptyTarget.nodeSize + 2)

      expect(addMentionTrigger(empty.editor, '@', undefined, 0)).toBe(true)
      expect(empty.insertText).toHaveBeenCalledWith('@', 0, 0)
      expect(empty.dispatch).toHaveBeenCalledOnce()
      expect(empty.focus).toHaveBeenCalledWith(2)
    })
  })

  describe('paragraph', () => {
    it('inserts a paragraph after a non-text block and preserves the chain run result', () => {
      const widget = schema.nodes.widget.create()
      const doc = schema.nodes.doc.create(null, widget)
      const harness = createTriggerHarness({
        doc,
        selection: createParagraphSelection(widget.nodeSize),
        runResult: false,
      })

      expect(addSlashTrigger(harness.editor)).toBe(false)
      expect(harness.chainCalls).toEqual([
        { method: 'insertContentAt', args: [widget.nodeSize, paragraphTriggerContent('/')] },
        { method: 'focus', args: [] },
      ])
      expect(harness.run).toHaveBeenCalledOnce()
    })

    it('reuses an explicit empty paragraph target and focuses after its trigger text', () => {
      const emptyTarget = paragraph()
      const widget = schema.nodes.widget.create()
      const doc = schema.nodes.doc.create(null, [emptyTarget, widget])
      const harness = createTriggerHarness({
        doc,
        selection: createParagraphSelection(emptyTarget.nodeSize + widget.nodeSize),
      })

      expect(addEmojiTrigger(harness.editor, ':', emptyTarget)).toBe(true)
      expect(harness.chainCalls).toEqual([
        { method: 'insertContentAt', args: [0, paragraphTriggerContent(':')] },
        { method: 'focus', args: [2] },
      ])
    })
  })

  describe('guard', () => {
    it('returns false without mutations for missing, non-editable, and image-selected editors', () => {
      const nonEditable = createInlineHarness('text', 4, { editable: false })
      const imageDoc = schema.nodes.doc.create(null, schema.nodes.image.create())
      const imageState = EditorState.create({
        schema,
        doc: imageDoc,
        selection: NodeSelection.create(imageDoc, 0),
      })
      const image = createTriggerHarness({ doc: imageDoc, selection: imageState.selection })

      expect(addEmojiTrigger(null)).toBe(false)
      expect(addEmojiTrigger(nonEditable.editor)).toBe(false)
      expect(addEmojiTrigger(image.editor)).toBe(false)
      expect(nonEditable.chainCalls).toEqual([])
      expect(image.chainCalls).toEqual([])
      expect(image.dispatch).not.toHaveBeenCalled()
    })

    it('returns false when an insertion boundary throws', () => {
      const harness = createInlineHarness('text', 4)
      vi.mocked(harness.editor.chain).mockImplementation(() => {
        throw new Error('chain unavailable')
      })

      expect(addEmojiTrigger(harness.editor)).toBe(false)
      expect(harness.chainCalls).toEqual([])
    })
  })

  describe('unresolved', () => {
    it('returns false without mutations when a requested target node is absent from the document', () => {
      const harness = createInlineHarness('text', 4)
      const absentNode = paragraph('absent')

      expect(addMentionTrigger(harness.editor, '@', absentNode)).toBe(false)
      expect(harness.chainCalls).toEqual([])
      expect(harness.dispatch).not.toHaveBeenCalled()
    })
  })
})
