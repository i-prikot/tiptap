<template>
  <header class="notion-like-editor-header">
    <Spacer />
    <div class="notion-like-editor-header-actions">
      <ButtonGroup>
        <ButtonGroup><UndoRedoButton :editor="props.editor" action="undo" /></ButtonGroup>
        <ButtonGroup><UndoRedoButton :editor="props.editor" action="redo" /></ButtonGroup>
      </ButtonGroup>
      <Separator />
      <ThemeToggle :is-dark-mode="props.isDarkMode" @toggle="emit('toggleTheme')" />
      <Separator />
      <CollabUsers :editor="props.editor" />
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * Хедер редактора: undo/redo, переключатель темы, аватары участников
 * коллаборации. Порт NotionEditorHeader из чанка 3xpmbr0kqzhen.
 */
import type { Editor } from '@tiptap/vue-3'
import ButtonGroup from '../../editor/components/primitives/ButtonGroup.vue'
import Separator from '../../editor/components/primitives/Separator.vue'
import Spacer from '../../editor/components/primitives/Spacer.vue'
import { UndoRedoButton } from '../../editor'
import ThemeToggle from './ThemeToggle.vue'
import CollabUsers from '../../editor/components/notion/CollabUsers.vue'

const props = defineProps<{ editor: Editor | null; isDarkMode: boolean }>()
const emit = defineEmits<{ toggleTheme: [] }>()
</script>
