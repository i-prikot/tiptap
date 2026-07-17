<template>
  <div class="tiptap-card-item-group" :data-orientation="orientation"><slot /></div>
</template>

<script setup lang="ts">
// Группа пунктов внутри карточки.
withDefaults(defineProps<{ orientation?: 'vertical' | 'horizontal' }>(), {
  orientation: 'vertical',
})
</script>
