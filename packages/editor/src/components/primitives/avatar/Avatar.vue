<template>
  <span
    class="tiptap-avatar"
    :style="userColor ? { '--dynamic-user-color': userColor } : undefined"
    :data-size="size"
  >
    <span class="tiptap-avatar-item">
      <slot />
    </span>
  </span>
</template>

<script setup lang="ts">
/**
 * Аватар пользователя: контейнер с контекстом статуса загрузки изображения.
 */
import { provide, ref } from 'vue'
import { avatarInjectionKey } from './avatar-context'
import type { AvatarImageLoadingStatus } from './avatar-context'

withDefaults(defineProps<{ size?: 'default' | 'sm' | 'lg' | 'xl'; userColor?: string }>(), {
  size: 'default',
})

const imageLoadingStatus = ref<AvatarImageLoadingStatus>('idle')

provide(avatarInjectionKey, {
  imageLoadingStatus,
  onImageLoadingStatusChange: (status) => {
    imageLoadingStatus.value = status
  },
})
</script>
