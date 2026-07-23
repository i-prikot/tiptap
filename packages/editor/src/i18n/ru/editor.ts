import type { EditorMessageTree } from '../types'

export const editor = {
  placeholder: 'Начните писать...',
  slashPlaceholder: 'Фильтр...',
} as const satisfies EditorMessageTree['editor']
