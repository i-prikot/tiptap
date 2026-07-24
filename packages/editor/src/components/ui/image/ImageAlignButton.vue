<template>
  <Button
    v-if="isVisible"
    type="button"
    variant="ghost"
    role="button"
    :tabindex="-1"
    :data-active-state="isActive ? 'on' : 'off'"
    :disabled="!canAlign"
    :data-disabled="!canAlign"
    :aria-label="label"
    :aria-pressed="isActive"
    :tooltip="label"
    @click="handleClick"
  >
    <slot>
      <component :is="icons[align]" class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
      <Badge v-if="showShortcut">{{ shortcutText }}</Badge>
    </slot>
  </Button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FunctionalComponent } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button, Badge } from '../../primitives'
import { useEditorI18n, useImageAlign, useTiptapEditor } from '../../../composables'
import { parseShortcutKeys } from '../../../utils/tiptap-utils'
import {
  AlignCenterVerticalIcon,
  AlignEndVerticalIcon,
  AlignStartVerticalIcon,
} from '../../../icons'

type ImageAlign = 'left' | 'center' | 'right'

const imageAlignLabelKeys = {
  left: 'image.alignLeft',
  center: 'image.alignCenter',
  right: 'image.alignRight',
} as const

const icons: Record<ImageAlign, FunctionalComponent> = {
  left: AlignStartVerticalIcon,
  center: AlignCenterVerticalIcon,
  right: AlignEndVerticalIcon,
}

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    align: ImageAlign
    text?: string
    extensionName?: string
    attributeName?: string
    hideWhenUnavailable?: boolean
    showShortcut?: boolean
  }>(),
  {
    extensionName: 'image',
    attributeName: 'data-align',
    hideWhenUnavailable: false,
    showShortcut: false,
  },
)

const emit = defineEmits<{ aligned: [] }>()
const editor = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()
const { canAlign, isActive, isVisible, execute, shortcutKeys } = useImageAlign({
  editor,
  align: computed(() => props.align),
  extensionName: computed(() => props.extensionName),
  attributeName: computed(() => props.attributeName),
  hideWhenUnavailable: computed(() => props.hideWhenUnavailable),
})
const label = computed(() => t(imageAlignLabelKeys[props.align]))
const shortcutText = computed(() =>
  parseShortcutKeys({ shortcutKeys: shortcutKeys.value }).join(''),
)

function handleClick() {
  if (execute()) emit('aligned')
}
</script>
