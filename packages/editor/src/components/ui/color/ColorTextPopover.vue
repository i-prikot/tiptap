<template>
  <ColorPopoverShell :visible="isVisible">
    <template #trigger>
      <Button
        type="button"
        variant="ghost"
        data-appearance="default"
        role="button"
        :aria-label="label"
        :tooltip="label"
        :disabled="!canToggle"
        :data-disabled="!canToggle"
      >
        <span
          class="tiptap-button-color-text-popover"
          :style="
            activeHighlight.color ? { '--active-highlight-color': activeHighlight.color } : {}
          "
        >
          <TextColorSmallIcon
            class="tiptap-button-icon"
            :style="{ color: activeTextStyle.color || undefined }"
          />
        </span>
        <ChevronDownIcon class="tiptap-button-dropdown-small" />
      </Button>
    </template>
    <ColorTextPopoverContent :editor="editor" @color-changed="onColorChanged" />
  </ColorPopoverShell>
</template>

<script setup lang="ts">
/**
 * Поповер выбора цвета текста/подсветки для floating тулбара.
 * Порт ColorTextPopover + useColorTextPopover из чанка 2mux2p9tadf0h
 * (модуль 681239/959411).
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button } from '../../primitives'
import ColorPopoverShell from './ColorPopoverShell.vue'
import ColorTextPopoverContent from './ColorTextPopoverContent.vue'
import {
  useTiptapEditor,
  useEditorSelectionSignal,
  canColorText,
  canColorHighlight,
} from '../../../composables'

import type { RecentColor } from '../../../types/color'
import { getActiveMarkAttrs } from '../../../utils/tiptap-utils'
import { ChevronDownIcon, TextColorSmallIcon } from '../../../icons'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    hideWhenUnavailable?: boolean
  }>(),
  { hideWhenUnavailable: false },
)

const emit = defineEmits<{ colorChanged: [payload: RecentColor] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const signal = useEditorSelectionSignal(editor)

const label = 'Text color'

const canToggle = computed(
  () => (signal.value, canColorText(editor.value) || canColorHighlight(editor.value)),
)
const isVisible = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance) return false
  if (!props.hideWhenUnavailable) return true
  return (
    !!instance.isEditable &&
    (!!instance.isActive('code') || canColorText(instance) || canColorHighlight(instance))
  )
})

const activeTextStyle = computed<Record<string, any>>(
  () => (signal.value, getActiveMarkAttrs(editor.value, 'textStyle') || {}),
)
const activeHighlight = computed<Record<string, any>>(
  () => (signal.value, getActiveMarkAttrs(editor.value, 'highlight') || {}),
)

function onColorChanged(payload: RecentColor) {
  emit('colorChanged', payload)
}
</script>
