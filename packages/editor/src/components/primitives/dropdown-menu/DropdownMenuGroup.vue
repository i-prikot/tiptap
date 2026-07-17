<template>
  <div class="tiptap-dropdown-menu-group" role="group" :data-orientation="orientation">
    <slot />
  </div>
</template>

<script setup lang="ts">
// Группа пунктов меню.
withDefaults(defineProps<{ orientation?: 'vertical' | 'horizontal' }>(), {
  orientation: 'vertical',
})
</script>
