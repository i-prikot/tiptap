import { Plugin, PluginKey } from '@tiptap/pm/state'
import { createSuggestionDecorations } from './decorations'
import { findSuggestionMatch } from './matching'
import { createSuggestionPluginState } from './state'
import { createSuggestionPluginView } from './plugin-view'
import { createSuggestionExitDispatcher, createSuggestionPluginRuntime } from './plugin-runtime'
import type { SuggestionPluginState } from './state'
import type { SuggestionOptions, SuggestionRenderer } from './types'

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
  const dispatchExit = createSuggestionExitDispatcher(pluginKey)
  const { floatingConfig, dismissedGuard } = createSuggestionPluginRuntime({
    editor,
    allowSpaces: effectiveAllowSpaces,
    shouldResetDismissed,
    placement,
    offset: offsetOption,
    flip: flipOption,
    floatingUi,
  })

  return new Plugin<SuggestionPluginState>({
    key: pluginKey,
    view: createSuggestionPluginView({
      pluginKey,
      editor,
      renderer,
      items,
      initialItems,
      minQueryLength,
      debounce,
      placement,
      offset: offsetOption,
      container,
      flip: flipOption,
      floatingUi: floatingConfig,
      dismissOnOutsideClick,
      command,
      dispatchExit,
    }),
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
      shouldKeepDismissed: dismissedGuard,
    }),
    props: {
      handleKeyDown(view, event) {
        const state = pluginKey.getState(view.state) as SuggestionPluginState
        if (!state.active) return false
        if (event.key === 'Escape' || event.key === 'Esc') {
          renderer.onKeyDown?.({ view, event, range: state.range })
          dispatchExit(view)
          return true
        }
        return renderer.onKeyDown?.({ view, event, range: state.range }) || false
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
