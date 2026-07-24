<template>
  <header class="notion-like-editor-header">
    <Spacer />
    <div class="notion-like-editor-header-actions">
      <ButtonGroup orientation="horizontal">
        <ButtonGroup><UndoRedoButton :editor="props.editor" action="undo" /></ButtonGroup>
        <ButtonGroup><UndoRedoButton :editor="props.editor" action="redo" /></ButtonGroup>
      </ButtonGroup>
      <Separator />
      <ThemeToggle :is-dark-mode="props.isDarkMode" @toggle="emit('toggleTheme')" />
      <Separator />
      <label class="notion-like-editor-header-locale">
        <span class="notion-like-editor-header-locale-label">Language</span>
        <select
          class="notion-like-editor-header-locale-select"
          name="editor-locale"
          :value="props.locale"
          @change="handleLocaleChange"
        >
          <option value="en">English</option>
          <option value="ru">Russian</option>
        </select>
      </label>
      <Separator />
      <CollabUsers :editor="props.editor" />
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * Хедер редактора: undo/redo, переключатель темы, аватары участников
 * коллаборации.
 */
import type { Editor } from '@tiptap/vue-3'
import {
  ButtonGroup,
  CollabUsers,
  Separator,
  Spacer,
  UndoRedoButton,
  type EditorLocale,
} from '@i-prikot/editor'
import ThemeToggle from './ThemeToggle.vue'

const props = defineProps<{ editor: Editor | null; isDarkMode: boolean; locale: EditorLocale }>()
const emit = defineEmits<{ toggleTheme: []; updateLocale: [locale: EditorLocale] }>()

function handleLocaleChange(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return

  emit('updateLocale', target.value)
}
</script>
