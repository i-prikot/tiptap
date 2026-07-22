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
// Кнопка внутри инпут-группы (порт InputGroupButton из чанка 2mux2p9tadf0h).
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
