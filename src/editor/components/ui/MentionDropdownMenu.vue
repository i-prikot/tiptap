<template>
  <SuggestionMenu
    char="@"
    plugin-key="mentionDropdownMenu"
    decoration-class="tiptap-mention-decoration"
    selector="tiptap-mention-dropdown-menu"
    :items="getMentionItems"
  >
    <template #default="{ items, selectedIndex, onSelect }">
      <Card v-if="items.length" :style="{ maxHeight: 'var(--suggestion-menu-max-height)' }">
        <CardBody>
          <CardItemGroup>
            <MentionMenuItem
              v-for="(item, index) in items"
              :key="(item.context as MentionUser)?.id ?? item.title"
              :item="item"
              :is-selected="index === selectedIndex"
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
 * Меню меншенов по `@`: демо-каталог пользователей с аватарами
 * (как в оригинале). Порт MentionDropdownMenu из чанка 34p294mqk5mqb
 * (модуль 606896).
 */
import SuggestionMenu from './SuggestionMenu.vue'
import MentionMenuItem from './MentionMenuItem.vue'
import Card from '../primitives/card/Card.vue'
import CardBody from '../primitives/card/CardBody.vue'
import CardItemGroup from '../primitives/card/CardItemGroup.vue'
import type { SuggestionItem } from '../../utils/suggestion/suggestion'

export interface MentionUser {
  id: number
  name: string
  position: string
  avatarUrl: string
}

const USER_DIRECTORY: MentionUser[] = (
  [
    ['Emily Johnson', 'Marketing Manager'],
    ['Michael Thompson', 'Sales Manager'],
    ['Sophia Lee', 'Product Designer'],
    ['William Davis', 'IT Project Manager'],
    ['Olivia Wilson', 'HR Specialist'],
    ['Daniel Taylor', 'Financial Controller'],
    ['Isabella Anderson', 'Graphic Designer'],
    ['Jacob Martinez', 'Sales Representative'],
    ['Ava Hernandez', 'Marketing Assistant'],
    ['Alexander Diaz', 'IT Support'],
    ['Emma Ramirez', 'HR Specialist'],
    ['Ethan Flores', 'Product Manager'],
    ['Mia Morales', 'Graphic Designer'],
    ['Noah Reyes', 'Sales Manager'],
    ['Isabella Castillo', 'Marketing Manager'],
    ['Liam Gutierrez', 'IT Project Manager'],
    ['Avery Jimenez', 'HR Specialist'],
    ['Lucas Vargas', 'Product Designer'],
    ['Chloe Rojas', 'Graphic Designer'],
    ['Kai Zhang', 'Sales Representative'],
  ] as const
).map(([name, position], index) => {
  const id = index + 1
  const padded = id < 10 ? `0${id}` : `${id}`
  return { id, name, position, avatarUrl: `/avatars/memoji_${padded}.png` }
})

async function searchUsers(query: string): Promise<MentionUser[]> {
  if (!query) return USER_DIRECTORY
  const normalized = query.toLowerCase()
  return USER_DIRECTORY.filter(
    (user) =>
      user.name.toLowerCase().includes(normalized) ||
      user.position.toLowerCase().includes(normalized),
  )
}

async function getMentionItems({ query }: { query: string }): Promise<SuggestionItem[]> {
  const users = await searchUsers(query)
  return users.map((user) => ({
    title: user.name,
    subtext: user.position,
    context: user,
    onSelect: ({ editor, range, context }) => {
      if (!editor || !range || !context) return
      const user = context as MentionUser
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          { type: 'mention', attrs: { id: user.id.toString(), label: user.name } },
          { type: 'text', text: ' ' },
        ])
        .run()
    },
  }))
}
</script>
