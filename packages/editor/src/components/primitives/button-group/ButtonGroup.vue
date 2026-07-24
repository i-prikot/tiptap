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
withDefaults(defineProps<{ orientation?: 'horizontal' | 'vertical' }>(), {
  orientation: 'vertical',
})
</script>
