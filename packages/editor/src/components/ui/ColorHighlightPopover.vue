<template>
  <ColorPopoverShell :visible="highlight.isVisible.value">
    <template #trigger>
      <Button
        type="button"
        variant="ghost"
        data-appearance="default"
        role="button"
        :tabindex="-1"
        :disabled="!highlight.canColorHighlight.value"
        :data-active-state="highlight.isActive.value ? 'on' : 'off'"
        :data-disabled="!highlight.canColorHighlight.value"
        :aria-pressed="highlight.isActive.value"
        :aria-label="highlight.label"
        :tooltip="highlight.label"
      >
        <component :is="highlight.Icon" class="tiptap-button-icon" />
      </Button>
    </template>
    <ColorHighlightPopoverContent
      :editor="editor"
      :colors="colors"
      :use-color-value="useColorValue"
      @applied="onApplied"
    />
  </ColorPopoverShell>
</template>

<script setup lang="ts">
/**
 * Поповер подсветки для десктопного floating тулбара.
 * Порт ColorHighlightPopover из чанка 3jdxmcvhjtoe- (модуль 102971).
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button } from '../primitives'
import ColorPopoverShell from './ColorPopoverShell.vue'
import ColorHighlightPopoverContent from './ColorHighlightPopoverContent.vue'
import { useTiptapEditor, useColorHighlight, type HighlightMode } from '../../composables'

import type { HighlightColor } from '../../types/color'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    colors?: HighlightColor[]
    hideWhenUnavailable?: boolean
    useColorValue?: boolean
  }>(),
  { hideWhenUnavailable: false, useColorValue: false },
)

const emit = defineEmits<{
  applied: [payload: { color: string; label: string; mode: HighlightMode }]
}>()

const editor = useTiptapEditor(computed(() => props.editor))
const highlight = useColorHighlight({
  editor,
  hideWhenUnavailable: props.hideWhenUnavailable,
  onApplied: (payload) => emit('applied', payload),
})

const colors = computed(() => props.colors)
const useColorValue = computed(() => props.useColorValue)

function onApplied(payload: { color: string; label: string; mode: HighlightMode }) {
  emit('applied', payload)
}
</script>
