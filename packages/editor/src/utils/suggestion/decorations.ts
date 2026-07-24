import type { PluginKey } from '@tiptap/pm/state'
import type { EditorState } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { SuggestionPluginState } from './state'

interface SuggestionDecorationsConfig {
  pluginKey: PluginKey
  decorationTag: string
  decorationClass: string
  decorationEmptyClass: string
  decorationContent: string
}

/**
 * Создаёт поставщик inline-декорации активного suggestion-диапазона.
 *
 * `data-decoration-id` связывает DOM-элемент с плавающим меню и сохраняется
 * reducer-ом на протяжении одного активного диапазона. Декорация отсутствует
 * при неактивном плагине; потребители геометрии не должны считать её DOM-узел
 * гарантированно существующим во время обновления view.
 */
export function createSuggestionDecorations(config: SuggestionDecorationsConfig) {
  const { pluginKey, decorationTag, decorationClass, decorationEmptyClass, decorationContent } =
    config

  return (state: EditorState): DecorationSet | null => {
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
  }
}
