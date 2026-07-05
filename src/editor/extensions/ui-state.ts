/**
 * UiState — хранит UI-состояние редактора (drag, AI-генерация, комментарии)
 * в extension storage и предоставляет команды для его изменения.
 * Порт из чанка 35aonnuqri98j (модуль 188777).
 */
import { Extension } from '@tiptap/core'

export interface UiEditorState {
  aiGenerationIsSelection: boolean
  aiGenerationIsLoading: boolean
  aiGenerationActive: boolean
  aiGenerationHasMessage: boolean
  commentInputVisible: boolean
  lockDragHandle: boolean
  isDragging: boolean
}

export const defaultUiState: UiEditorState = {
  aiGenerationIsSelection: false,
  aiGenerationIsLoading: false,
  aiGenerationActive: false,
  aiGenerationHasMessage: false,
  commentInputVisible: false,
  lockDragHandle: false,
  isDragging: false,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
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
  }

  interface Storage {
    uiState: UiEditorState
  }
}

export const UiState = Extension.create<Record<string, never>, UiEditorState>({
  name: 'uiState',

  addStorage() {
    return { ...defaultUiState }
  },

  addCommands() {
    const setValue = (key: keyof UiEditorState) => (value: boolean) => () => {
      this.storage[key] = value
      return true
    }
    const setConstant = (key: keyof UiEditorState, value: boolean) => () => () => {
      this.storage[key] = value
      return true
    }

    return {
      aiGenerationSetIsSelection: setValue('aiGenerationIsSelection'),
      aiGenerationSetIsLoading: setValue('aiGenerationIsLoading'),
      aiGenerationHasMessage: setValue('aiGenerationHasMessage'),
      aiGenerationShow: setConstant('aiGenerationActive', true),
      aiGenerationHide: setConstant('aiGenerationActive', false),
      commentInputShow: setConstant('commentInputVisible', true),
      commentInputHide: setConstant('commentInputVisible', false),
      setLockDragHandle: setValue('lockDragHandle'),
      setIsDragging: setValue('isDragging'),
      resetUiState: () => () => {
        Object.assign(this.storage, { ...defaultUiState })
        return true
      },
    }
  },

  onCreate() {
    Object.assign(this.storage, { ...defaultUiState })
  },
})
