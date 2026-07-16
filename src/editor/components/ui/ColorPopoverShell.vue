<template>
  <Popover v-if="visible">
    <template #trigger>
      <slot name="trigger" />
    </template>
    <slot />
  </Popover>
</template>

<script setup lang="ts">
import { Popover } from '@/editor/components/primitives'

defineProps<{ visible: boolean }>()
</script>
