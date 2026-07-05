<template>
  <Card
    ref="cardRef"
    :tabindex="0"
    :style="isMobile ? { boxShadow: 'none', border: 0 } : {}"
  >
    <CardBody :style="isMobile ? { padding: 0 } : {}">
      <CardItemGroup orientation="horizontal">
        <ButtonGroup orientation="horizontal">
          <ColorHighlightButton
            v-for="(color, index) in colors"
            :key="color.value"
            :highlight-color="useColorValue ? (color.colorValue ?? color.value) : color.value"
            :tooltip="color.label"
            :aria-label="`${color.label} highlight color`"
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
            aria-label="Remove highlight"
            tooltip="Remove highlight"
            :tabindex="selectedIndex === colors.length ? 0 : -1"
            :data-highlighted="selectedIndex === colors.length"
            @click="highlight.handleRemoveHighlight"
          >
            <BanIcon class="tiptap-button-icon" />
          </Button>
        </ButtonGroup>
      </CardItemGroup>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
/**
 * Компактная панель подсветки (5 цветов + сброс) для floating/mobile
 * тулбара. Порт ColorHighlightPopoverContent из чанка 3jdxmcvhjtoe-
 * (модуль 102971, функция f).
 */
import { computed, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import Card from '../primitives/card/Card.vue'
import CardBody from '../primitives/card/CardBody.vue'
import CardItemGroup from '../primitives/card/CardItemGroup.vue'
import ButtonGroup from '../primitives/ButtonGroup.vue'
import Button from '../primitives/Button.vue'
import Separator from '../primitives/Separator.vue'
import ColorHighlightButton from './ColorHighlightButton.vue'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useColorHighlight, pickHighlightColorsByValue } from '../../composables/useColorHighlight'
import type { HighlightColor, HighlightMode } from '../../composables/useColorHighlight'
import { useIsBreakpoint } from '../../composables/useIsBreakpoint'
import { useMenuNavigation } from '../../composables/useMenuNavigation'
import { BanIcon } from '../../icons'

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

const emit = defineEmits<{ applied: [payload: { color: string; label: string; mode: HighlightMode }] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const highlight = useColorHighlight({ editor })
const isMobile = useIsBreakpoint()

const cardRef = ref<ComponentPublicInstance | null>(null)
const containerRef = computed(() => (cardRef.value?.$el as HTMLElement | null) ?? null)

const navItems = computed(() => [...props.colors, { label: 'Remove highlight', value: 'none' }])

const { selectedIndex } = useMenuNavigation({
  editor: ref(null),
  containerRef: containerRef as never,
  query: ref(''),
  items: navItems,
  orientation: 'both',
  autoSelectFirstItem: false,
  onSelect: item => {
    const highlighted = containerRef.value?.querySelector<HTMLElement>('[data-highlighted="true"]')
    highlighted?.click()
    if (item.value === 'none') highlight.handleRemoveHighlight()
  },
})
</script>
