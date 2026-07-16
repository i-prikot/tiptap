import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Suggestion } from '../../../src/editor/utils/suggestion/plugin'
import {
  createSuggestionClientRect,
  createSuggestionMount,
} from '../../../src/editor/utils/suggestion/positioning'
import { createSuggestionPluginState } from '../../../src/editor/utils/suggestion/state'

const floatingUi = vi.hoisted(() => ({
  autoUpdate: vi.fn(),
  computePosition: vi.fn(),
  flip: vi.fn(() => ({ name: 'flip' })),
  offset: vi.fn(() => ({ name: 'offset' })),
}))

vi.mock('@floating-ui/dom', () => floatingUi)

function createEditor(): Editor {
  const element = document.createElement('div')
  document.body.append(element)

  return new Editor({
    element,
    extensions: [StarterKit],
    content: '<p></p>',
  })
}

async function flushUpdates(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  floatingUi.autoUpdate.mockImplementation((_reference, _floating, update) => {
    update()
    return vi.fn()
  })
  floatingUi.computePosition.mockResolvedValue({
    x: 12,
    y: 24,
    placement: 'bottom-start',
    strategy: 'absolute',
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('extracted suggestion runtime modules', () => {
  it('runs the extracted plugin lifecycle and resolves item loading', async () => {
    const editor = createEditor()
    const key = new PluginKey('suggestion-runtime-plugin')
    const events: Array<{ phase: 'start' | 'update'; loading: boolean; query: string }> = []
    const plugin = Suggestion<string>({
      editor,
      pluginKey: key,
      items: async ({ query }) => [`result:${query}`],
      render: () => ({
        onStart: (props) =>
          events.push({ phase: 'start', loading: props.loading, query: props.query }),
        onUpdate: (props) =>
          events.push({ phase: 'update', loading: props.loading, query: props.query }),
      }),
    })

    try {
      editor.registerPlugin(plugin)
      editor.commands.insertContent('@item')
      await flushUpdates()

      expect(events).toContainEqual({ phase: 'start', loading: true, query: 'item' })
      expect(events).toContainEqual({ phase: 'update', loading: false, query: 'item' })
    } finally {
      editor.destroy()
    }
  })

  it('preserves the active range as dismissed state on an explicit exit', () => {
    const editor = createEditor()
    const pluginKey = new PluginKey('suggestion-runtime-state')
    const stateField = createSuggestionPluginState({
      pluginKey,
      editor,
      char: '@',
      allowSpaces: false,
      allowToIncludeChar: false,
      allowedPrefixes: [' '],
      startOfLine: false,
      findSuggestionMatch: () => ({ range: { from: 1, to: 5 }, query: 'item', text: '@item' }),
      allow: () => true,
      shouldKeepDismissed: () => true,
    })

    try {
      const activeState = {
        ...stateField.init(),
        active: true,
        decorationId: 'suggestion-id',
        query: 'item',
        range: { from: 1, to: 5 },
        text: '@item',
      }
      const transaction = editor.state.tr.setMeta(pluginKey, { exit: true })
      const nextState = stateField.apply(transaction, activeState, editor.state, editor.state)

      expect(nextState).toMatchObject({
        active: false,
        decorationId: null,
        dismissedRange: { from: 1, to: 5 },
        query: null,
        range: { from: 0, to: 0 },
        text: null,
      })
    } finally {
      editor.destroy()
    }
  })

  it('positions detached mounts, dismisses outside clicks, and cleans up listeners', async () => {
    const container = document.createElement('div')
    const contextElement = document.createElement('div')
    const floatingElement = document.createElement('div')
    const onExit = vi.fn()
    const stopAutoUpdate = vi.fn()
    document.body.append(container, contextElement)
    floatingUi.autoUpdate.mockImplementation((_reference, _floating, update) => {
      update()
      return stopAutoUpdate
    })

    const mount = createSuggestionMount({
      getReferenceRect: () => new DOMRect(10, 20, 30, 40),
      contextElement,
      floatingUi: { placement: 'bottom-start', strategy: 'absolute', middleware: [] },
      container: '#suggestion-runtime-container',
      dismissOnOutsideClick: true,
      onExit,
    })
    container.id = 'suggestion-runtime-container'

    const cleanup = mount(floatingElement)
    await flushUpdates()

    expect(floatingElement.parentElement).toBe(container)
    expect(floatingElement.style).toMatchObject({
      left: '12px',
      position: 'absolute',
      top: '24px',
      visibility: '',
      width: 'max-content',
    })

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(onExit).toHaveBeenCalledOnce()

    cleanup()
    expect(stopAutoUpdate).toHaveBeenCalledOnce()
    expect(floatingElement.isConnected).toBe(false)

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('returns null when DOMRect construction is unavailable for cursor fallback', () => {
    const editor = {
      state: { selection: { $anchor: { pos: 7 } } },
      view: { coordsAtPos: () => ({ top: 10, right: 30, bottom: 25, left: 5 }) },
    } as unknown as Editor
    vi.stubGlobal(
      'DOMRect',
      class {
        constructor() {
          throw new Error('DOMRect is unavailable')
        }
      },
    )

    const clientRect = createSuggestionClientRect({
      editor,
      view: { dom: document.createElement('div') } as unknown as EditorView,
      decorationNode: null,
      getDecorationId: () => null,
    })

    expect(clientRect()).toBeNull()
  })
})
