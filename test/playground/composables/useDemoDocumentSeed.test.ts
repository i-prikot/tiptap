import type { Editor } from '@tiptap/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultContent } from '../../../src/playground/content/default-content'
import { useDemoDocumentSeed } from '../../../src/playground/composables/useDemoDocumentSeed'

interface ChainCall {
  method: 'setMeta' | 'setContent' | 'focus'
  args: unknown[]
}

interface FakeChain {
  setMeta: (key: string, value: unknown) => FakeChain
  setContent: (content: unknown) => FakeChain
  focus: (position: string, options: { scrollIntoView: boolean }) => FakeChain
  run: () => boolean
}

interface FakeEditor {
  isEmpty: boolean
  chain: () => FakeChain
  on: (event: string, callback: () => void) => void
  off: (event: string, callback: () => void) => void
}

interface EditorHarness {
  editor: Editor
  chainCalls: ChainCall[][]
  emitUpdate: () => void
}

const documentId = 'demo-document-seed-test'

function createEditorHarness(isEmpty = true): EditorHarness {
  const chainCalls: ChainCall[][] = []
  const updateCallbacks: Array<() => void> = []

  const editor: FakeEditor = {
    isEmpty,
    chain: () => {
      const calls: ChainCall[] = []
      const chain: FakeChain = {
        setMeta: (key, value) => {
          calls.push({ method: 'setMeta', args: [key, value] })
          return chain
        },
        setContent: (content) => {
          calls.push({ method: 'setContent', args: [content] })
          editor.isEmpty = false
          return chain
        },
        focus: (position, options) => {
          calls.push({ method: 'focus', args: [position, options] })
          return chain
        },
        run: () => true,
      }
      chainCalls.push(calls)
      return chain
    },
    on: (event, callback) => {
      if (event === 'update') updateCallbacks.push(callback)
    },
    off: (event, callback) => {
      if (event !== 'update') return
      const callbackIndex = updateCallbacks.indexOf(callback)
      if (callbackIndex >= 0) updateCallbacks.splice(callbackIndex, 1)
    },
  }

  return {
    editor: editor as unknown as Editor,
    chainCalls,
    emitUpdate: () => updateCallbacks.forEach((callback) => callback()),
  }
}

function expectSeededDefaultContent(chainCalls: ChainCall[][]) {
  expect(chainCalls).toEqual([
    [
      { method: 'setMeta', args: ['addToHistory', false] },
      { method: 'setContent', args: [defaultContent] },
    ],
    [{ method: 'focus', args: ['start', { scrollIntoView: true }] }],
  ])
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('useDemoDocumentSeed', () => {
  it('seeds an empty, uninteracted document without history and focuses its start', () => {
    const { editor, chainCalls } = createEditorHarness()
    const { initializeDemoDocumentSeed } = useDemoDocumentSeed(documentId)

    initializeDemoDocumentSeed(editor)

    expectSeededDefaultContent(chainCalls)
    expect(localStorage.getItem(`hasInteracted-${documentId}`)).toBeNull()
  })

  it.each([
    ['an empty document that was previously interacted with', true, true],
    ['a non-empty document that was not previously interacted with', false, false],
  ])('does not seed or focus %s', (_state, isEmpty, hasInteracted) => {
    if (hasInteracted) localStorage.setItem(`hasInteracted-${documentId}`, 'true')
    const { editor, chainCalls } = createEditorHarness(isEmpty)
    const { initializeDemoDocumentSeed } = useDemoDocumentSeed(documentId)

    initializeDemoDocumentSeed(editor)

    expect(chainCalls).toEqual([])
  })

  it('stores the interaction key after a later non-empty update', () => {
    const { editor, emitUpdate } = createEditorHarness()
    const { initializeDemoDocumentSeed } = useDemoDocumentSeed(documentId)

    initializeDemoDocumentSeed(editor)
    expect(localStorage.getItem(`hasInteracted-${documentId}`)).toBeNull()

    emitUpdate()

    expect(localStorage.getItem(`hasInteracted-${documentId}`)).toBe('true')
  })

  it('detaches the update listener when cleaned up', () => {
    const { editor, emitUpdate } = createEditorHarness()
    const { cleanupDemoDocumentSeed, initializeDemoDocumentSeed } = useDemoDocumentSeed(documentId)

    initializeDemoDocumentSeed(editor)
    cleanupDemoDocumentSeed()
    cleanupDemoDocumentSeed()
    emitUpdate()

    expect(localStorage.getItem(`hasInteracted-${documentId}`)).toBeNull()
  })
})
