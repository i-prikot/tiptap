<template>
  <div class="tiptap-spacer" :style="style" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  orientation?: 'horizontal' | 'vertical'
  size?: string
}>()

const style = computed(() => {
  if (props.size) {
    return props.orientation === 'vertical'
      ? { height: props.size, width: '100%' }
      : { width: props.size, height: '100%' }
  }
  return { flex: 1 }
})
</script>
