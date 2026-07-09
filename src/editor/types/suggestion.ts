import type { Editor } from '@tiptap/core'

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
