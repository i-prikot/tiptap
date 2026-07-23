import { Emoji, gitHubEmojis } from '@tiptap/extension-emoji'

import { createRendererExtensionKitWithEmoji } from './extension-kit.js'

const emojiOptions = {
  emojis: gitHubEmojis.filter((emoji) => !emoji.name.includes('regional')),
  forceFallbackImages: true,
}

export function createRendererExtensionKit() {
  return createRendererExtensionKitWithEmoji(Emoji.configure(emojiOptions))
}
