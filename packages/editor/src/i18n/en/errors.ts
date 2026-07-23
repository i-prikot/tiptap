import type { EditorTranslationErrorsMessages } from '../types'

export const errors = {
  imageUploadFailed: 'Image upload failed',
  imageUploadAdapterNotConfigured: 'image upload adapter is not configured',
} as const satisfies EditorTranslationErrorsMessages
