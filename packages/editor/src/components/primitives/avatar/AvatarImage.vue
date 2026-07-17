<template>
  <img v-if="status === 'loaded'" alt="" :src="src" class="tiptap-avatar-image" />
</template>

<script setup lang="ts">
/**
 * Изображение аватара: рендерится только после успешной предзагрузки,
 * статус передаётся в контекст Avatar.
 * Порт AvatarImage из чанка 34p294mqk5mqb.
 */
import { inject, ref, watch } from 'vue'
import { avatarInjectionKey } from './avatar-context'
import type { AvatarImageLoadingStatus } from './avatar-context'

const props = defineProps<{ src?: string; referrerPolicy?: string }>()

const context = inject(avatarInjectionKey)
if (!context) throw new Error('Avatar components must be used within an Avatar.Root')

const status = ref<AvatarImageLoadingStatus>(props.src ? 'loading' : 'error')

watch(
  () => props.src,
  (src, _prev, onCleanup) => {
    if (!src) {
      status.value = 'error'
      return
    }
    let active = true
    const image = new window.Image()
    image.onload = () => {
      if (active) status.value = 'loaded'
    }
    image.onerror = () => {
      if (active) status.value = 'error'
    }
    image.src = src
    if (props.referrerPolicy) image.referrerPolicy = props.referrerPolicy
    onCleanup(() => {
      active = false
    })
  },
  { immediate: true },
)

watch(
  status,
  (value) => {
    if (value !== 'idle') context.onImageLoadingStatusChange(value)
  },
  { immediate: true },
)
</script>
