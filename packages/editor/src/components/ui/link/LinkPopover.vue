<template>
  <Popover v-if="link.isVisible.value" :open="open" @update:open="onOpenChange">
    <template #trigger>
      <LinkButton
        :disabled="!link.canSet.value"
        :data-active-state="link.isActive.value ? 'on' : 'off'"
        :data-disabled="!link.canSet.value"
        :aria-label="link.label"
        :aria-pressed="link.isActive.value"
        :tooltip="link.label"
      />
    </template>
    <LinkContent :editor="activeEditor" @set-link="onSetLink" />
  </Popover>
</template>

<script setup lang="ts">
/**
 * Поповер редактирования ссылки для floating тулбара.
 * Порт LinkPopover из чанка 1mpndbcfk3lik (модуль 895238).
 */
import { computed, ref, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Popover } from '../../primitives'
import LinkButton from './LinkButton.vue'
import LinkContent from './LinkContent.vue'
import { useTiptapEditor, useLinkPopover } from '../../../composables'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    hideWhenUnavailable?: boolean
    autoOpenOnLinkActive?: boolean
  }>(),
  { hideWhenUnavailable: false, autoOpenOnLinkActive: true },
)

const emit = defineEmits<{ setLink: []; openChange: [value: boolean] }>()

const editorRef = useTiptapEditor(computed(() => props.editor))
const activeEditor = computed(() => editorRef.value)
const link = useLinkPopover({ editor: editorRef, hideWhenUnavailable: props.hideWhenUnavailable })

const open = ref(false)

function onOpenChange(value: boolean) {
  open.value = value
  emit('openChange', value)
}

function onSetLink() {
  emit('setLink')
  onOpenChange(false)
}

watch(link.isActive, (active) => {
  if (props.autoOpenOnLinkActive && active) onOpenChange(true)
})
</script>
