import '@tiptap/core'
import type { EmojiItem, EmojiStorage } from '@tiptap/extension-emoji'
import type { UiEditorState } from '../extensions/ui-state'
import type { TableHandleState } from '../extensions/table-handle'
import type { TocNodeAttributes } from '../nodes/toc/toc-node'

export type AiTextPromptFormat = 'rich-text'

export type EditorEmojiItem = EmojiItem
export type EditorEmojiStorage = EmojiStorage

export interface AiTextPromptOptions {
  stream: boolean
  format: AiTextPromptFormat
  text: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableHandleExtension: {
      freezeHandles: () => ReturnType
      unfreezeHandles: () => ReturnType
    }
    uiState: {
      aiGenerationSetIsSelection: (value: boolean) => ReturnType
      aiGenerationSetIsLoading: (value: boolean) => ReturnType
      aiGenerationHasMessage: (value: boolean) => ReturnType
      aiGenerationShow: () => ReturnType
      aiGenerationHide: () => ReturnType
      commentInputShow: () => ReturnType
      commentInputHide: () => ReturnType
      setLockDragHandle: (value: boolean) => ReturnType
      setIsDragging: (value: boolean) => ReturnType
      resetUiState: () => ReturnType
    }
    aiTextPrompt: {
      aiTextPrompt: (options: AiTextPromptOptions) => ReturnType
    }
    ai: {
      aiAccept: () => ReturnType
    }
    emoji: {
      setEmoji: (name: string) => ReturnType
    }
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
      setIndent: (level: number) => ReturnType
      unsetIndent: () => ReturnType
    }
    nodeAlignment: {
      setNodeTextAlign: (align: string) => ReturnType
      unsetNodeTextAlign: () => ReturnType
      toggleNodeTextAlign: (align: string) => ReturnType
      setNodeVAlign: (align: string) => ReturnType
      unsetNodeVAlign: () => ReturnType
      toggleNodeVAlign: (align: string) => ReturnType
      setNodeAlignment: (textAlign?: string, verticalAlign?: string) => ReturnType
      unsetNodeAlignment: () => ReturnType
    }
    nodeBackground: {
      setNodeBackgroundColor: (color: string) => ReturnType
      unsetNodeBackgroundColor: () => ReturnType
      toggleNodeBackgroundColor: (color: string) => ReturnType
    }
    imageUpload: {
      setImageUploadNode: (attrs?: Record<string, unknown>) => ReturnType
    }
    tocNode: {
      insertTocNode: (attrs?: TocNodeAttributes) => ReturnType
    }
  }

  interface Storage {
    uiState: UiEditorState
    emoji: EditorEmojiStorage
  }

  interface EditorEvents {
    tableHandleState: TableHandleState
  }
}
