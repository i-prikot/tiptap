/**
 * Форк suggestion-плагина из оригинального шаблона (чанк 3qxxh2m8wjeqx,
 * модуль 957800). Отличия от @tiptap/suggestion: dismissedRange
 * (Escape скрывает меню до конца слова), inline-декорация диапазона,
 * debounce/minQueryLength для items, floating-ui `mount`-хелпер.
 */
import type { Editor } from '@tiptap/core'
import { escapeForRegEx } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { ResolvedPos } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { autoUpdate, computePosition, flip, offset } from '@floating-ui/dom'
import type { ComputePositionConfig, Middleware, Placement, Strategy } from '@floating-ui/dom'

export interface SuggestionMatch {
  range: { from: number; to: number }
  query: string
  text: string
}

export interface FindSuggestionMatchConfig {
  char: string
  allowSpaces: boolean
  allowToIncludeChar: boolean
  allowedPrefixes: string[] | null
  startOfLine: boolean
  $position: ResolvedPos
}

/** Ищет активный триггер (`/query`) перед курсором. */
export function findSuggestionMatch(config: FindSuggestionMatchConfig): SuggestionMatch | null {
  const {
    char,
    allowSpaces: allowSpacesOption,
    allowToIncludeChar,
    allowedPrefixes,
    startOfLine,
    $position,
  } = config
  const allowSpaces = allowSpacesOption && !allowToIncludeChar

  const escapedChar = escapeForRegEx(char)
  const suffix = new RegExp(`\\s${escapedChar}$`)
  const prefix = startOfLine ? '^' : ''
  const finalChar = allowToIncludeChar ? '' : escapedChar
  const regexp = allowSpaces
    ? new RegExp(`${prefix}${escapedChar}.*?(?=\\s${finalChar}|$)`, 'gm')
    : new RegExp(`${prefix}(?:^)?${escapedChar}[^\\s${finalChar}]*`, 'gm')

  const text = $position.nodeBefore?.isText && $position.nodeBefore.text
  if (!text) return null

  const textFrom = $position.pos - text.length
  const match = Array.from(text.matchAll(regexp)).pop()
  if (!match || match.input === undefined || match.index === undefined) return null

  // триггер должен начинаться с начала строки либо после допустимого префикса
  const matchPrefix = match.input.slice(Math.max(0, match.index - 1), match.index)
  const matchPrefixIsAllowed = new RegExp(`^[${allowedPrefixes?.join('')}\0]?$`).test(matchPrefix)
  if (allowedPrefixes !== null && !matchPrefixIsAllowed) return null

  const from = textFrom + match.index
  let to = from + match[0].length

  if (allowSpaces && suffix.test(text.slice(to - 1, to + 1))) {
    match[0] += ' '
    to += 1
  }

  if (from < $position.pos && to >= $position.pos) {
    return { range: { from, to }, query: match[0].slice(char.length), text: match[0] }
  }
  return null
}

export interface SuggestionProps<Item = unknown, SelectedProps = unknown> {
  editor: Editor
  range: { from: number; to: number }
  query: string
  text: string
  items: Item[]
  command: (props: SelectedProps) => void
  decorationNode: Element | null
  clientRect: (() => DOMRect | null) | null
  loading: boolean
  placement: Placement
  offset: { mainAxis: number; crossAxis: number }
  container?: HTMLElement | string
  flip: boolean
  floatingUi: { placement: Placement; strategy: Strategy; middleware: Middleware[] }
  mount: (element: HTMLElement, options?: MountOptions) => () => void
}

export interface MountOptions {
  onPosition?: (position: {
    x: number
    y: number
    placement: Placement
    strategy: Strategy
  }) => void
  autoUpdate?: Parameters<typeof autoUpdate>[3]
}

export interface SuggestionRenderer<Item = unknown, SelectedProps = unknown> {
  onBeforeStart?: (props: SuggestionProps<Item, SelectedProps>) => void
  onStart?: (props: SuggestionProps<Item, SelectedProps>) => void
  onBeforeUpdate?: (props: SuggestionProps<Item, SelectedProps>) => void
  onUpdate?: (props: SuggestionProps<Item, SelectedProps>) => void
  onExit?: (props: SuggestionProps<Item, SelectedProps>) => void
  onKeyDown?: (props: {
    view: EditorView
    event: KeyboardEvent
    range: { from: number; to: number }
  }) => boolean | void
}

export interface SuggestionOptions<Item = unknown, SelectedProps = unknown> {
  pluginKey?: PluginKey
  editor: Editor
  char?: string
  allowSpaces?: boolean
  allowToIncludeChar?: boolean
  allowedPrefixes?: string[] | null
  startOfLine?: boolean
  decorationTag?: string
  decorationClass?: string
  decorationContent?: string
  decorationEmptyClass?: string
  command?: (props: {
    editor: Editor
    range: { from: number; to: number }
    props: SelectedProps
  }) => void
  items?: (props: {
    editor: Editor
    query: string
    signal?: AbortSignal
  }) => Item[] | Promise<Item[]>
  minQueryLength?: number
  debounce?: number
  initialItems?: Item[]
  placement?: Placement
  offset?: { mainAxis?: number; crossAxis?: number }
  container?: HTMLElement | string
  flip?: boolean
  floatingUi?: Partial<ComputePositionConfig> & { middleware?: Middleware[] }
  dismissOnOutsideClick?: boolean
  render?: () => SuggestionRenderer<Item, SelectedProps>
  allow?: (props: {
    editor: Editor
    state: EditorState
    range: { from: number; to: number }
    isActive: boolean
  }) => boolean
  findSuggestionMatch?: typeof findSuggestionMatch
  shouldShow?: (props: {
    editor: Editor
    range: { from: number; to: number }
    query: string
    text: string
    transaction: Transaction
  }) => boolean
  shouldResetDismissed?: (props: {
    editor: Editor
    state: EditorState
    range: { from: number; to: number }
    match: SuggestionMatch
    transaction: Transaction
    allowSpaces: boolean
  }) => boolean
}

interface SuggestionPluginState {
  active: boolean
  range: { from: number; to: number }
  query: string | null
  text: string | null
  composing: boolean
  decorationId?: string | null
  dismissedRange: { from: number; to: number } | null
}

export const SuggestionPluginKey = new PluginKey('suggestion')

function resolveContainer(container: HTMLElement | string | undefined): HTMLElement {
  if (container instanceof HTMLElement) return container
  if (typeof container === 'string') {
    try {
      const found = document.querySelector<HTMLElement>(container)
      if (found) return found
    } catch {
      // невалидный селектор — fallback на body
    }
  }
  return document.body
}

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

  const clientRectFor = (
    view: EditorView,
    decorationNode: Element | null,
  ): (() => DOMRect | null) => {
    if (!decorationNode) {
      return () => {
        const pos = editor.state.selection.$anchor.pos
        const { top, right, bottom, left } = editor.view.coordsAtPos(pos)
        try {
          return new DOMRect(left, top, right - left, bottom - top)
        } catch {
          return null
        }
      }
    }
    return () => {
      const state = pluginKey.getState(editor.state) as SuggestionPluginState | undefined
      const decorationId = state?.decorationId
      const node = view.dom.querySelector(`[data-decoration-id="${decorationId}"]`)
      return node?.getBoundingClientRect() || null
    }
  }

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

  const floatingConfig = (() => {
    const middleware: Middleware[] = [
      offset({ mainAxis: offsetOption.mainAxis ?? 4, crossAxis: offsetOption.crossAxis ?? 0 }),
    ]
    if (flipOption) middleware.push(flip())
    if (floatingUi?.middleware?.length) middleware.push(...floatingUi.middleware)
    return { placement, strategy: floatingUi?.strategy ?? ('absolute' as Strategy), middleware }
  })()

  function createMount(args: {
    getReferenceRect: () => DOMRect | null
    contextElement: HTMLElement
  }): SuggestionProps<Item, SelectedProps>['mount'] {
    const { getReferenceRect, contextElement } = args
    return (element, mountOptions = {}) => {
      let outsideHandler: ((event: PointerEvent) => void) | undefined
      const virtualReference = {
        getBoundingClientRect: () => getReferenceRect() ?? new DOMRect(),
        contextElement,
      }
      let positioned = false
      const detached = !element.isConnected
      if (detached) {
        resolveContainer(container).appendChild(element)
        if (!mountOptions.onPosition) {
          element.style.visibility = 'hidden'
          element.style.width = 'max-content'
        }
      }
      const stopAutoUpdate = autoUpdate(
        virtualReference,
        element,
        () => {
          computePosition(virtualReference, element, {
            placement: floatingConfig.placement,
            strategy: floatingConfig.strategy,
            middleware: floatingConfig.middleware,
          }).then(({ x, y, placement: resolvedPlacement, strategy }) => {
            if (mountOptions.onPosition) {
              mountOptions.onPosition({ x, y, placement: resolvedPlacement, strategy })
            } else {
              Object.assign(element.style, { position: strategy, left: `${x}px`, top: `${y}px` })
              if (!positioned) {
                positioned = true
                element.style.visibility = ''
              }
            }
          })
        },
        mountOptions.autoUpdate,
      )
      if (dismissOnOutsideClick) {
        outsideHandler = (event) => {
          const target = event.target
          if (
            !(target instanceof Node) ||
            element.contains(target) ||
            contextElement.contains(target)
          )
            return
          dispatchExit(editor.view)
        }
        document.addEventListener('pointerdown', outsideHandler, true)
      }
      return () => {
        stopAutoUpdate()
        if (outsideHandler) document.removeEventListener('pointerdown', outsideHandler, true)
        if (detached) element.remove()
      }
    }
  }

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

          if (!prev.active && next.active) phase = 'started'
          else if (prev.active && !next.active) phase = 'stopped'
          else {
            if (!next.active || (!queryChanged && !textChanged && !rangeChanged)) return
            phase = 'updated'
          }

          const state = phase === 'stopped' ? prev : next
          const decorationNode = view.dom.querySelector(
            `[data-decoration-id="${state.decorationId}"]`,
          )
          const referenceRect = clientRectFor(view, decorationNode)
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
            mount: createMount({
              getReferenceRect: referenceRect,
              contextElement: view.dom as HTMLElement,
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

    state: {
      init: () => ({
        active: false,
        range: { from: 0, to: 0 },
        query: null,
        text: null,
        composing: false,
        dismissedRange: null,
      }),
      apply(transaction, prev, _oldState, state) {
        const { isEditable } = editor
        const { composing } = editor.view
        const { selection } = transaction
        const { empty, from } = selection
        const next: SuggestionPluginState = { ...prev }

        const meta = transaction.getMeta(pluginKey)
        if (meta && meta.exit) {
          next.active = false
          next.decorationId = null
          next.range = { from: 0, to: 0 }
          next.query = null
          next.text = null
          next.dismissedRange = prev.active ? { ...prev.range } : prev.dismissedRange
          return next
        }

        next.composing = composing
        if (transaction.docChanged && next.dismissedRange !== null) {
          next.dismissedRange = {
            from: transaction.mapping.map(next.dismissedRange.from),
            to: transaction.mapping.map(next.dismissedRange.to),
          }
        }

        if (isEditable && (empty || editor.view.composing)) {
          if ((from < prev.range.from || from > prev.range.to) && !composing && !prev.composing) {
            next.active = false
          }
          const match = findMatch({
            char,
            allowSpaces: effectiveAllowSpaces,
            allowToIncludeChar,
            allowedPrefixes,
            startOfLine,
            $position: selection.$from,
          })
          const decorationId = `id_${Math.floor(Math.random() * 0xffffffff)}`

          if (
            match &&
            allow({ editor, state, range: match.range, isActive: prev.active }) &&
            (!shouldShow ||
              shouldShow({
                editor,
                range: match.range,
                query: match.query,
                text: match.text,
                transaction,
              }))
          ) {
            if (
              next.dismissedRange !== null &&
              !shouldKeepDismissed({
                match,
                dismissedRange: next.dismissedRange,
                state,
                transaction,
              })
            ) {
              next.dismissedRange = null
            }
            if (next.dismissedRange === null) {
              next.active = true
              next.decorationId = prev.decorationId || decorationId
              next.range = match.range
              next.query = match.query
              next.text = match.text
            } else {
              next.active = false
            }
          } else {
            if (!match) next.dismissedRange = null
            next.active = false
          }
        } else {
          next.active = false
        }

        if (!next.active) {
          next.decorationId = null
          next.range = { from: 0, to: 0 }
          next.query = null
          next.text = null
        }
        return next
      },
    },

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
      decorations(state) {
        const pluginState = pluginKey.getState(state) as SuggestionPluginState
        const { active, range, decorationId, query } = pluginState
        if (!active) return null
        const isEmpty = !query?.length
        const classNames = [decorationClass]
        if (isEmpty) classNames.push(decorationEmptyClass)
        return DecorationSet.create(state.doc, [
          Decoration.inline(range.from, range.to, {
            nodeName: decorationTag,
            class: classNames.join(' '),
            'data-decoration-id': decorationId || undefined,
            'data-decoration-content': decorationContent,
          }),
        ])
      },
    },
  })
}

/** Начальная позиция триггера в тексте перед курсором (для удаления). */
export function calculateStartPosition(
  pos: number,
  nodeBefore: { text?: string | null } | null | undefined,
  char: string | undefined,
): number {
  if (!nodeBefore?.text || !char) return pos
  const text = nodeBefore.text
  const index = text.lastIndexOf(char)
  return index === -1 ? pos : pos - text.substring(index).length
}

export interface SuggestionItem<Context = unknown> {
  title: string
  subtext?: string
  badge?: unknown
  group?: string
  keywords?: string[]
  context?: Context
  onSelect: (props: {
    editor: Editor
    range?: { from: number; to: number }
    context?: Context
  }) => void
}

/** Фильтрация + сортировка пунктов по запросу (точное совпадение, префикс). */
export function filterSuggestionItems<Context, T extends SuggestionItem<Context>>(
  items: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return items
  return items
    .filter(
      (item) =>
        !!(
          item.title.toLowerCase().includes(normalized) ||
          item.subtext?.toLowerCase().includes(normalized) ||
          item.keywords?.some((keyword) => keyword.toLowerCase().includes(normalized))
        ),
    )
    .sort((a, b) => {
      const first = a.title.toLowerCase()
      const second = b.title.toLowerCase()
      if (first === normalized && second !== normalized) return -1
      if (second === normalized && first !== normalized) return 1
      if (first.startsWith(normalized) && !second.startsWith(normalized)) return -1
      if (second.startsWith(normalized) && !first.startsWith(normalized)) return 1
      return 0
    })
}
