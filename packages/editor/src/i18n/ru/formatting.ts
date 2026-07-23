import type { EditorMessageTree } from '../types'

export const formatting = {
  text: 'Текст',
  heading1: 'Заголовок 1',
  heading2: 'Заголовок 2',
  heading3: 'Заголовок 3',
  heading: 'Заголовок {level}',
  bulletList: 'Маркированный список',
  bulletListConversion: 'Маркированный список',
  numberedList: 'Нумерованный список',
  numberedListConversion: 'Нумерованный список',
  todoList: 'Список задач',
  blockquote: 'Цитата',
  codeBlock: 'Блок кода',
  codeBlockConversion: 'Блок кода',
} as const satisfies EditorMessageTree['formatting']
