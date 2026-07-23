import type { EditorMessageTree } from '../types'

export const image = {
  alignLeft: 'Выровнять изображение по левому краю',
  alignCenter: 'Выровнять изображение по центру',
  alignRight: 'Выровнять изображение по правому краю',
  caption: 'Подпись',
  download: 'Скачать изображение',
  replace: 'Заменить',
  add: 'Добавить изображение',
  captionPlaceholder: 'Добавьте подпись...',
  clickToUpload: 'Нажмите для загрузки',
  dragAndDrop: 'или перетащите файл',
  maximumFiles: 'Максимум {limit} файл(ов), не более {maxSize} МБ каждый.',
  uploadingFiles: 'Загрузка файлов: {count}',
  clearAll: 'Очистить всё',
} as const satisfies EditorMessageTree['image']
