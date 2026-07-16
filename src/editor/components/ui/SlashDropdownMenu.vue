<template>
  <SuggestionMenu
    char="/"
    plugin-key="slashDropdownMenu"
    decoration-class="tiptap-slash-decoration"
    decoration-content="Filter..."
    selector="tiptap-slash-dropdown-menu"
    :items="getFilteredItems"
  >
    <template #default="{ items, selectedIndex, onSelect }">
      <Card
        v-if="items.length"
        class="tiptap-slash-card"
        :style="{ maxHeight: 'var(--suggestion-menu-max-height)' }"
      >
        <CardBody class="tiptap-slash-card-body">
          <template v-if="showGroups">
            <template
              v-for="(group, groupIndex) in groupItems(items)"
              :key="`group-${groupIndex}-${group.label}`"
            >
              <Separator v-if="groupIndex > 0" orientation="horizontal" />
              <CardItemGroup v-if="group.label">
                <CardGroupLabel>{{ group.label }}</CardGroupLabel>
                <SlashMenuItem
                  v-for="entry in group.entries"
                  :key="`item-${entry.index}-${entry.item.title}`"
                  :item="entry.item"
                  :is-selected="entry.index === selectedIndex"
                  @select="onSelect(entry.item)"
                />
              </CardItemGroup>
              <template v-else>
                <SlashMenuItem
                  v-for="entry in group.entries"
                  :key="`item-${entry.index}-${entry.item.title}`"
                  :item="entry.item"
                  :is-selected="entry.index === selectedIndex"
                  @select="onSelect(entry.item)"
                />
              </template>
            </template>
          </template>
          <template v-else>
            <SlashMenuItem
              v-for="(item, index) in items"
              :key="`item-${index}-${item.title}`"
              :item="item"
              :is-selected="index === selectedIndex"
              @select="onSelect(item)"
            />
          </template>
        </CardBody>
      </Card>
    </template>
  </SuggestionMenu>
</template>

<script setup lang="ts">
/**
 * Слэш-меню (`/`): вставка и преобразование блоков, сгруппированные по
 * категориям AI/Style/Insert/Upload. Порт SlashDropdownMenu из чанка
 * 1_-l0xapy_wlh (модуль 204748).
 */
import type { Editor } from '@tiptap/core'
import SuggestionMenu from './SuggestionMenu.vue'
import SlashMenuItem from './SlashMenuItem.vue'
import {
  Card,
  CardBody,
  CardItemGroup,
  CardGroupLabel,
  Separator,
} from '@/editor/components/primitives'

import { filterSuggestionItems } from '../../utils/suggestion/suggestion'
import { getSlashMenuItems } from './slash-menu-items'
import type { SlashMenuConfig, SlashMenuItem as SlashMenuEntry } from './slash-menu-items'

const props = withDefaults(defineProps<{ config?: SlashMenuConfig; aiEnabled?: boolean }>(), {
  aiEnabled: false,
})

const showGroups = props.config?.showGroups !== false

function getFilteredItems({ query, editor }: { query: string; editor: Editor }): SlashMenuEntry[] {
  return filterSuggestionItems(getSlashMenuItems(editor, props.config, props.aiEnabled), query)
}

interface GroupedEntries {
  label: string
  entries: Array<{ item: SlashMenuEntry; index: number }>
}

/** Группировка пунктов с сохранением исходных индексов для подсветки. */
function groupItems(items: SlashMenuEntry[]): GroupedEntries[] {
  const groups = new Map<string, GroupedEntries>()
  items.forEach((item, index) => {
    const label = item.group || ''
    if (!groups.has(label)) groups.set(label, { label, entries: [] })
    groups.get(label)!.entries.push({ item, index })
  })
  return [...groups.values()]
}
</script>
