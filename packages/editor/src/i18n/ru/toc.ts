import type { EditorMessageTree } from '../types'

export const toc = {
  title: 'Оглавление',
  empty: 'Добавьте заголовки, чтобы создать оглавление.',
  showTitle: 'Показать заголовок',
} as const satisfies EditorMessageTree['toc']
