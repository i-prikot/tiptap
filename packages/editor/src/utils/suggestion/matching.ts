import { escapeForRegEx } from '@tiptap/core'
import type { SuggestionItem } from '../../types/suggestion'
import type { FindSuggestionMatchConfig, SuggestionMatch } from './types'

/**
 * Ищет активный триггер (например, `/query`) в текстовом узле перед курсором.
 *
 * Регулярное выражение учитывает `char`, политики пробелов и повторного
 * включения триггера, а затем проверяет допустимый префикс или начало строки.
 * Возвращается только совпадение, пересекающее позицию курсора; совпадения из
 * другого узла, после недопустимого префикса или вне selection игнорируются.
 */
export function findSuggestionMatch(config: FindSuggestionMatchConfig): SuggestionMatch | null {
  const {
    char,
    allowSpaces: allowSpacesOption,
    allowToIncludeChar,
    allowedPrefixes,
    startOfLine,
    $position,
  } = config
  const allowSpaces = allowSpacesOption && !allowToIncludeChar

  const escapedChar = escapeForRegEx(char)
  const suffix = new RegExp(`\\s${escapedChar}$`)
  const prefix = startOfLine ? '^' : ''
  const finalChar = allowToIncludeChar ? '' : escapedChar
  const regexp = allowSpaces
    ? new RegExp(`${prefix}${escapedChar}.*?(?=\\s${finalChar}|$)`, 'gm')
    : new RegExp(`${prefix}(?:^)?${escapedChar}[^\\s${finalChar}]*`, 'gm')

  const text = $position.nodeBefore?.isText && $position.nodeBefore.text
  if (!text) return null

  const textFrom = $position.pos - text.length
  const match = Array.from(text.matchAll(regexp)).pop()
  if (!match || match.input === undefined || match.index === undefined) return null

  // триггер должен начинаться с начала строки либо после допустимого префикса
  const matchPrefix = match.input.slice(Math.max(0, match.index - 1), match.index)
  const matchPrefixIsAllowed = new RegExp(`^[${allowedPrefixes?.join('')}\0]?$`).test(matchPrefix)
  if (allowedPrefixes !== null && !matchPrefixIsAllowed) return null

  const from = textFrom + match.index
  let to = from + match[0].length

  if (allowSpaces && suffix.test(text.slice(to - 1, to + 1))) {
    match[0] += ' '
    to += 1
  }

  if (from < $position.pos && to >= $position.pos) {
    return { range: { from, to }, query: match[0].slice(char.length), text: match[0] }
  }
  return null
}

/**
 * Находит начало последнего триггера в тексте перед курсором для удаления.
 *
 * Это упрощённый хелпер: он не применяет правила `allowedPrefixes`, пробелов и
 * границ matching-движка, поэтому его результат нельзя использовать как замену
 * `findSuggestionMatch` для показа меню.
 */
export function calculateStartPosition(
  pos: number,
  nodeBefore: { text?: string | null } | null | undefined,
  char: string | undefined,
): number {
  if (!nodeBefore?.text || !char) return pos
  const text = nodeBefore.text
  const index = text.lastIndexOf(char)
  return index === -1 ? pos : pos - text.substring(index).length
}

/**
 * Фильтрует и стабильно приоритизирует готовый набор пунктов по запросу.
 *
 * Поиск выполняется по title, subtext и keywords без изменения исходного
 * массива. Точное совпадение title и затем совпадение по префиксу получают
 * приоритет; одинаково релевантные элементы сохраняют исходный порядок.
 */
export function filterSuggestionItems<Context, T extends SuggestionItem<Context>>(
  items: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return items
  return items
    .filter(
      (item) =>
        !!(
          item.title.toLowerCase().includes(normalized) ||
          item.subtext?.toLowerCase().includes(normalized) ||
          item.keywords?.some((keyword) => keyword.toLowerCase().includes(normalized))
        ),
    )
    .sort((a, b) => {
      const first = a.title.toLowerCase()
      const second = b.title.toLowerCase()
      if (first === normalized && second !== normalized) return -1
      if (second === normalized && first !== normalized) return 1
      if (first.startsWith(normalized) && !second.startsWith(normalized)) return -1
      if (second.startsWith(normalized) && !first.startsWith(normalized)) return 1
      return 0
    })
}
