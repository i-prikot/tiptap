<template>
  <SuggestionMenu
    char=":"
    plugin-key="emojiDropdownMenu"
    decoration-class="tiptap-emoji-decoration"
    selector="tiptap-emoji-dropdown-menu"
    :items="getEmojiItems"
  >
    <template #default="{ items, selectedIndex, onSelect }">
      <Card v-if="items.length" :style="{ maxHeight: 'var(--suggestion-menu-max-height)' }">
        <CardBody>
          <CardItemGroup>
            <EmojiMenuItem
              v-for="(item, index) in items"
              :key="item.title"
              :emoji="item.context as EmojiItem"
              :is-selected="index === selectedIndex"
              selector="[data-selector='tiptap-emoji-dropdown-menu']"
              @select="onSelect(item)"
            />
          </CardItemGroup>
        </CardBody>
      </Card>
    </template>
  </SuggestionMenu>
</template>

<script setup lang="ts">
/**
 * Меню эмодзи по `:` — фильтрация по имени/шорткодам/тегам, максимум 100.
 * Порт EmojiDropdownMenu из чанка 34p294mqk5mqb (модуль 248967).
 */
import type { Editor } from '@tiptap/vue-3'
import type { EmojiItem } from '@tiptap/extension-emoji'
import SuggestionMenu from './SuggestionMenu.vue'
import EmojiMenuItem from './EmojiMenuItem.vue'
import Card from '../primitives/card/Card.vue'
import CardBody from '../primitives/card/CardBody.vue'
import CardItemGroup from '../primitives/card/CardItemGroup.vue'
import type { SuggestionItem } from '../../utils/suggestion/suggestion'

/** Фильтрация базы эмодзи по запросу (порт getFilteredEmojis). */
function getFilteredEmojis(args: { query: string; emojis: EmojiItem[] }): EmojiItem[] {
  const { query, emojis } = args
  const trimmed = query.trim()
  const matched = trimmed
    ? emojis
        .filter((emoji) => {
          const normalized = trimmed.toLowerCase().trim()
          return (
            emoji.name.toLowerCase().includes(normalized) ||
            emoji.shortcodes.some((code) => code.toLowerCase().includes(normalized)) ||
            emoji.tags.some((tag) => tag.toLowerCase().includes(normalized))
          )
        })
        .slice(0, 100)
    : emojis.slice(0, 100)
  return matched.sort((a, b) => a.name.localeCompare(b.name))
}

function getEmojiItems({ query, editor }: { query: string; editor: Editor }): SuggestionItem[] {
  const emojis: EmojiItem[] = editor.extensionStorage.emoji?.emojis || []
  return getFilteredEmojis({ query, emojis }).map((emoji) => ({
    title: emoji.name,
    subtext: emoji.shortcodes.join(', '),
    context: emoji,
    onSelect: ({ editor: selectedEditor, range, context }) => {
      if (selectedEditor && range && context) {
        ;(selectedEditor.chain().focus() as any).setEmoji((context as EmojiItem).name).run()
      }
    },
  }))
}
</script>
