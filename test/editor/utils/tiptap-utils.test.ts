import { afterEach, describe, expect, it } from 'vitest'
import { clamp, parseShortcutKeys, sanitizeUrl } from '../../../src/editor/utils/tiptap-utils'

const ownNavigatorPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform')

function setNavigatorPlatform(platform: string) {
  Object.defineProperty(navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

afterEach(() => {
  if (ownNavigatorPlatform) {
    Object.defineProperty(navigator, 'platform', ownNavigatorPlatform)
  } else {
    Reflect.deleteProperty(navigator, 'platform')
  }
})

describe('tiptap utilities', () => {
  describe('clamp', () => {
    it('preserves values inside the inclusive range and bounds values outside it', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-1, 0, 10)).toBe(0)
      expect(clamp(11, 0, 10)).toBe(10)
    })
  })

  describe('parseShortcutKeys', () => {
    it('returns no keys when a shortcut is absent', () => {
      expect(parseShortcutKeys({ shortcutKeys: undefined })).toEqual([])
    })

    it('trims and formats plus-delimited shortcuts on non-macOS platforms', () => {
      setNavigatorPlatform('Win32')

      expect(parseShortcutKeys({ shortcutKeys: ' mod + alt + k ' })).toEqual(['Mod', 'Alt', 'K'])
    })

    it('maps macOS modifiers and special keys to their display symbols', () => {
      setNavigatorPlatform('MacIntel')

      expect(
        parseShortcutKeys({
          shortcutKeys: 'mod+control+option+shift+backspace+delete+enter+escape+capslock+a',
        }),
      ).toEqual(['⌘', '⌃', '⌥', '⇧', 'Del', '⌦', '⏎', '⎋', '⇪', 'A'])
    })

    it('honors custom delimiters and preserves ordinary key capitalization when requested', () => {
      setNavigatorPlatform('Linux x86_64')

      expect(
        parseShortcutKeys({
          shortcutKeys: 'ctrl | page down | z',
          delimiter: '|',
          capitalize: false,
        }),
      ).toEqual(['ctrl', 'page down', 'z'])
    })
  })

  describe('sanitizeUrl', () => {
    it('returns normalized safe absolute and base-resolved relative URLs', () => {
      expect(sanitizeUrl('https://example.com/path')).toBe('https://example.com/path')
      expect(sanitizeUrl('/images/photo.png', 'https://example.com/editor/')).toBe(
        'https://example.com/images/photo.png',
      )
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com')
    })

    it('accepts custom schemes provided as strings and objects', () => {
      expect(sanitizeUrl('geo:37.786971,-122.399677', undefined, ['geo'])).toBe(
        'geo:37.786971,-122.399677',
      )
      expect(sanitizeUrl('demo:document', undefined, [{ scheme: 'demo' }])).toBe('demo:document')
    })

    it('rejects dangerous, whitespace-obfuscated, and malformed URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('#')
      expect(sanitizeUrl('data:text/html,unsafe')).toBe('#')
      expect(sanitizeUrl('java\nscript:alert(1)')).toBe('#')
      expect(sanitizeUrl('java\tscript:alert(1)')).toBe('#')
      expect(sanitizeUrl('da ta:text/html,unsafe')).toBe('#')
      expect(sanitizeUrl('http://%')).toBe('#')
    })
  })
})
