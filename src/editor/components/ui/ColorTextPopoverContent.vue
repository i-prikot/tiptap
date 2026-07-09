<template>
  <Card ref="cardRef" :tabindex="0" role="menu" class="tiptap-card-color-panel">
    <CardBody>
      <CardItemGroup v-if="isInitialized && recentColors.length">
        <CardGroupLabel>Recently used</CardGroupLabel>
        <ButtonGroup orientation="horizontal">
          <template
            v-for="(recent, index) in recentColors"
            :key="`recent-${recent.type}-${recent.value}`"
          >
            <ColorTextButton
              v-if="recent.type === 'text'"
              :text-color="recent.value"
              :label="recentLabel(recent)"
              :tooltip="recentLabel(recent)"
              :tabindex="selectedIndex === index ? 0 : -1"
              :data-highlighted="selectedIndex === index"
              @applied="onColorApplied('text', $event)"
            />
            <ColorHighlightButton
              v-else
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
        <CardGroupLabel>Text color</CardGroupLabel>
        <ButtonGroup
          v-for="(row, rowIndex) in textColorRows"
          :key="`text-row-${rowIndex}`"
          orientation="horizontal"
        >
          <ColorTextButton
            v-for="(color, colIndex) in row"
            :key="color.value"
            :text-color="color.value"
            :label="color.label"
            :tooltip="color.label"
            :aria-label="`${color.label} text color`"
            :tabindex="textIndex(rowIndex, colIndex) === selectedIndex ? 0 : -1"
            :data-highlighted="textIndex(rowIndex, colIndex) === selectedIndex"
            @applied="onColorApplied('text', $event)"
          />
        </ButtonGroup>
      </CardItemGroup>

      <CardItemGroup>
        <CardGroupLabel>Highlight color</CardGroupLabel>
        <ButtonGroup
          v-for="(row, rowIndex) in highlightColorRows"
          :key="`highlight-row-${rowIndex}`"
          orientation="horizontal"
        >
          <ColorHighlightButton
            v-for="(color, colIndex) in row"
            :key="color.value"
            :highlight-color="color.value"
            :label="color.label"
            :tooltip="color.label"
            :aria-label="`${color.label} highlight color`"
            :tabindex="highlightIndex(rowIndex, colIndex) === selectedIndex ? 0 : -1"
            :data-highlighted="highlightIndex(rowIndex, colIndex) === selectedIndex"
            @applied="onColorApplied('highlight', $event)"
          />
        </ButtonGroup>
      </CardItemGroup>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
/**
 * Панель выбора цвета текста/подсветки с недавними цветами и
 * клавиатурной навигацией. Порт внутреннего компонента
 * ColorTextPopover (чанк 2mux2p9tadf0h, функция j).
 */
import { computed, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import Card from '../primitives/card/Card.vue'
import CardBody from '../primitives/card/CardBody.vue'
import CardItemGroup from '../primitives/card/CardItemGroup.vue'
import CardGroupLabel from '../primitives/card/CardGroupLabel.vue'
import ButtonGroup from '../primitives/ButtonGroup.vue'
import ColorTextButton from './ColorTextButton.vue'
import ColorHighlightButton from './ColorHighlightButton.vue'
import { TEXT_COLORS } from '../../composables/useColorText'
import { HIGHLIGHT_COLORS } from '../../composables/useColorHighlight'
import { useRecentColors, getColorByValue } from '../../composables/useRecentColors'
import type { RecentColor } from '../../composables/useRecentColors'
import { useMenuNavigation } from '../../composables/useMenuNavigation'
import { chunkArray } from '../../utils/tiptap-utils'

const props = withDefaults(
  defineProps<{ maxColorsPerGroup?: number; maxRecentColors?: number }>(),
  {
    maxColorsPerGroup: 5,
    maxRecentColors: 3,
  },
)

const emit = defineEmits<{ colorChanged: [payload: RecentColor] }>()

const { recentColors, addRecentColor, isInitialized } = useRecentColors(props.maxRecentColors)

const cardRef = ref<ComponentPublicInstance | null>(null)
const containerRef = computed(() => (cardRef.value?.$el as HTMLElement | null) ?? null)

const textColorRows = chunkArray(TEXT_COLORS, props.maxColorsPerGroup)
const highlightColorRows = chunkArray(HIGHLIGHT_COLORS, props.maxColorsPerGroup)

const recentCount = computed(() => (isInitialized.value ? recentColors.value.length : 0))

function textIndex(rowIndex: number, colIndex: number): number {
  return recentCount.value + rowIndex * props.maxColorsPerGroup + colIndex
}
function highlightIndex(rowIndex: number, colIndex: number): number {
  return recentCount.value + TEXT_COLORS.length + rowIndex * props.maxColorsPerGroup + colIndex
}

function recentLabel(recent: RecentColor): string {
  const palette = recent.type === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS
  const found = getColorByValue(recent.value, palette)
  return found.label === found.value ? recent.label : found.label
}

interface NavItem extends RecentColor {}

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = []
  if (isInitialized.value) {
    for (const recent of recentColors.value) {
      items.push({ type: recent.type, value: recent.value, label: recentLabel(recent) })
    }
  }
  for (const color of TEXT_COLORS)
    items.push({ type: 'text', value: color.value, label: color.label })
  for (const color of HIGHLIGHT_COLORS)
    items.push({ type: 'highlight', value: color.value, label: color.label })
  return items
})

const { selectedIndex } = useMenuNavigation<NavItem>({
  editor: ref(null),
  containerRef: containerRef as never,
  query: ref(''),
  items: navItems,
  orientation: 'both',
  autoSelectFirstItem: false,
  onSelect: () => {
    const highlighted = containerRef.value?.querySelector<HTMLElement>('[data-highlighted="true"]')
    highlighted?.click()
  },
})

function onColorApplied(type: 'text' | 'highlight', payload: { color: string; label: string }) {
  const color: RecentColor = { type, value: payload.color, label: payload.label }
  addRecentColor(color)
  emit('colorChanged', color)
}
</script>
