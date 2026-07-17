import type { Editor } from '@tiptap/core'
import type { EditorState, PluginKey, Transaction } from '@tiptap/pm/state'
import type { SuggestionMatch } from './types'

export interface SuggestionPluginState {
  active: boolean
  range: { from: number; to: number }
  query: string | null
  text: string | null
  composing: boolean
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
      dismissedRange: null,
    }),
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
