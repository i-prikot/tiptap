<template>
  <Button
    ref="buttonRef"
    variant="ghost"
    :data-active-state="isSelected ? 'on' : 'off'"
    :data-user-id="user?.id"
    @click="emit('select')"
  >
    <Avatar>
      <AvatarImage :src="user?.avatarUrl" />
      <AvatarFallback>{{ item.title[0]?.toUpperCase() }}</AvatarFallback>
    </Avatar>
    <span class="tiptap-button-text">{{ item.title }}</span>
  </Button>
</template>

<script setup lang="ts">
// Пункт меню меншенов с аватаром (порт item-компонента MentionDropdownMenu).
import { computed, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { Button, Avatar, AvatarFallback, AvatarImage } from '@/editor/components/primitives'

import { getElementOverflowPosition } from '../../utils/selection-utils'
import type { SuggestionItem } from '../../types/suggestion'
import type { MentionUser } from '../../types/user'

const props = defineProps<{ item: SuggestionItem; isSelected: boolean }>()
const emit = defineEmits<{ select: [] }>()

const user = computed(() => props.item.context as MentionUser | undefined)

const buttonRef = ref<ComponentPublicInstance | null>(null)

watch(
  () => props.isSelected,
  (selected) => {
    if (!selected) return
    const container = document.querySelector('[data-selector="tiptap-mention-dropdown-menu"]')
    const element = buttonRef.value?.$el as HTMLElement | undefined
    if (!element || !container) return
    const overflow = getElementOverflowPosition(element, container)
    if (overflow === 'top') element.scrollIntoView(true)
    else if (overflow === 'bottom') element.scrollIntoView(false)
  },
  { flush: 'post' },
)
</script>
