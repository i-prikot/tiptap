<template>
  <input data-slot="tiptap-input" class="tiptap-input" :type="type" v-bind="$attrs" />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ type?: string }>(), { type: 'text' })
</script>
