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
import Button from '../primitives/Button.vue'
import Avatar from '../primitives/avatar/Avatar.vue'
import AvatarFallback from '../primitives/avatar/AvatarFallback.vue'
import AvatarImage from '../primitives/avatar/AvatarImage.vue'
import { getElementOverflowPosition } from '../../utils/selection-utils'
import type { SuggestionItem } from '../../utils/suggestion/suggestion'
import type { MentionUser } from './MentionDropdownMenu.vue'

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
