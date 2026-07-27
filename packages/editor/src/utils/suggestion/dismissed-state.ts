import type { Editor } from '@tiptap/core'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { SuggestionMatch, SuggestionOptions } from './types'

export interface SuggestionDismissedStateInput {
  match: SuggestionMatch
  dismissedRange: { from: number; to: number }
  state: EditorState
  transaction: Transaction
}

export function shouldKeepSuggestionDismissed(
  args: SuggestionDismissedStateInput,
  editor: Editor,
  allowSpaces: boolean,
  shouldResetDismissed: SuggestionOptions['shouldResetDismissed'],
): boolean {
  const { match, dismissedRange, state, transaction } = args
  if (
    shouldResetDismissed?.({
      editor,
      state,
      range: dismissedRange,
      match,
      transaction,
      allowSpaces: allowSpaces,
    })
  ) {
    return false
  }
  if (allowSpaces) return match.range.from === dismissedRange.from
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

export function createSuggestionDismissedStateGuard(
  editor: Editor,
  allowSpaces: boolean,
  shouldResetDismissed: SuggestionOptions['shouldResetDismissed'],
): (args: SuggestionDismissedStateInput) => boolean {
  return (args) => shouldKeepSuggestionDismissed(args, editor, allowSpaces, shouldResetDismissed)
}
