import type { EditorMessageTree } from '../types'

export const common = {
  suggestions: 'Предложения',
  toolbar: 'панель инструментов',
  anonymous: 'Анонимный пользователь',
  connecting: 'Подключение...',
} as const satisfies EditorMessageTree['common']
