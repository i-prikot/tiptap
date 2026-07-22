<template>
  <MenuItem :disabled="action.disabled" @select="action.onClick">
    <Button
      variant="ghost"
      :data-active-state="action.isActive ? 'on' : 'off'"
      :disabled="action.disabled"
    >
      <component :is="action.icon" class="tiptap-button-icon" />
      <span class="tiptap-button-text">{{ action.label }}</span>
    </Button>
  </MenuItem>
</template>

<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import { Button, MenuItem } from '../../primitives'

defineProps<{
  action: {
    icon: FunctionalComponent
    label: string
    disabled: boolean
    onClick: () => unknown
    isActive?: boolean
  }
}>()
</script>
