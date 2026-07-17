<template>
  <input data-slot="tiptap-input" class="tiptap-input" :type="type" v-bind="$attrs" />
</template>

<script setup lang="ts">
// Текстовое поле tiptap-ui (порт Input из чанка 2mux2p9tadf0h, модуль 574732).
withDefaults(defineProps<{ type?: string }>(), { type: 'text' })
</script>
