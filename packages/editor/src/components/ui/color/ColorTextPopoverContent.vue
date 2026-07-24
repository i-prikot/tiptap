<template>
  <ColorPopoverPanel :items="navItems" role="menu" class="tiptap-card-color-panel">
    <template #default="{ selectedIndex }">
      <CardBody>
        <CardItemGroup v-if="isInitialized && recentColors.length">
          <CardGroupLabel>{{ t('colors.recentlyUsed') }}</CardGroupLabel>
          <ButtonGroup orientation="horizontal">
            <template
              v-for="(recent, index) in recentColors"
              :key="`recent-${recent.type}-${recent.value}`"
            >
              <ColorTextButton
                v-if="recent.type === 'text'"
                :editor="editor"
                :text-color="recent.value"
                :label="recentLabel(recent)"
                :tooltip="recentLabel(recent)"
                :tabindex="selectedIndex === index ? 0 : -1"
                :data-highlighted="selectedIndex === index"
                @applied="onColorApplied('text', $event)"
              />
              <ColorHighlightButton
                v-else
                :editor="editor"
                :highlight-color="recent.value"
                :label="recentLabel(recent)"
                :tooltip="recentLabel(recent)"
                :tabindex="selectedIndex === index ? 0 : -1"
                :data-highlighted="selectedIndex === index"
                @applied="onColorApplied('highlight', $event)"
              />
            </template>
          </ButtonGroup>
        </CardItemGroup>

        <CardItemGroup>
          <CardGroupLabel>{{ t('colors.textColor') }}</CardGroupLabel>
          <ButtonGroup
            v-for="(row, rowIndex) in textColorRows"
            :key="`text-row-${rowIndex}`"
            orientation="horizontal"
          >
            <ColorTextButton
              v-for="(color, colIndex) in row"
              :key="color.value"
              :editor="editor"
              :text-color="color.value"
              :label="colorLabel(color)"
              :tooltip="colorLabel(color)"
              :aria-label="t('colors.textColorAria', { color: colorLabel(color) })"
              :tabindex="textIndex(rowIndex, colIndex) === selectedIndex ? 0 : -1"
              :data-highlighted="textIndex(rowIndex, colIndex) === selectedIndex"
              @applied="onColorApplied('text', $event)"
            />
          </ButtonGroup>
        </CardItemGroup>

        <CardItemGroup>
          <CardGroupLabel>{{ t('colors.highlightColor') }}</CardGroupLabel>
          <ButtonGroup
            v-for="(row, rowIndex) in highlightColorRows"
            :key="`highlight-row-${rowIndex}`"
            orientation="horizontal"
          >
            <ColorHighlightButton
              v-for="(color, colIndex) in row"
              :key="color.value"
              :editor="editor"
              :highlight-color="color.value"
              :label="colorLabel(color)"
              :tooltip="colorLabel(color)"
              :aria-label="t('colors.highlightColorAria', { color: colorLabel(color) })"
              :tabindex="highlightIndex(rowIndex, colIndex) === selectedIndex ? 0 : -1"
              :data-highlighted="highlightIndex(rowIndex, colIndex) === selectedIndex"
              @applied="onColorApplied('highlight', $event)"
            />
          </ButtonGroup>
        </CardItemGroup>
      </CardBody>
    </template>
  </ColorPopoverPanel>
</template>

<script setup lang="ts">
/**
 * Панель выбора цвета текста/подсветки с недавними цветами и
 * клавиатурной навигацией. Порт внутреннего компонента
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { CardBody, CardItemGroup, CardGroupLabel, ButtonGroup } from '../../primitives'

import ColorPopoverPanel from './ColorPopoverPanel.vue'
import ColorTextButton from './ColorTextButton.vue'
import ColorHighlightButton from './ColorHighlightButton.vue'
import {
  useTiptapEditor,
  useEditorI18n,
  TEXT_COLORS,
  HIGHLIGHT_COLORS,
  useRecentColors,
} from '../../../composables'

import type { HighlightColor, RecentColor, TextColor } from '../../../types/color'
import { chunkArray } from '../../../utils/tiptap-utils'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    maxColorsPerGroup?: number
    maxRecentColors?: number
  }>(),
  {
    maxColorsPerGroup: 5,
    maxRecentColors: 3,
  },
)

const emit = defineEmits<{ colorChanged: [payload: RecentColor] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()
const { recentColors, addRecentColor, isInitialized } = useRecentColors(props.maxRecentColors)

const textColorRows = computed(() => chunkArray(TEXT_COLORS, props.maxColorsPerGroup))
const highlightColorRows = computed(() => chunkArray(HIGHLIGHT_COLORS, props.maxColorsPerGroup))

const recentCount = computed(() => (isInitialized.value ? recentColors.value.length : 0))

function textIndex(rowIndex: number, colIndex: number): number {
  return recentCount.value + rowIndex * props.maxColorsPerGroup + colIndex
}
function highlightIndex(rowIndex: number, colIndex: number): number {
  return recentCount.value + TEXT_COLORS.length + rowIndex * props.maxColorsPerGroup + colIndex
}

function recentLabel(recent: RecentColor): string {
  const palette = recent.type === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS
  const paletteColor = palette.find((color) => color.value === recent.value)
  return paletteColor ? colorLabel(paletteColor) : recent.label
}

function colorLabel(color: TextColor | HighlightColor): string {
  return color.labelKey ? t(color.labelKey) : (color.label ?? color.value)
}

const navItems = computed<RecentColor[]>(() => {
  const items: RecentColor[] = []
  if (isInitialized.value) {
    for (const recent of recentColors.value) {
      items.push({ type: recent.type, value: recent.value, label: recentLabel(recent) })
    }
  }
  for (const color of TEXT_COLORS)
    items.push({ type: 'text', value: color.value, label: colorLabel(color) })
  for (const color of HIGHLIGHT_COLORS)
    items.push({ type: 'highlight', value: color.value, label: colorLabel(color) })
  return items
})

function onColorApplied(type: 'text' | 'highlight', payload: { color: string; label: string }) {
  const color: RecentColor = { type, value: payload.color, label: payload.label }
  addRecentColor(color)
  emit('colorChanged', color)
}
</script>
