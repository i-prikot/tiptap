/**
 * UiState — хранит UI-состояние редактора (drag, AI-генерация, комментарии)
 * в extension storage и предоставляет команды для его изменения.
 * Порт из чанка 35aonnuqri98j (модуль 188777).
 */
import { createLogger } from '../utils/logger.js'
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

export type UiEditorStateChanges = Partial<UiEditorState>

export interface UiStateUpdate {
  changed: UiEditorStateChanges
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

const logger = createLogger('UiState')

function debug(event: string, metadata?: Record<string, unknown>) {
  logger.debug(event, metadata)
}

export const UiState = Extension.create<Record<string, never>, UiEditorState>({
  name: 'uiState',

  addStorage() {
    return { ...defaultUiState }
  },

  addCommands() {
    const updateState = (nextState: UiEditorStateChanges) => {
      const changed: UiEditorStateChanges = {}

      for (const key of Object.keys(nextState) as Array<keyof UiEditorState>) {
        const value = nextState[key]
        if (value === undefined || this.storage[key] === value) continue
        this.storage[key] = value
        changed[key] = value
      }

      const changedKeys = Object.keys(changed) as Array<keyof UiEditorState>
      if (changedKeys.length) {
        this.editor.emit('uiStateUpdate', { changed })
        debug('state updated', { changedKeys })
      } else {
        debug('state update skipped', { requestedKeys: Object.keys(nextState) })
      }
    }

    const setValue = (key: keyof UiEditorState) => (value: boolean) => () => {
      updateState({ [key]: value })
      return true
    }
    const setConstant = (key: keyof UiEditorState, value: boolean) => () => () => {
      updateState({ [key]: value })
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
        updateState(defaultUiState)
        return true
      },
    }
  },

  onCreate() {
    Object.assign(this.storage, { ...defaultUiState })
    debug('extension initialized')
  },
})
