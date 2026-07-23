import type { EditorMessageTree } from '../types'

export const links = {
  link: 'Ссылка',
  placeholder: 'Вставьте ссылку...',
  apply: 'Применить ссылку',
  openInNewWindow: 'Открыть в новом окне',
  remove: 'Удалить ссылку',
} as const satisfies EditorMessageTree['links']
