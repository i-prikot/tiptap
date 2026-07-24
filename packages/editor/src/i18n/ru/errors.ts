import type { EditorMessageTree } from '../types'

export const errors = {
  imageUploadFailed: 'Не удалось загрузить изображение',
  imageUploadAdapterNotConfigured: 'Адаптер загрузки изображений недоступен',
  imageUploadInvalidUrl: 'Загрузка изображения не вернула корректный URL',
  imageUploadEmptySelection: 'Не выбраны файлы изображений',
  imageUploadFileLimit: 'За один раз можно загрузить не более {limit} изображений',
  imageUploadFileSizeLimit: 'Размер изображения превышает ограничение {maxSize} МБ',
} as const satisfies EditorMessageTree['errors']
