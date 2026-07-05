<template>
  <Button
    v-if="emoji"
    ref="buttonRef"
    variant="ghost"
    :data-active-state="isSelected ? 'on' : 'off'"
    @click="emit('select')"
  >
    <img v-if="emoji.fallbackImage" class="tiptap-button-emoji" :src="emoji.fallbackImage" :alt="emoji.name">
    <span v-else class="tiptap-button-emoji">{{ emoji.emoji }}</span>
    <span class="tiptap-button-text">:{{ emoji.name }}:</span>
  </Button>
</template>

<script setup lang="ts">
// Пункт меню эмодзи (порт EmojiMenuItem из чанка 34p294mqk5mqb).
import { ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { EmojiItem } from '@tiptap/extension-emoji'
import Button from '../primitives/Button.vue'
import { getElementOverflowPosition } from '../../utils/selection-utils'

const props = defineProps<{ emoji: EmojiItem; isSelected: boolean; selector: string }>()
const emit = defineEmits<{ select: [] }>()

const buttonRef = ref<ComponentPublicInstance | null>(null)

watch(
  () => props.isSelected,
  selected => {
    if (!selected) return
    const container = document.querySelector(props.selector)
    const element = buttonRef.value?.$el as HTMLElement | undefined
    if (!element || !container) return
    const overflow = getElementOverflowPosition(element, container)
    if (overflow === 'top') element.scrollIntoView(true)
    else if (overflow === 'bottom') element.scrollIntoView(false)
  },
  { flush: 'post' },
)
</script>
