<template>
  <div
    data-slot="tiptap-button-group"
    class="tiptap-button-group"
    :class="
      orientation === 'horizontal'
        ? 'tiptap-button-group-horizontal'
        : 'tiptap-button-group-vertical'
    "
    :data-orientation="orientation"
    role="group"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
// Группа кнопок (порт ButtonGroup из чанка 3q2p49kc-ifgd, cva-варианты orientation).
withDefaults(defineProps<{ orientation?: 'horizontal' | 'vertical' }>(), {
  orientation: 'vertical',
})
</script>
