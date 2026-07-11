import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clamp,
  handleImageUpload,
  MAX_FILE_SIZE,
  parseShortcutKeys,
  sanitizeUrl,
} from '../../../src/editor/utils/tiptap-utils'

const ownNavigatorPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform')

function setNavigatorPlatform(platform: string) {
  Object.defineProperty(navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

function createImageFile(size: number) {
  return new File([new Uint8Array(size)], 'image.png', { type: 'image/png' })
}

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()

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

  describe('handleImageUpload', () => {
    it('rejects when no file is provided', async () => {
      await expect(handleImageUpload(undefined as unknown as File)).rejects.toThrow(
        'No file provided',
      )
    })

    it('rejects files larger than the maximum size without scheduling upload progress', async () => {
      vi.useFakeTimers()

      const onProgress = vi.fn()
      const upload = handleImageUpload(createImageFile(MAX_FILE_SIZE + 1), onProgress)

      await expect(upload).rejects.toThrow('File size exceeds maximum allowed (5MB)')
      expect(onProgress).not.toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    })

    it('accepts a file at the size limit, reports every progress step, and resolves the placeholder', async () => {
      vi.useFakeTimers()

      const onProgress = vi.fn()
      const upload = handleImageUpload(createImageFile(MAX_FILE_SIZE), onProgress)

      expect(vi.getTimerCount()).toBe(1)
      await vi.advanceTimersByTimeAsync(5_500)

      await expect(upload).resolves.toBe('/images/tiptap-ui-placeholder-image.jpg')
      expect(onProgress).toHaveBeenCalledTimes(11)
      expect(onProgress.mock.calls.map(([event]) => event.progress)).toEqual([
        0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
      ])
      expect(vi.getTimerCount()).toBe(0)
    })

    it('rejects an already-aborted upload without scheduling progress', async () => {
      vi.useFakeTimers()

      const controller = new AbortController()
      const onProgress = vi.fn()
      controller.abort()

      const upload = handleImageUpload(createImageFile(1), onProgress, controller.signal)

      await expect(upload).rejects.toThrow('Upload cancelled')
      expect(onProgress).not.toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    })

    it('rejects after an emitted progress update when the upload is aborted', async () => {
      vi.useFakeTimers()

      const controller = new AbortController()
      const onProgress = vi.fn(({ progress }: { progress: number }) => {
        if (progress === 0) controller.abort()
      })
      const upload = handleImageUpload(createImageFile(1), onProgress, controller.signal)
      const uploadRejection = expect(upload).rejects.toThrow('Upload cancelled')

      await vi.advanceTimersByTimeAsync(500)
      expect(onProgress).toHaveBeenCalledExactlyOnceWith({ progress: 0 })

      await uploadRejection
      expect(onProgress).toHaveBeenCalledExactlyOnceWith({ progress: 0 })
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
