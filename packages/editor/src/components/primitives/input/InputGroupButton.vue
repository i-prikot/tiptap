<template>
  <Button
    :type="type"
    :data-size="size"
    :variant="variant"
    :class="['tiptap-input-group-button', `tiptap-input-group-button--${size}`]"
  >
    <slot />
  </Button>
</template>

<script setup lang="ts">
import { Button } from '../button'

withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: string
    size?: 'xs' | 'sm' | 'icon-xs' | 'icon-sm'
  }>(),
  { type: 'button', variant: 'ghost', size: 'xs' },
)
</script>
