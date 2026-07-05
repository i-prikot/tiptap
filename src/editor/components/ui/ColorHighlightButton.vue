<template>
  <Button
    v-if="highlight.isVisible.value"
    type="button"
    variant="ghost"
    :data-active-state="highlight.isActive.value ? 'on' : 'off'"
    role="button"
    :tabindex="tabindex ?? -1"
    :disabled="!highlight.canColorHighlight.value"
    :data-disabled="!highlight.canColorHighlight.value"
    :aria-label="highlight.label"
    :aria-pressed="highlight.isActive.value"
    :tooltip="tooltip ?? highlight.label"
    :style="{ '--highlight-color': highlightColor }"
    @click="handleClick"
  >
    <slot>
      <span class="tiptap-button-highlight" :style="{ '--highlight-color': highlightColor }" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
      <Badge v-if="showShortcut">{{ shortcutText }}</Badge>
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка цвета подсветки/фона (порт ColorHighlightButton из чанка 2mux2p9tadf0h).
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import Button from '../primitives/Button.vue'
import Badge from '../primitives/Badge.vue'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useColorHighlight } from '../../composables/useColorHighlight'
import type { HighlightMode } from '../../composables/useColorHighlight'
import { parseShortcutKeys } from '../../utils/tiptap-utils'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    highlightColor: string
    label?: string
    text?: string
    tooltip?: string
    tabindex?: number
    mode?: HighlightMode
    useColorValue?: boolean
    hideWhenUnavailable?: boolean
    showShortcut?: boolean
  }>(),
  { mode: 'mark', useColorValue: false, hideWhenUnavailable: false, showShortcut: false },
)

const emit = defineEmits<{ applied: [payload: { color: string; label: string; mode: HighlightMode }] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const highlight = useColorHighlight({
  editor,
  highlightColor: props.highlightColor,
  label: props.label || props.text || `Toggle highlight (${props.highlightColor})`,
  hideWhenUnavailable: props.hideWhenUnavailable,
  mode: props.mode,
  useColorValue: props.useColorValue,
  onApplied: payload => emit('applied', payload),
})

const shortcutText = computed(() => parseShortcutKeys({ shortcutKeys: highlight.shortcutKeys }).join(''))

function handleClick() {
  highlight.handleColorHighlight()
}
</script>
