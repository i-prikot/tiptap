<template>
  <Popover v-if="visible" :role="role" :aria-label="ariaLabel">
    <template #trigger>
      <slot name="trigger" />
    </template>
    <slot />
  </Popover>
</template>

<script setup lang="ts">
import { Popover } from '../../primitives'

withDefaults(
  defineProps<{
    visible: boolean
    ariaLabel?: string
    role?: 'dialog' | 'menu' | 'listbox' | 'group'
  }>(),
  { ariaLabel: undefined, role: 'dialog' },
)
</script>
