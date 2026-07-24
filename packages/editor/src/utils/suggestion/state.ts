import type { Editor } from '@tiptap/core'
import type { EditorState, PluginKey, Transaction } from '@tiptap/pm/state'
import type { SuggestionMatch } from './types'

/**
 * Состояние suggestion-плагина в `PluginKey`.
 *
 * При `active` `range`, `query`, `text` и `decorationId` описывают текущий
 * матч. В неактивном состоянии `range` сохраняет sentinel `{ from: 0, to: 0 }`,
 * поэтому потребители должны сначала проверять `active`.
 * `refreshId` принудительно вызывает renderer update без смены текста, а
 * `dismissedRange` предотвращает повторное открытие того же диапазона после
 * Escape до выполнения правила сброса. Позиции `dismissedRange` маппятся через
 * транзакции и не являются постоянными координатами документа.
 */
export interface SuggestionPluginState {
  active: boolean
  range: { from: number; to: number }
  query: string | null
  text: string | null
  composing: boolean
  refreshId: number
  decorationId?: string | null
  dismissedRange: { from: number; to: number } | null
}

interface SuggestionPluginStateConfig {
  pluginKey: PluginKey
  editor: Editor
  char: string
  allowSpaces: boolean
  allowToIncludeChar: boolean
  allowedPrefixes: string[] | null
  startOfLine: boolean
  findSuggestionMatch: (config: {
    char: string
    allowSpaces: boolean
    allowToIncludeChar: boolean
    allowedPrefixes: string[] | null
    startOfLine: boolean
    $position: Transaction['selection']['$from']
  }) => SuggestionMatch | null
  allow: (props: {
    editor: Editor
    state: EditorState
    range: { from: number; to: number }
    isActive: boolean
  }) => boolean
  shouldShow?: (props: {
    editor: Editor
    range: { from: number; to: number }
    query: string
    text: string
    transaction: Transaction
  }) => boolean
  shouldKeepDismissed: (args: {
    match: SuggestionMatch
    dismissedRange: { from: number; to: number }
    state: EditorState
    transaction: Transaction
  }) => boolean
}

/**
 * Создаёт reducer состояния ProseMirror для одного suggestion-плагина.
 *
 * На каждую транзакцию рассчитывается матч около текущего selection. Плагин
 * активен только в редактируемом редакторе с пустым selection либо во время
 * composition; `allow` и `shouldShow` могут дополнительно отклонить матч.
 * Meta `exit` очищает активное состояние и сохраняет текущий диапазон как
 * `dismissedRange`, поэтому следующий расчёт не должен немедленно открыть меню.
 */
export function createSuggestionPluginState(config: SuggestionPluginStateConfig) {
  const {
    pluginKey,
    editor,
    char,
    allowSpaces,
    allowToIncludeChar,
    allowedPrefixes,
    startOfLine,
    findSuggestionMatch,
    allow,
    shouldShow,
    shouldKeepDismissed,
  } = config

  return {
    init: (): SuggestionPluginState => ({
      active: false,
      range: { from: 0, to: 0 },
      query: null,
      text: null,
      composing: false,
      refreshId: 0,
      dismissedRange: null,
    }),
    /**
     * Вычисляет следующий снимок без изменения документа.
     *
     * Новый `decorationId` генерируется только при первом входе в активный
     * диапазон и сохраняется при обновлениях, чтобы DOM-якорь floating-ui не
     * менял идентичность. Если матч отсутствует, selection вышел за границы или
     * редактор недоступен для редактирования, все поля активного состояния
     * очищаются; подавленный диапазон очищается только после исчезновения матча
     * либо по пользовательскому правилу.
     */
    apply(
      transaction: Transaction,
      prev: SuggestionPluginState,
      _oldState: EditorState,
      state: EditorState,
    ): SuggestionPluginState {
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

      if (meta?.refresh) next.refreshId = prev.refreshId + 1

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
        const match = findSuggestionMatch({
          char,
          allowSpaces,
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
  }
}
