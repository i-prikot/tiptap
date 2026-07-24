/**
 * Расширенный suggestion-плагин. Отличия от @tiptap/suggestion: dismissedRange
 * (Escape скрывает меню до конца слова), inline-декорация диапазона,
 * debounce/minQueryLength для items, floating-ui `mount`-хелпер.
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
