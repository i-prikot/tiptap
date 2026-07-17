<template>
  <DropdownMenuGroup>
    <DropdownMenuLabel>Turn into</DropdownMenuLabel>
    <DropdownMenuItem v-for="item in items" :key="item.label">
      <Button
        variant="ghost"
        :show-tooltip="false"
        :data-active-state="item.isActive ? 'on' : 'off'"
        :disabled="item.disabled"
        :data-disabled="item.disabled"
        @click="item.onClick"
      >
        <component :is="item.icon" class="tiptap-button-icon" />
        <span class="tiptap-button-text">{{ item.label }}</span>
      </Button>
    </DropdownMenuItem>
  </DropdownMenuGroup>
</template>

<script setup lang="ts">
/**
 * Пункты «Turn into» для дропдауна floating тулбара.
 * Порт TurnIntoDropdownContent из чанка 34p294mqk5mqb (модуль 413941);
 * собран из block-conversion composables (как в DragContextMenu).
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { TurnIntoMenuItem } from '../../types/menu'
import { DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, Button } from '../primitives'

import {
  useTiptapEditor,
  useBlockquoteBlock,
  useCodeBlockBlock,
  useHeadingBlock,
  useListBlock,
  useTextBlock,
  TURN_INTO_BLOCKS,
  type TurnIntoBlockType,
} from '../../composables'

const props = defineProps<{ editor?: Editor | null; blockTypes?: TurnIntoBlockType[] }>()

const editor = useTiptapEditor(computed(() => props.editor))

const conversions = {
  paragraph: useTextBlock(editor),
  'heading-1': useHeadingBlock(editor, 1),
  'heading-2': useHeadingBlock(editor, 2),
  'heading-3': useHeadingBlock(editor, 3),
  bulletList: useListBlock(editor, 'bulletList'),
  orderedList: useListBlock(editor, 'orderedList'),
  taskList: useListBlock(editor, 'taskList'),
  blockquote: useBlockquoteBlock(editor),
  codeBlock: useCodeBlockBlock(editor),
}

const items = computed<TurnIntoMenuItem[]>(() =>
  TURN_INTO_BLOCKS.filter(
    (block) => !props.blockTypes || props.blockTypes.includes(block.type),
  ).map((block) => {
    const key = block.type === 'heading' ? (`heading-${block.level}` as const) : block.type
    const conversion = conversions[key as keyof typeof conversions]
    return {
      icon: conversion.Icon,
      label: block.label,
      onClick: conversion.handleToggle,
      disabled: !conversion.canToggle.value,
      isActive: conversion.isActive.value,
    }
  }),
)
</script>
