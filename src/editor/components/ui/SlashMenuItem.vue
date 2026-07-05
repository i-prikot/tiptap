<template>
  <Button
    ref="buttonRef"
    variant="ghost"
    :data-active-state="isSelected ? 'on' : 'off'"
    @click="emit('select')"
  >
    <component :is="item.badge" v-if="item.badge" class="tiptap-button-icon" />
    <div class="tiptap-button-text">{{ item.title }}</div>
  </Button>
</template>

<script setup lang="ts">
/**
 * Пункт слэш-меню: подскролливается в видимую область при выборе
 * с клавиатуры. Порт item-компонента SlashDropdownMenu.
 */
import { ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import Button from '../primitives/Button.vue'
import { getElementOverflowPosition } from '../../utils/selection-utils'
import type { SuggestionItem } from '../../utils/suggestion/suggestion'

const props = defineProps<{ item: SuggestionItem; isSelected: boolean }>()
const emit = defineEmits<{ select: [] }>()

const buttonRef = ref<ComponentPublicInstance | null>(null)

watch(
  () => props.isSelected,
  selected => {
    if (!selected) return
    const container = document.querySelector('[data-selector="tiptap-slash-dropdown-menu"]')
    const element = buttonRef.value?.$el as HTMLElement | undefined
    if (!element || !container) return
    const overflow = getElementOverflowPosition(element, container)
    if (overflow === 'top') element.scrollIntoView(true)
    else if (overflow === 'bottom') element.scrollIntoView(false)
  },
  { flush: 'post' },
)
</script>
