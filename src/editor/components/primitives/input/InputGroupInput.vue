<template>
  <input
    data-slot="tiptap-input-group-control"
    class="tiptap-input tiptap-input-group-control"
    :type="type"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
// Инпут внутри инпут-группы (порт InputGroupInput из чанка 2mux2p9tadf0h).
withDefaults(defineProps<{ type?: string }>(), { type: 'text' })
</script>
