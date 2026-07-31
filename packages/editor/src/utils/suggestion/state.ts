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

function createInitialSuggestionState(): SuggestionPluginState {
  return {
    active: false,
    range: { from: 0, to: 0 },
    query: null,
    text: null,
    composing: false,
    refreshId: 0,
    dismissedRange: null,
  }
}

function createExitedSuggestionState(prev: SuggestionPluginState): SuggestionPluginState {
  return {
    ...prev,
    active: false,
    decorationId: null,
    range: { from: 0, to: 0 },
    query: null,
    text: null,
    dismissedRange: prev.active ? { ...prev.range } : prev.dismissedRange,
  }
}

function mapDismissedRange(
  state: SuggestionPluginState,
  transaction: Transaction,
): SuggestionPluginState {
  if (!transaction.docChanged || state.dismissedRange === null) return state
  return {
    ...state,
    dismissedRange: {
      from: transaction.mapping.map(state.dismissedRange.from),
      to: transaction.mapping.map(state.dismissedRange.to),
    },
  }
}

function deactivateSuggestionState(state: SuggestionPluginState): SuggestionPluginState {
  return { ...state, active: false }
}

function normalizeInactiveSuggestionState(state: SuggestionPluginState): SuggestionPluginState {
  if (state.active) return state
  return {
    ...state,
    decorationId: null,
    range: { from: 0, to: 0 },
    query: null,
    text: null,
  }
}

function isEligibleSuggestionMatch(
  config: SuggestionPluginStateConfig,
  match: SuggestionMatch,
  transaction: Transaction,
  state: EditorState,
  isActive: boolean,
): boolean {
  if (!config.allow({ editor: config.editor, state, range: match.range, isActive })) return false
  return (
    !config.shouldShow ||
    config.shouldShow({
      editor: config.editor,
      range: match.range,
      query: match.query,
      text: match.text,
      transaction,
    })
  )
}
function applySuggestionMatch(
  prev: SuggestionPluginState,
  state: SuggestionPluginState,
  match: SuggestionMatch,
  config: SuggestionPluginStateConfig,
  transaction: Transaction,
  editorState: EditorState,
): SuggestionPluginState {
  const dismissedRange = state.dismissedRange
  const shouldClearDismissal =
    dismissedRange !== null &&
    !config.shouldKeepDismissed({ match, dismissedRange, state: editorState, transaction })
  const next = shouldClearDismissal ? { ...state, dismissedRange: null } : state
  if (next.dismissedRange !== null) return deactivateSuggestionState(next)
  return {
    ...next,
    active: true,
    decorationId: prev.decorationId || `id_${Math.floor(Math.random() * 0xffffffff)}`,
    range: match.range,
    query: match.query,
    text: match.text,
  }
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
  const { pluginKey, editor } = config

  return {
    init: createInitialSuggestionState,
    apply(
      transaction: Transaction,
      prev: SuggestionPluginState,
      _oldState: EditorState,
      state: EditorState,
    ): SuggestionPluginState {
      const meta = transaction.getMeta(pluginKey)
      if (meta?.exit) return createExitedSuggestionState(prev)

      const composing = editor.view.composing
      let next = mapDismissedRange(
        {
          ...prev,
          refreshId: meta?.refresh ? prev.refreshId + 1 : prev.refreshId,
          composing,
        },
        transaction,
      )
      const { empty, from } = transaction.selection
      if (!editor.isEditable || (!empty && !composing))
        return normalizeInactiveSuggestionState(next)
      if ((from < prev.range.from || from > prev.range.to) && !composing && !prev.composing) {
        next = deactivateSuggestionState(next)
      }

      const match = config.findSuggestionMatch({
        char: config.char,
        allowSpaces: config.allowSpaces,
        allowToIncludeChar: config.allowToIncludeChar,
        allowedPrefixes: config.allowedPrefixes,
        startOfLine: config.startOfLine,
        $position: transaction.selection.$from,
      })
      if (match && isEligibleSuggestionMatch(config, match, transaction, state, prev.active)) {
        return normalizeInactiveSuggestionState(
          applySuggestionMatch(prev, next, match, config, transaction, state),
        )
      }
      if (!match) next = { ...next, dismissedRange: null }
      return normalizeInactiveSuggestionState(deactivateSuggestionState(next))
    },
  }
}
