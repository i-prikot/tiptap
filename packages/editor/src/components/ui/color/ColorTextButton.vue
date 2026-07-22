<template>
  <Button
    v-if="color.isVisible.value"
    type="button"
    variant="ghost"
    :data-active-state="color.isActive.value ? 'on' : 'off'"
    role="button"
    :tabindex="tabindex ?? -1"
    :disabled="!color.canColorText.value"
    :data-disabled="!color.canColorText.value"
    :aria-label="color.label"
    :aria-pressed="color.isActive.value"
    :tooltip="tooltip ?? color.label"
    :style="{ '--color-text-button-color': textColor }"
    @click="handleClick"
  >
    <slot>
      <span class="tiptap-button-color-text" :style="{ color: textColor }">
        <component
          :is="color.Icon"
          class="tiptap-button-icon"
          :style="{ color: textColor, flexGrow: 1 }"
        />
      </span>
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
      <Badge v-if="showShortcut">{{ shortcutText }}</Badge>
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка цвета текста (порт ColorTextButton из чанка 2mux2p9tadf0h).
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button, Badge } from '../../primitives'

import { useTiptapEditor, useColorText } from '../../../composables'

import { parseShortcutKeys } from '../../../utils/tiptap-utils'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    textColor: string
    label?: string
    text?: string
    tooltip?: string
    tabindex?: number
    hideWhenUnavailable?: boolean
    showShortcut?: boolean
  }>(),
  { hideWhenUnavailable: false, showShortcut: false },
)

const emit = defineEmits<{ applied: [payload: { color: string; label: string }] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const color = useColorText({
  editor,
  textColor: props.textColor,
  label: props.label || props.text,
  hideWhenUnavailable: props.hideWhenUnavailable,
  onApplied: (payload) => emit('applied', payload),
})

const shortcutText = computed(() =>
  parseShortcutKeys({ shortcutKeys: color.shortcutKeys }).join(''),
)

function handleClick() {
  color.handleColorText()
}
</script>
