<template>
  <header class="notion-like-editor-header">
    <Spacer />
    <div class="notion-like-editor-header-actions">
      <ButtonGroup>
        <ButtonGroup><UndoRedoButton action="undo" /></ButtonGroup>
        <ButtonGroup><UndoRedoButton action="redo" /></ButtonGroup>
      </ButtonGroup>
      <Separator />
      <ThemeToggle />
      <Separator />
      <CollabUsers />
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * Хедер редактора: undo/redo, переключатель темы, аватары участников
 * коллаборации. Порт NotionEditorHeader из чанка 3xpmbr0kqzhen.
 */
import ButtonGroup from '../primitives/ButtonGroup.vue'
import Separator from '../primitives/Separator.vue'
import Spacer from '../primitives/Spacer.vue'
import UndoRedoButton from '../ui/UndoRedoButton.vue'
import ThemeToggle from './ThemeToggle.vue'
import CollabUsers from './CollabUsers.vue'
</script>
