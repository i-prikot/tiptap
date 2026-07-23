import { afterEach, describe, expect, it, vi } from 'vitest'

const extensionKitOptions = {
  provider: null,
  ydoc: {} as never,
  placeholder: 'Start writing...',
  user: { id: 'test-user', name: 'Test User', color: '#000000' },
  features: {
    tocSidebar: false,
    floatingMenus: false,
    mobileToolbar: false,
    tableControls: false,
  },
  imageUpload: vi.fn(),
  onImageUploadError: vi.fn(),
  onTableOfContentsUpdate: vi.fn(),
}

afterEach(() => {
  vi.doUnmock('@tiptap/extension-emoji')
  vi.resetModules()
})

describe('createExtensionKit emoji loading', () => {
  it('loads and configures the filtered GitHub catalog before returning extensions', async () => {
    const emojiExtension = { name: 'emoji' }
    const configureEmoji = vi.fn(() => emojiExtension)

    vi.doMock('@tiptap/extension-emoji', () => ({
      Emoji: { configure: configureEmoji },
      gitHubEmojis: [{ name: 'smile' }, { name: 'regional_indicator_a' }, { name: 'rocket' }],
    }))

    const { createExtensionKit } =
      await import('../../../packages/schema/src/extensions/extension-kit')
    const extensions = await createExtensionKit(extensionKitOptions)

    expect(configureEmoji).toHaveBeenCalledWith({
      emojis: [{ name: 'smile' }, { name: 'rocket' }],
      forceFallbackImages: true,
    })
    expect(extensions).toContain(emojiExtension)
  }, 30_000)

  it('rejects initialization when the lazy emoji module import fails', async () => {
    vi.doMock('@tiptap/extension-emoji', () => {
      throw new Error('emoji module unavailable')
    })

    const { createExtensionKit } =
      await import('../../../packages/schema/src/extensions/extension-kit')

    await expect(createExtensionKit(extensionKitOptions)).rejects.toThrow()
  }, 30_000)
})
