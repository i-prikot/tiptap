<template>
  <ToolbarGroup>
    <Button variant="ghost" @click="emit('returnToMain')">
      <ArrowLeftIcon class="tiptap-button-icon" />
      <LinkIcon class="tiptap-button-icon" />
    </Button>
  </ToolbarGroup>
  <ToolbarSeparator />
  <LinkContent :editor="editor" @set-link="emit('returnToMain')" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Button, ToolbarGroup, ToolbarSeparator } from '../primitives'

import LinkContent from './LinkContent.vue'
import { ArrowLeftIcon, LinkIcon } from '../../icons'

const props = defineProps<{ editor?: Editor | null }>()
const emit = defineEmits<{ returnToMain: [] }>()

const editor = computed(() => props.editor)
</script>
