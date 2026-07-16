<template>
  <Button
    v-if="isVisible"
    type="button"
    variant="ghost"
    role="button"
    :tabindex="-1"
    :data-active-state="isActive ? 'on' : 'off'"
    :disabled="!canToggle"
    :data-disabled="!canToggle"
    aria-label="Caption"
    tooltip="Caption"
    @click="handleClick"
  >
    <slot>
      <ImageCaptionIcon class="tiptap-button-icon" />
      <span v-if="text" class="tiptap-button-text">{{ text }}</span>
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка подписи изображения (порт ImageCaptionButton из чанка 34p294mqk5mqb).
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { NodeSelection } from '@tiptap/pm/state'
import { Button } from '@/editor/components/primitives'
import { useTiptapEditor, useEditorSelectionSignal } from '@/editor/composables'

import { isExtensionAvailable, isNodeTypeSelected } from '../../utils/tiptap-utils'
import { ImageCaptionIcon } from '../../icons'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    text?: string
    hideWhenUnavailable?: boolean
  }>(),
  { hideWhenUnavailable: false },
)

const emit = defineEmits<{ set: [] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const signal = useEditorSelectionSignal(editor)

function canToggleCaption(instance: Editor | null): boolean {
  return (
    !!instance &&
    !!instance.isEditable &&
    !!isExtensionAvailable(instance, ['image']) &&
    isNodeTypeSelected(instance, ['image'])
  )
}

const canToggle = computed(() => (signal.value, canToggleCaption(editor.value)))
const isActive = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance) return false
  try {
    const { selection } = instance.state
    if (!(selection instanceof NodeSelection && selection.node.type.name === 'image')) return false
    return selection.node.attrs.showCaption === true || selection.node.content.size > 0
  } catch {
    return false
  }
})
const isVisible = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance) return false
  if (!props.hideWhenUnavailable) return true
  return (
    !!instance.isEditable &&
    !!isExtensionAvailable(instance, ['image']) &&
    canToggleCaption(instance)
  )
})

function handleClick() {
  const instance = editor.value
  if (!instance?.isEditable || !canToggleCaption(instance)) return
  try {
    const { selection } = instance.state
    if (!(selection instanceof NodeSelection && selection.node.type.name === 'image')) return
    if (!instance.chain().focus().updateAttributes('image', { showCaption: true }).run()) return
    const pos = selection.from
    instance
      .chain()
      .focus(pos + 1)
      .selectTextblockEnd()
      .run()
    emit('set')
  } catch {
    /* NodeSelection может быть уже невалиден */
  }
}
</script>
