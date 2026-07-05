<template>
  <NotionEditor :room="room" />
</template>

<script setup lang="ts">
// Точка входа приложения: комната коллаборации = id документа из URL.
import NotionEditor from './editor/components/notion/NotionEditor.vue'
import { getDocumentId } from './editor/utils/document-id'

const room = getDocumentId()
</script>
