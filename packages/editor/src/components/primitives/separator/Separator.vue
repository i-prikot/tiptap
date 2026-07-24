<template>
  <div
    class="tiptap-separator"
    :data-orientation="orientation"
    role="separator"
    :aria-orientation="orientation"
  />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ orientation?: 'horizontal' | 'vertical' }>(), {
  orientation: 'vertical',
})
</script>
