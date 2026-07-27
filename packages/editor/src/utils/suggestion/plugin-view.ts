import type { Editor } from '@tiptap/core'
import type { EditorState, PluginKey, PluginView } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { createSuggestionItemsFetcher } from './items-fetcher'
import { createSuggestionClientRect, createSuggestionMount } from './positioning'
import type { SuggestionPluginState } from './state'
import type { SuggestionOptions, SuggestionProps, SuggestionRenderer } from './types'

type SuggestionLifecyclePhase = 'started' | 'updated' | 'stopped'

type SuggestionItemsProvider<Item, SelectedProps> = NonNullable<
  SuggestionOptions<Item, SelectedProps>['items']
>

interface SuggestionPluginViewConfig<Item, SelectedProps> {
  pluginKey: PluginKey<SuggestionPluginState>
  editor: Editor
  renderer: SuggestionRenderer<Item, SelectedProps>
  items: SuggestionItemsProvider<Item, SelectedProps>
  initialItems?: Item[]
  minQueryLength: number
  debounce: number
  placement: SuggestionProps<Item, SelectedProps>['placement']
  offset: { mainAxis?: number; crossAxis?: number }
  container?: HTMLElement | string
  flip: boolean
  floatingUi: SuggestionProps<Item, SelectedProps>['floatingUi']
  dismissOnOutsideClick: boolean
  command: NonNullable<SuggestionOptions<Item, SelectedProps>['command']>
  dispatchExit: (view: EditorView) => void
}

export function createSuggestionPluginView<Item, SelectedProps>(
  config: SuggestionPluginViewConfig<Item, SelectedProps>,
): () => PluginView {
  return () => new SuggestionPluginViewController(config)
}

class SuggestionPluginViewController<Item, SelectedProps> implements PluginView {
  private currentProps: SuggestionProps<Item, SelectedProps> | undefined
  private readonly fetcher

  constructor(private readonly config: SuggestionPluginViewConfig<Item, SelectedProps>) {
    this.fetcher = createSuggestionItemsFetcher(config.items, config.editor)
  }

  private emit(phase: SuggestionLifecyclePhase, props: SuggestionProps<Item, SelectedProps>): void {
    if (phase === 'started') this.config.renderer.onStart?.(props)
    else if (phase === 'updated') this.config.renderer.onUpdate?.(props)
    else this.config.renderer.onExit?.(props)
  }

  private getPhase(
    prev: SuggestionPluginState,
    next: SuggestionPluginState,
  ): SuggestionLifecyclePhase | null {
    if (!prev.active && next.active) return 'started'
    if (prev.active && !next.active) return 'stopped'
    if (!next.active) return null

    const queryChanged = prev.query !== next.query
    const textChanged = prev.text !== next.text
    const rangeChanged = prev.range.from !== next.range.from || prev.range.to !== next.range.to
    return queryChanged || textChanged || rangeChanged || prev.refreshId !== next.refreshId
      ? 'updated'
      : null
  }

  private createProps(
    view: EditorView,
    state: SuggestionPluginState,
    loading: boolean,
  ): SuggestionProps<Item, SelectedProps> {
    const decorationNode = view.dom.querySelector(`[data-decoration-id="${state.decorationId}"]`)
    const clientRect = createSuggestionClientRect({
      editor: this.config.editor,
      view,
      decorationNode,
      getDecorationId: () => {
        const pluginState = this.config.pluginKey.getState(this.config.editor.state)
        return pluginState?.decorationId ?? null
      },
    })

    return {
      editor: this.config.editor,
      range: state.range,
      query: state.query || '',
      text: state.text || '',
      items: this.config.initialItems ?? [],
      command: (selectedProps) =>
        this.config.command({
          editor: this.config.editor,
          range: state.range,
          props: selectedProps,
        }),
      decorationNode,
      clientRect,
      loading,
      placement: this.config.placement,
      offset: {
        mainAxis: this.config.offset.mainAxis ?? 4,
        crossAxis: this.config.offset.crossAxis ?? 0,
      },
      container: this.config.container,
      flip: this.config.flip,
      floatingUi: this.config.floatingUi,
      mount: createSuggestionMount({
        getReferenceRect: clientRect,
        contextElement: view.dom as HTMLElement,
        floatingUi: this.config.floatingUi,
        container: this.config.container,
        dismissOnOutsideClick: this.config.dismissOnOutsideClick,
        onExit: () => this.config.dispatchExit(this.config.editor.view),
      }),
    }
  }

  async update(view: EditorView, prevState: EditorState): Promise<void> {
    const prev = this.config.pluginKey.getState(prevState)
    const next = this.config.pluginKey.getState(view.state)
    if (!prev || !next) return

    let phase = this.getPhase(prev, next)
    if (!phase) return
    const state = phase === 'stopped' ? prev : next
    const meetsMinQuery =
      this.config.minQueryLength === 0 ||
      (!!state.query && state.query.length >= this.config.minQueryLength)
    const willLoad = phase !== 'stopped' && meetsMinQuery
    let props = this.createProps(view, state, willLoad)
    this.currentProps = props

    if (phase === 'started') this.config.renderer.onBeforeStart?.(props)
    if (phase === 'updated') this.config.renderer.onBeforeUpdate?.(props)
    if (phase === 'started') this.emit(phase, props)

    if (phase !== 'stopped') {
      if (willLoad) {
        phase = 'updated'
        props = { ...props, items: this.config.initialItems ?? [], loading: true }
        this.currentProps = props
        this.emit(phase, props)
        const result = await this.fetcher.fetch(state.query || '', this.config.debounce)
        if (result.status === 'aborted') return
        const latest = this.config.pluginKey.getState(view.state)
        if (!latest?.active) {
          this.fetcher.abort()
          return
        }
        props =
          result.status === 'resolved'
            ? { ...props, items: result.items, loading: false }
            : { ...props, loading: false }
        this.currentProps = props
      } else {
        this.fetcher.abort()
        props = { ...props, items: this.config.initialItems ?? [], loading: false }
        this.currentProps = props
      }
    }

    if (phase === 'stopped') {
      this.fetcher.abort()
      this.emit(phase, props)
      this.currentProps = undefined
      return
    }
    if (phase === 'updated') this.emit(phase, props)
  }

  destroy(): void {
    this.fetcher.abort()
    if (this.currentProps) this.config.renderer.onExit?.(this.currentProps)
  }
}
