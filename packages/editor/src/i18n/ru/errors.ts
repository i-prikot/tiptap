import type { EditorMessageTree } from '../types'

export const errors = {
  imageUploadFailed: 'Не удалось загрузить изображение',
  imageUploadAdapterNotConfigured: 'адаптер загрузки изображений не настроен',
} as const satisfies EditorMessageTree['errors']
