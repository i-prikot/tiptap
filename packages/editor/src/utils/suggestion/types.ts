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
  findSuggestionMatch?: (config: FindSuggestionMatchConfig) => SuggestionMatch | null
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
