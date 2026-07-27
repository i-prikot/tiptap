const MAC_SYMBOLS: Record<string, string> = {
  mod: '⌘',
  command: '⌘',
  meta: '⌘',
  ctrl: '⌃',
  control: '⌃',
  alt: '⌥',
  option: '⌥',
  shift: '⇧',
  backspace: 'Del',
  delete: '⌦',
  enter: '⏎',
  escape: '⎋',
  capslock: '⇪',
}

function formatShortcutKey(key: string, isMac: boolean, capitalize = true) {
  if (isMac) return MAC_SYMBOLS[key.toLowerCase()] || (capitalize ? key.toUpperCase() : key)
  return capitalize ? key.charAt(0).toUpperCase() + key.slice(1) : key
}

/** Разбирает строку шортката (`mod+alt+0`) в массив отображаемых клавиш. */
export function parseShortcutKeys(args: {
  shortcutKeys: string | undefined
  delimiter?: string
  capitalize?: boolean
}): string[] {
  const { shortcutKeys, delimiter = '+', capitalize = true } = args
  if (!shortcutKeys) return []
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
  return shortcutKeys
    .split(delimiter)
    .map((key) => key.trim())
    .map((key) => formatShortcutKey(key, isMac, capitalize))
}
