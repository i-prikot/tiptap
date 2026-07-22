<template>
  <ToolbarGroup>
    <Button variant="ghost" @click="emit('returnToMain')">
      <ArrowLeftIcon class="tiptap-button-icon" />
      <HighlighterIcon class="tiptap-button-icon" />
    </Button>
  </ToolbarGroup>
  <ToolbarSeparator />
  <ColorHighlightPopoverContent :editor="editor" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button, ToolbarGroup, ToolbarSeparator } from '../../primitives'

import { ColorHighlightPopoverContent } from '../color'
import { ArrowLeftIcon, HighlighterIcon } from '../../../icons'

const props = defineProps<{ editor?: Editor | null }>()
const emit = defineEmits<{ returnToMain: [] }>()

const editor = computed(() => props.editor)
</script>
