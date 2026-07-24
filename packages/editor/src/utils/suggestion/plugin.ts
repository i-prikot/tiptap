import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { createSuggestionDecorations } from './decorations'
import { findSuggestionMatch } from './matching'
import {
  createSuggestionClientRect,
  createSuggestionFloatingUiConfig,
  createSuggestionMount,
} from './positioning'
import { createSuggestionPluginState } from './state'
import type { SuggestionPluginState } from './state'
import type {
  SuggestionMatch,
  SuggestionOptions,
  SuggestionProps,
  SuggestionRenderer,
} from './types'

export const SuggestionPluginKey = new PluginKey('suggestion')

export function Suggestion<Item = unknown, SelectedProps = unknown>(
  options: SuggestionOptions<Item, SelectedProps>,
) {
  const {
    pluginKey = SuggestionPluginKey,
    editor,
    char = '@',
    allowSpaces = false,
    allowToIncludeChar = false,
    allowedPrefixes = [' '],
    startOfLine = false,
    decorationTag = 'span',
    decorationClass = 'suggestion',
    decorationContent = '',
    decorationEmptyClass = 'is-empty',
    command = () => null,
    items = () => [],
    minQueryLength = 0,
    debounce = 0,
    initialItems,
    placement = 'bottom-start',
    offset: offsetOption = {},
    container,
    flip: flipOption = true,
    floatingUi,
    dismissOnOutsideClick = true,
    render = () => ({}),
    allow = () => true,
    findSuggestionMatch: findMatch = findSuggestionMatch,
    shouldShow,
    shouldResetDismissed,
  } = options

  const renderer: SuggestionRenderer<Item, SelectedProps> = render?.() ?? {}
  const effectiveAllowSpaces = allowSpaces && !allowToIncludeChar

  const dispatchExit = (view: EditorView) => {
    view.dispatch(view.state.tr.setMeta(pluginKey, { exit: true }))
  }

  /** Отменяемая (и опционально отложенная) загрузка items. */
  function createItemsFetcher() {
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

  const floatingConfig = createSuggestionFloatingUiConfig({
    placement,
    offset: offsetOption,
    flip: flipOption,
    floatingUi,
  })

  function shouldKeepDismissed(args: {
    match: SuggestionMatch
    dismissedRange: { from: number; to: number }
    state: EditorState
    transaction: Transaction
  }): boolean {
    const { match, dismissedRange, state, transaction } = args
    if (
      shouldResetDismissed?.({
        editor,
        state,
        range: dismissedRange,
        match,
        transaction,
        allowSpaces: effectiveAllowSpaces,
      })
    ) {
      return false
    }
    if (effectiveAllowSpaces) return match.range.from === dismissedRange.from
    return (
      match.range.from === dismissedRange.from &&
      !(
        transaction.docChanged &&
        transaction.steps.some((step) => {
          const slice = (
            step as unknown as { slice?: { content?: import('@tiptap/pm/model').Fragment } }
          ).slice
          if (!slice?.content) return false
          const inserted = slice.content.textBetween(0, slice.content.size, '\n')
          return /\s/.test(inserted)
        })
      )
    )
  }

  return new Plugin<SuggestionPluginState>({
    key: pluginKey,

    view() {
      let currentProps: SuggestionProps<Item, SelectedProps> | undefined
      const fetcher = createItemsFetcher()

      const emit = (
        phase: 'started' | 'updated' | 'stopped',
        props: SuggestionProps<Item, SelectedProps>,
      ) => {
        if (phase === 'started') renderer?.onStart?.(props)
        else if (phase === 'updated') renderer?.onUpdate?.(props)
        else renderer?.onExit?.(props)
      }

      return {
        update: async (view, prevState) => {
          const prev = pluginKey.getState(prevState) as SuggestionPluginState | undefined
          const next = pluginKey.getState(view.state) as SuggestionPluginState | undefined
          if (!prev || !next) return

          let phase: 'started' | 'updated' | 'stopped' | null = null
          const queryChanged = prev.query !== next.query
          const textChanged = prev.text !== next.text
          const rangeChanged =
            prev.range.from !== next.range.from || prev.range.to !== next.range.to
          const refreshChanged = prev.refreshId !== next.refreshId

          if (!prev.active && next.active) phase = 'started'
          else if (prev.active && !next.active) phase = 'stopped'
          else {
            if (!next.active || (!queryChanged && !textChanged && !rangeChanged && !refreshChanged))
              return
            phase = 'updated'
          }

          const state = phase === 'stopped' ? prev : next
          const decorationNode = view.dom.querySelector(
            `[data-decoration-id="${state.decorationId}"]`,
          )
          const referenceRect = createSuggestionClientRect({
            editor,
            view,
            decorationNode,
            getDecorationId: () => {
              const pluginState = pluginKey.getState(editor.state) as
                SuggestionPluginState | undefined
              return pluginState?.decorationId
            },
          })
          const meetsMinQuery =
            minQueryLength === 0 || (!!state.query && state.query.length >= minQueryLength)
          const willLoad = (phase === 'started' || phase === 'updated') && meetsMinQuery

          currentProps = {
            editor,
            range: state.range,
            query: state.query || '',
            text: state.text || '',
            items: initialItems ?? [],
            command: (selectedProps) =>
              command({ editor, range: state.range, props: selectedProps }),
            decorationNode,
            clientRect: referenceRect,
            loading: willLoad,
            placement,
            offset: {
              mainAxis: offsetOption.mainAxis ?? 4,
              crossAxis: offsetOption.crossAxis ?? 0,
            },
            container,
            flip: flipOption,
            floatingUi: floatingConfig,
            mount: createSuggestionMount({
              getReferenceRect: referenceRect,
              contextElement: view.dom as HTMLElement,
              floatingUi: floatingConfig,
              container,
              dismissOnOutsideClick,
              onExit: () => dispatchExit(editor.view),
            }),
          }

          if (phase === 'started') renderer?.onBeforeStart?.(currentProps)
          if (phase === 'updated') renderer?.onBeforeUpdate?.(currentProps)
          if (phase === 'started') emit(phase, currentProps)

          if (phase === 'started' || phase === 'updated') {
            if (willLoad) {
              phase = 'updated'
              currentProps = { ...currentProps, items: initialItems ?? [], loading: true }
              emit(phase, currentProps)
              const result = await fetcher.fetch(state.query || '', debounce)
              if (result.status === 'aborted') return
              const latest = pluginKey.getState(view.state) as SuggestionPluginState | undefined
              if (!latest?.active) {
                fetcher.abort()
                return
              }
              currentProps =
                result.status === 'resolved'
                  ? { ...currentProps, items: result.items, loading: false }
                  : { ...currentProps, loading: false }
            } else {
              fetcher.abort()
              currentProps = { ...currentProps, items: initialItems ?? [], loading: false }
            }
          }

          if (phase === 'stopped') {
            fetcher.abort()
            emit(phase, currentProps)
            currentProps = undefined
            return
          }
          if (phase === 'updated') emit(phase, currentProps)
        },
        destroy: () => {
          fetcher.abort()
          if (currentProps) renderer?.onExit?.(currentProps)
        },
      }
    },

    state: createSuggestionPluginState({
      pluginKey,
      editor,
      char,
      allowSpaces: effectiveAllowSpaces,
      allowToIncludeChar,
      allowedPrefixes,
      startOfLine,
      findSuggestionMatch: findMatch,
      allow,
      shouldShow,
      shouldKeepDismissed,
    }),

    props: {
      handleKeyDown(view, event) {
        const state = pluginKey.getState(view.state) as SuggestionPluginState
        if (!state.active) return false
        if (event.key === 'Escape' || event.key === 'Esc') {
          renderer?.onKeyDown?.({ view, event, range: state.range })
          dispatchExit(view)
          return true
        }
        return renderer?.onKeyDown?.({ view, event, range: state.range }) || false
      },
      decorations: createSuggestionDecorations({
        pluginKey,
        decorationTag,
        decorationClass,
        decorationEmptyClass,
        decorationContent,
      }),
    },
  })
}
