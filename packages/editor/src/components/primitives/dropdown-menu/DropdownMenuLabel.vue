<template>
  <div class="tiptap-dropdown-menu-label" :data-inset="inset || undefined">
    <slot />
  </div>
</template>

<script setup lang="ts">
// Заголовок группы меню.
defineProps<{ inset?: boolean }>()
</script>
