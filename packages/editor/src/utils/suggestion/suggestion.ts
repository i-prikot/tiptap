/**
 * Точка входа расширенного suggestion-движка для ProseMirror/Tiptap.
 *
 * В отличие от `@tiptap/suggestion`, модуль хранит `dismissedRange`, поэтому
 * Escape скрывает меню только для текущего триггерного диапазона, создаёт
 * стабильную inline-декорацию для привязки floating-ui и управляет отменяемой
 * асинхронной загрузкой пунктов. Экспортируемые хелперы разделены по слоям:
 * поиск совпадения, состояние плагина, декорации и DOM-позиционирование.
 */
export { calculateStartPosition, filterSuggestionItems, findSuggestionMatch } from './matching'
export { Suggestion, SuggestionPluginKey } from './plugin'
export type {
  FindSuggestionMatchConfig,
  MountOptions,
  SuggestionMatch,
  SuggestionOptions,
  SuggestionProps,
  SuggestionRenderer,
} from './types'
export type { SuggestionItem } from '../../types/suggestion'
