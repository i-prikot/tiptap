import type { EditorMessageTree } from '../types'

export const common = {
  suggestions: 'Предложения',
  toolbar: 'панель инструментов',
  anonymous: 'Анонимный пользователь',
  connecting: 'Подключение...',
  avatarLabel: 'Аватар пользователя {name}',
  collaboratorCount: {
    zero: '{count} участников',
    one: '{count} участник',
    two: '{count} участника',
    few: '{count} участника',
    many: '{count} участников',
    other: '{count} участников',
  },
  additionalCollaboratorCount: {
    zero: '+{count} участников',
    one: '+{count} участник',
    two: '+{count} участника',
    few: '+{count} участника',
    many: '+{count} участников',
    other: '+{count} участников',
  },
} as const satisfies EditorMessageTree['common']
