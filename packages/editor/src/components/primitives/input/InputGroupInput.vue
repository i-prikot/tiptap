<template>
  <input
    data-slot="tiptap-input-group-control"
    class="tiptap-input tiptap-input-group-control"
    :type="type"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ type?: string }>(), { type: 'text' })
</script>
