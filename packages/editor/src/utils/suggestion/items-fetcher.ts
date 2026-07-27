import type { Editor } from '@tiptap/core'
import type { SuggestionOptions } from './types'

type ItemsProvider<Item> = NonNullable<SuggestionOptions<Item>['items']>

export function createSuggestionItemsFetcher<Item>(items: ItemsProvider<Item>, editor: Editor) {
  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let resolveWait: (() => void) | null = null

  const abort = () => {
    controller?.abort()
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    resolveWait?.()
    resolveWait = null
    controller = null
  }

  const fetchItems = async (
    query: string,
    delay: number,
  ): Promise<{ status: 'aborted' | 'error' } | { status: 'resolved'; items: Item[] }> => {
    abort()
    const current = (controller = new AbortController())
    if (delay > 0) {
      await new Promise<void>((resolve) => {
        resolveWait = resolve
        timer = setTimeout(() => {
          timer = null
          const pending = resolveWait
          resolveWait = null
          pending?.()
        }, delay)
      })
    }
    if (controller !== current || current.signal.aborted) return { status: 'aborted' }
    try {
      const result = await items({ editor, query, signal: current.signal })
      if (controller !== current || current.signal.aborted) return { status: 'aborted' }
      return { status: 'resolved', items: result }
    } catch {
      if (controller !== current || current.signal.aborted) return { status: 'aborted' }
      return { status: 'error' }
    }
  }

  return { abort, fetch: fetchItems }
}
