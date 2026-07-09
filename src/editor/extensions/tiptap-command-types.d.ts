import '@tiptap/core'
import type { EmojiItem, EmojiStorage } from '@tiptap/extension-emoji'
import type { UiEditorState } from './ui-state'

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
  }

  interface Storage {
    uiState: UiEditorState
    emoji: EditorEmojiStorage
  }
}
