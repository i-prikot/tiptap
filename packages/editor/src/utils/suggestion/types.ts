import type { Editor } from '@tiptap/core'
import type { ResolvedPos } from '@tiptap/pm/model'
import type { EditorState, PluginKey, Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type {
  autoUpdate,
  ComputePositionConfig,
  Middleware,
  Placement,
  Strategy,
} from '@floating-ui/dom'

/**
 * Результат распознавания активного триггера непосредственно перед курсором.
 *
 * `range` включает триггер и запрос; `query` исключает триггер, а `text`
 * сохраняет полный совпавший фрагмент. Координаты действительны только для
 * состояния документа, в котором был выполнен поиск.
 */
export interface SuggestionMatch {
  range: { from: number; to: number }
  query: string
  text: string
}

/**
 * Входные ограничения для поиска триггера в текстовом узле перед курсором.
 *
 * Политики пробелов, повторного включения `char`, допустимых префиксов и начала
 * строки влияют на регулярное выражение и проверку границы совпадения. Функция
 * поиска не должна изменять `$position` или документ.
 */
export interface FindSuggestionMatchConfig {
  char: string
  allowSpaces: boolean
  allowToIncludeChar: boolean
  allowedPrefixes: string[] | null
  startOfLine: boolean
  $position: ResolvedPos
}

/**
 * Снимок состояния, передаваемый renderer-колбэкам suggestion-меню.
 *
 * Он объединяет состояние ProseMirror, текущий набор пунктов и контракт
 * позиционирования. `clientRect` и `mount` могут зависеть от DOM-декорации:
 * при её отсутствии прямоугольник либо строится от курсора, либо возвращает
 * `null`; renderer обязан корректно переживать оба случая.
 */
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
  /**
   * Монтирует floating-элемент и возвращает обязательный cleanup.
   *
   * Cleanup прекращает `autoUpdate`, снимает обработчик внешнего указателя и
   * удаляет элемент только если движок самостоятельно добавил его в контейнер.
   */
  mount: (element: HTMLElement, options?: MountOptions) => () => void
}

/**
 * Настройка передачи рассчитанной floating-ui позиции во внешний renderer.
 *
 * При наличии `onPosition` движок не записывает inline-стили; жизненный цикл
 * обновлений остаётся в его ответственности и всё равно завершается cleanup,
 * возвращённым из `mount`.
 */
export interface MountOptions {
  onPosition?: (position: {
    x: number
    y: number
    placement: Placement
    strategy: Strategy
  }) => void
  autoUpdate?: Parameters<typeof autoUpdate>[3]
}

/**
 * Колбэки жизненного цикла внешнего renderer-а suggestion-меню.
 *
 * `onBeforeStart`/`onBeforeUpdate` получают снимок до соответствующего события,
 * а `onStart`/`onUpdate` — после него. `onExit` вызывается при остановке плагина
 * и при уничтожении view, поэтому реализация должна быть идемпотентной и
 * освобождать собственные DOM-ресурсы.
 */
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

/**
 * Конфигурация suggestion-плагина.
 *
 * Поля `char`, правила префикса/пробелов и состояние selection определяют,
 * может ли появиться предложение. `minQueryLength` и `debounce` регулируют
 * только загрузку `items`, а не активность декорации. Каждый новый запрос
 * отменяет предыдущий через `AbortSignal`; обработчик `items` не должен
 * применять побочные эффекты после отмены.
 */
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
  /**
   * Синхронный или асинхронный источник пунктов.
   *
   * `signal` отменяется при новом запросе, выходе из suggestion или уничтожении
   * plugin view. Результаты отменённых и уже неактивных запросов игнорируются.
   */
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
  /**
   * Дополнительные параметры floating-ui; заданный middleware добавляется после
   * базового `offset` и необязательного `flip`.
   */
  floatingUi?: Partial<ComputePositionConfig> & { middleware?: Middleware[] }
  dismissOnOutsideClick?: boolean
  render?: () => SuggestionRenderer<Item, SelectedProps>
  allow?: (props: {
    editor: Editor
    state: EditorState
    range: { from: number; to: number }
    isActive: boolean
  }) => boolean
  findSuggestionMatch?: (config: FindSuggestionMatchConfig) => SuggestionMatch | null
  shouldShow?: (props: {
    editor: Editor
    range: { from: number; to: number }
    query: string
    text: string
    transaction: Transaction
  }) => boolean
  /**
   * Явно сбрасывает подавление после Escape. Без колбэка для запросов без
   * пробелов оно сбрасывается только при смене `range.from` или вставке
   * пробельного символа; изменение `range.to` или `query` само по себе не
   * снимает подавление.
   */
  shouldResetDismissed?: (props: {
    editor: Editor
    state: EditorState
    range: { from: number; to: number }
    match: SuggestionMatch
    transaction: Transaction
    allowSpaces: boolean
  }) => boolean
}
