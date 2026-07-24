<template>
  <ColorPopoverPanel
    :items="navItems"
    :on-select="onNavigationSelect"
    :style="isMobile ? { boxShadow: 'none', border: 0 } : {}"
  >
    <template #default="{ selectedIndex }">
      <CardBody :style="isMobile ? { padding: 0 } : {}">
        <CardItemGroup orientation="horizontal">
          <ButtonGroup orientation="horizontal">
            <ColorHighlightButton
              v-for="(color, index) in colors"
              :key="color.value"
              :editor="editor"
              :highlight-color="useColorValue ? (color.colorValue ?? color.value) : color.value"
              :label="colorLabel(color)"
              :tooltip="colorLabel(color)"
              :aria-label="t('colors.highlightColorAria', { color: colorLabel(color) })"
              :tabindex="index === selectedIndex ? 0 : -1"
              :data-highlighted="selectedIndex === index"
              :use-color-value="useColorValue"
              @applied="emit('applied', $event)"
            />
          </ButtonGroup>
          <Separator />
          <ButtonGroup orientation="horizontal">
            <Button
              type="button"
              role="menuitem"
              variant="ghost"
              :aria-label="t('colors.removeHighlight')"
              :tooltip="t('colors.removeHighlight')"
              :tabindex="selectedIndex === colors.length ? 0 : -1"
              :data-highlighted="selectedIndex === colors.length"
              @click="highlight.handleRemoveHighlight"
            >
              <BanIcon class="tiptap-button-icon" />
            </Button>
          </ButtonGroup>
        </CardItemGroup>
      </CardBody>
    </template>
  </ColorPopoverPanel>
</template>

<script setup lang="ts">
/**
 * Компактная панель подсветки (5 цветов + сброс) для floating/mobile
 * тулбара. Порт ColorHighlightPopoverContent из чанка 3jdxmcvhjtoe-
 * (модуль 102971, функция f).
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { CardBody, CardItemGroup, ButtonGroup, Button, Separator } from '../../primitives'

import ColorPopoverPanel from './ColorPopoverPanel.vue'
import ColorHighlightButton from './ColorHighlightButton.vue'
import {
  useEditorI18n,
  useTiptapEditor,
  useColorHighlight,
  pickHighlightColorsByValue,
  type HighlightMode,
  useIsBreakpoint,
} from '../../../composables'

import type { HighlightColor } from '../../../types/color'

import { BanIcon } from '../../../icons'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    colors?: HighlightColor[]
    useColorValue?: boolean
  }>(),
  {
    colors: () =>
      pickHighlightColorsByValue([
        'var(--tt-color-highlight-green)',
        'var(--tt-color-highlight-blue)',
        'var(--tt-color-highlight-red)',
        'var(--tt-color-highlight-purple)',
        'var(--tt-color-highlight-yellow)',
      ]),
    useColorValue: false,
  },
)

const emit = defineEmits<{
  applied: [payload: { color: string; label: string; mode: HighlightMode }]
}>()

const editor = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()
const highlight = useColorHighlight({ editor, label: computed(() => t('colors.highlight')) })
const isMobile = useIsBreakpoint()

function colorLabel(color: HighlightColor): string {
  return color.labelKey ? t(color.labelKey) : (color.label ?? color.value)
}

const navItems = computed(() => [
  ...props.colors.map((color) => ({ ...color, label: colorLabel(color) })),
  { label: t('colors.removeHighlight'), value: 'none' },
])

function onNavigationSelect(item: unknown) {
  if (typeof item === 'object' && item !== null && 'value' in item && item.value === 'none') {
    highlight.handleRemoveHighlight()
  }
}
</script>
