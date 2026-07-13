import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { PluginKey, TextSelection } from '@tiptap/pm/state'
import { DecorationSet } from '@tiptap/pm/view'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  Suggestion,
  type SuggestionOptions,
  type SuggestionProps,
} from '../../../src/editor/utils/suggestion/suggestion'

interface SuggestionState {
  active: boolean
  dismissedRange: { from: number; to: number } | null
  query: string | null
  range: { from: number; to: number }
}

interface RendererEvent {
  items: string[]
  loading: boolean
  phase: 'exit' | 'start' | 'update'
  query: string
}

interface SuggestionHarness {
  editor: Editor
  events: RendererEvent[]
  key: PluginKey<SuggestionState>
  keyDown: ReturnType<typeof vi.fn>
  plugin: ReturnType<typeof Suggestion<string>>
}

interface Deferred<Value> {
  promise: Promise<Value>
  reject: (reason?: unknown) => void
  resolve: (value: Value) => void
}

function deferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

function rendererEvent(
  phase: RendererEvent['phase'],
  props: SuggestionProps<string>,
): RendererEvent {
  return {
    phase,
    query: props.query,
    items: [...props.items],
    loading: props.loading,
  }
}

function createSuggestionHarness(
  options: Omit<SuggestionOptions<string>, 'editor' | 'pluginKey' | 'render'> = {},
): SuggestionHarness {
  const element = document.createElement('div')
  document.body.append(element)

  const editor = new Editor({
    element,
    extensions: [StarterKit],
    content: '<p></p>',
  })
  const events: RendererEvent[] = []
  const keyDown = vi.fn(() => false)
  const key = new PluginKey<SuggestionState>()
  const plugin = Suggestion<string>({
    ...options,
    editor,
    pluginKey: key,
    render: () => ({
      onKeyDown: keyDown,
      onExit: (props) => events.push(rendererEvent('exit', props)),
      onStart: (props) => events.push(rendererEvent('start', props)),
      onUpdate: (props) => events.push(rendererEvent('update', props)),
    }),
  })

  editor.registerPlugin(plugin)

  return { editor, events, key, keyDown, plugin }
}

function getState(harness: SuggestionHarness): SuggestionState {
  const state = harness.key.getState(harness.editor.state)
  if (!state) throw new Error('Suggestion plugin state is unavailable')
  return state
}

function getDecorations(harness: SuggestionHarness) {
  return harness.plugin.props.decorations?.call(harness.plugin, harness.editor.state)
}

function decorationCount(harness: SuggestionHarness) {
  const decorations = getDecorations(harness)
  return decorations instanceof DecorationSet ? decorations.find().length : 0
}

function typeText(harness: SuggestionHarness, text: string) {
  harness.editor.commands.insertContent(text)
}

function dismissWithEscape(harness: SuggestionHarness) {
  return harness.plugin.props.handleKeyDown?.call(
    harness.plugin,
    harness.editor.view,
    new KeyboardEvent('keydown', { key: 'Escape' }),
  )
}

function lastEvent(harness: SuggestionHarness) {
  return harness.events[harness.events.length - 1]
}

async function flushSuggestionUpdates() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('Suggestion plugin', () => {
  it('creates an active match and inline decoration for a trigger query', async () => {
    const harness = createSuggestionHarness()

    try {
      typeText(harness, '@al')
      await flushSuggestionUpdates()

      expect(getState(harness)).toMatchObject({
        active: true,
        range: { from: 1, to: 4 },
        query: 'al',
      })
      expect(decorationCount(harness)).toBe(1)
      expect(harness.events).toContainEqual({
        phase: 'start',
        query: 'al',
        items: [],
        loading: true,
      })
    } finally {
      harness.editor.destroy()
    }
  })

  it('transitions active → dismissed when Escape exits the plugin', async () => {
    const harness = createSuggestionHarness()

    try {
      typeText(harness, '@al')
      await flushSuggestionUpdates()

      const handled = dismissWithEscape(harness)

      expect(handled).toBe(true)
      expect(harness.keyDown).toHaveBeenCalledOnce()
      expect(harness.keyDown).toHaveBeenCalledWith(
        expect.objectContaining({ range: { from: 1, to: 4 } }),
      )
      expect(getState(harness)).toMatchObject({
        active: false,
        dismissedRange: { from: 1, to: 4 },
        query: null,
      })
      expect(getDecorations(harness)).toBeNull()
    } finally {
      harness.editor.destroy()
    }
  })

  it('keeps dismissed → mapped queries hidden and resets after whitespace', async () => {
    const harness = createSuggestionHarness()

    try {
      typeText(harness, ' @al')
      await flushSuggestionUpdates()
      dismissWithEscape(harness)

      const transaction = harness.editor.state.tr.insertText('x', 1)
      transaction.setSelection(
        TextSelection.create(transaction.doc, transaction.doc.content.size - 1),
      )
      harness.editor.view.dispatch(transaction)
      await flushSuggestionUpdates()

      expect(getState(harness)).toMatchObject({
        active: false,
        dismissedRange: { from: 3, to: 6 },
        query: null,
      })
      expect(getDecorations(harness)).toBeNull()

      typeText(harness, ' ')
      await flushSuggestionUpdates()

      expect(getState(harness).dismissedRange).toBeNull()

      typeText(harness, '@ok')
      await flushSuggestionUpdates()

      expect(getState(harness)).toMatchObject({
        active: true,
        dismissedRange: null,
        query: 'ok',
      })
    } finally {
      harness.editor.destroy()
    }
  })

  it('retains initial items below minQueryLength and fetches at the threshold', async () => {
    const items = vi.fn(async ({ query }: { query: string }) => [`result:${query}`])
    const harness = createSuggestionHarness({
      initialItems: ['initial'],
      items,
      minQueryLength: 2,
    })

    try {
      typeText(harness, '@')
      await flushSuggestionUpdates()
      typeText(harness, 'a')
      await flushSuggestionUpdates()

      expect(getState(harness)).toMatchObject({ active: true, query: 'a' })
      expect(items).not.toHaveBeenCalled()
      expect(lastEvent(harness)).toEqual({
        phase: 'update',
        query: 'a',
        items: ['initial'],
        loading: false,
      })

      typeText(harness, 'b')
      await flushSuggestionUpdates()

      expect(items).toHaveBeenCalledOnce()
      expect(items).toHaveBeenCalledWith(
        expect.objectContaining({
          editor: harness.editor,
          query: 'ab',
          signal: expect.any(AbortSignal),
        }),
      )
      expect(lastEvent(harness)).toEqual({
        phase: 'update',
        query: 'ab',
        items: ['result:ab'],
        loading: false,
      })
    } finally {
      harness.editor.destroy()
    }
  })

  it('waits for the configured debounce delay before requesting items', async () => {
    vi.useFakeTimers()
    const items = vi.fn(async ({ query }: { query: string }) => [`result:${query}`])
    const harness = createSuggestionHarness({ debounce: 50, items })

    try {
      typeText(harness, '@al')
      await flushSuggestionUpdates()

      await vi.advanceTimersByTimeAsync(49)
      expect(items).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      await flushSuggestionUpdates()

      expect(items).toHaveBeenCalledOnce()
      expect(items).toHaveBeenCalledWith(
        expect.objectContaining({
          editor: harness.editor,
          query: 'al',
          signal: expect.any(AbortSignal),
        }),
      )
      expect(lastEvent(harness)).toEqual({
        phase: 'update',
        query: 'al',
        items: ['result:al'],
        loading: false,
      })
    } finally {
      harness.editor.destroy()
    }
  })

  it('cancels a pending debounce before its provider request begins', async () => {
    vi.useFakeTimers()
    const items = vi.fn(async ({ query }: { query: string }) => [`result:${query}`])
    const harness = createSuggestionHarness({ debounce: 50, items })

    try {
      typeText(harness, '@a')
      await flushSuggestionUpdates()
      await vi.advanceTimersByTimeAsync(25)

      typeText(harness, 'b')
      await flushSuggestionUpdates()
      await vi.advanceTimersByTimeAsync(25)

      expect(items).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(25)
      await flushSuggestionUpdates()

      expect(items).toHaveBeenCalledOnce()
      expect(items).toHaveBeenCalledWith(expect.objectContaining({ query: 'ab' }))
      expect(lastEvent(harness)).toEqual({
        phase: 'update',
        query: 'ab',
        items: ['result:ab'],
        loading: false,
      })
    } finally {
      harness.editor.destroy()
    }
  })

  it('aborts stale requests and publishes only the latest debounced result', async () => {
    vi.useFakeTimers()
    const stale = deferred<string[]>()
    const signals: Array<{ query: string; signal: AbortSignal | undefined }> = []
    const items = vi.fn(({ query, signal }: { query: string; signal?: AbortSignal }) => {
      signals.push({ query, signal })
      return query === 'a' ? stale.promise : Promise.resolve(['latest'])
    })
    const harness = createSuggestionHarness({ debounce: 50, items })

    try {
      typeText(harness, '@a')
      await flushSuggestionUpdates()
      await vi.advanceTimersByTimeAsync(50)
      await flushSuggestionUpdates()

      expect(items).toHaveBeenCalledWith(expect.objectContaining({ query: 'a' }))
      expect(signals[0]?.signal?.aborted).toBe(false)

      typeText(harness, 'b')
      await flushSuggestionUpdates()

      expect(signals[0]?.signal?.aborted).toBe(true)

      stale.resolve(['stale'])
      await flushSuggestionUpdates()
      expect(harness.events).not.toContainEqual(
        expect.objectContaining({ items: ['stale'], loading: false }),
      )

      await vi.advanceTimersByTimeAsync(50)
      await flushSuggestionUpdates()

      expect(items).toHaveBeenCalledTimes(2)
      expect(items).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'ab' }))
      expect(lastEvent(harness)).toEqual({
        phase: 'update',
        query: 'ab',
        items: ['latest'],
        loading: false,
      })
    } finally {
      harness.editor.destroy()
    }
  })

  it('clears loading after an item-provider rejection without publishing stale items', async () => {
    const items = vi.fn(() => Promise.reject(new Error('provider unavailable')))
    const harness = createSuggestionHarness({ initialItems: ['initial'], items })

    try {
      typeText(harness, '@error')
      await flushSuggestionUpdates()

      expect(items).toHaveBeenCalledOnce()
      expect(lastEvent(harness)).toEqual({
        phase: 'update',
        query: 'error',
        items: ['initial'],
        loading: false,
      })
    } finally {
      harness.editor.destroy()
    }
  })
})
