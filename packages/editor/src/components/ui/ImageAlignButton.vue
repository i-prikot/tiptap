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
// Кнопка выравнивания изображения (порт ImageAlignButton из чанка 34p294mqk5mqb).
import { computed } from 'vue'
import type { FunctionalComponent } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { NodeSelection } from '@tiptap/pm/state'
import { Button, Badge } from '../primitives'

import { useTiptapEditor, useEditorSelectionSignal } from '../../composables'

import { isExtensionAvailable, parseShortcutKeys } from '../../utils/tiptap-utils'
import { AlignCenterVerticalIcon, AlignEndVerticalIcon, AlignStartVerticalIcon } from '../../icons'

type ImageAlign = 'left' | 'center' | 'right'

const SHORTCUTS: Record<ImageAlign, string> = {
  left: 'alt+shift+l',
  center: 'alt+shift+e',
  right: 'alt+shift+r',
}
const LABELS: Record<ImageAlign, string> = {
  left: 'Image align left',
  center: 'Image align center',
  right: 'Image align right',
}

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
const signal = useEditorSelectionSignal(editor)

function canAlignImage(instance: Editor | null): boolean {
  return (
    !!instance &&
    !!instance.isEditable &&
    !!isExtensionAvailable(instance, [props.extensionName]) &&
    instance.can().updateAttributes(props.extensionName, { [props.attributeName]: props.align })
  )
}

const canAlign = computed(() => (signal.value, canAlignImage(editor.value)))
const isActive = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance || !instance.isEditable || !isExtensionAvailable(instance, [props.extensionName]))
    return false
  return (
    (instance.getAttributes(props.extensionName)[props.attributeName] || 'left') === props.align
  )
})
const isVisible = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance || !instance.isEditable) return false
  if (!props.hideWhenUnavailable) return true
  return !!isExtensionAvailable(instance, [props.extensionName]) && canAlignImage(instance)
})

const label = LABELS[props.align]
const shortcutText = computed(() =>
  parseShortcutKeys({ shortcutKeys: SHORTCUTS[props.align] }).join(''),
)

function handleClick() {
  const instance = editor.value
  if (!instance || !canAlignImage(instance)) return
  try {
    const { selection } = instance.state
    const isNode = selection instanceof NodeSelection
    const pos = isNode ? selection.from : selection.$anchor.pos
    const applied = instance
      .chain()
      .focus()
      .updateAttributes(props.extensionName, { [props.attributeName]: props.align })
      .run()
    if (applied && isNode) instance.commands.setNodeSelection(pos)
    if (applied) emit('aligned')
  } catch {
    /* updateAttributes может бросить на нестандартной схеме */
  }
}
</script>
