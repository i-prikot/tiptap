<template>
  <div
    class="tiptap-separator"
    :data-orientation="orientation"
    role="separator"
    :aria-orientation="orientation"
  />
</template>

<script setup lang="ts">
// Визуальный разделитель (порт Separator из чанка примитивов).
withDefaults(defineProps<{ orientation?: 'horizontal' | 'vertical' }>(), {
  orientation: 'vertical',
})
</script>
