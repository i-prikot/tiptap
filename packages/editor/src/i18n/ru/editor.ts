import type { EditorMessageTree } from '../types'

export const editor = {
  placeholder: "Напишите '/' для ввода команд…",
  slashPlaceholder: 'Фильтр...',
} as const satisfies EditorMessageTree['editor']
