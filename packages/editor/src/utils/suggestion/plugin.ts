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

/**
 * Создаёт расширенный ProseMirror suggestion-плагин.
 *
 * Плагин связывает reducer активного триггера, inline-декорацию, renderer и
 * floating-ui. На поведение влияют правила поиска (`char`, пробелы, префиксы),
 * selection/composition, `minQueryLength`, `debounce`, renderer callbacks и
 * параметры позиционирования. Он не изменяет документ сам по себе: выбор
 * пункта передаётся в пользовательский `command`.
 *
 * @remarks Renderer должен использовать cleanup от `props.mount()` и быть
 * устойчивым к поздним асинхронным обновлениям после закрытия меню.
 */
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

  /**
   * Закрывает текущее предложение через meta-транзакцию.
   *
   * Reducer сбрасывает активные поля и запоминает диапазон как dismissed, а
   * view lifecycle отменяет загрузку. Это не удаляет триггер и не меняет
   * selection напрямую.
   */
  const dispatchExit = (view: EditorView) => {
    view.dispatch(view.state.tr.setMeta(pluginKey, { exit: true }))
  }

  /**
   * Создаёт владельца единственной отменяемой и опционально отложенной загрузки.
   *
   * Каждый `fetch` сначала отменяет controller и debounce-таймер предыдущего
   * запроса. Результат помечается `aborted`, если за время ожидания появился
   * новый запрос или был вызван cleanup; ошибки источника не прерывают lifecycle
   * плагина и возвращаются как `error` без набора items.
   */
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

  /**
   * Определяет, остаётся ли текущий матч скрытым после Escape.
   *
   * Пользовательский `shouldResetDismissed` имеет приоритет. Иначе запрос с
   * пробелами остаётся подавленным, пока не сменится начало диапазона; запрос
   * без пробелов снова разрешается после изменения, вставляющего пробел. Такая
   * проверка намеренно зависит от шагов транзакции, а не только от текста.
   */
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

    /**
     * Владеет renderer-снимком, загрузчиком items и cleanup при уничтожении
     * plugin view. Асинхронные результаты сверяются с последним plugin state:
     * после выхода или отмены они не передаются renderer-у.
     */
    view() {
      let currentProps: SuggestionProps<Item, SelectedProps> | undefined
      const fetcher = createItemsFetcher()

      /**
       * Передаёт renderer-у только определённые переходы lifecycle.
       * `stopped` использует предыдущий снимок, поскольку новое состояние уже
       * очищено reducer-ом и не содержит диапазон закрываемого меню.
       */
      const emit = (
        phase: 'started' | 'updated' | 'stopped',
        props: SuggestionProps<Item, SelectedProps>,
      ) => {
        if (phase === 'started') renderer?.onStart?.(props)
        else if (phase === 'updated') renderer?.onUpdate?.(props)
        else renderer?.onExit?.(props)
      }

      return {
        /**
         * Синхронизирует renderer с изменением plugin state.
         *
         * Обновление запускается при смене активности, запроса, текста,
         * диапазона либо `refreshId`. Для короткого запроса декорация остаётся
         * активной, но загрузчик отменяется. Геометрия берётся из декорации или
         * fallback курсора и может вернуть `null`; renderer не должен считать
         * DOM-якорь постоянным между транзакциями.
         */
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
