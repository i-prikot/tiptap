<template>
  <template v-if="actions.length">
    <MenuGroup>
      <TableHandleMenuAction v-for="action in actions" :key="action.id" :action="action" />
    </MenuGroup>
    <Separator v-if="showSeparator" orientation="horizontal" />
  </template>
</template>

<script setup lang="ts">
import type { FunctionalComponent } from 'vue'
import { MenuGroup, Separator } from '../../primitives'
import TableHandleMenuAction from './TableHandleMenuAction.vue'

defineProps<{
  actions: Array<{
    id: string
    icon: FunctionalComponent
    label: string
    disabled: boolean
    onClick: () => unknown
    isActive?: boolean
  }>
  showSeparator?: boolean
}>()
</script>
