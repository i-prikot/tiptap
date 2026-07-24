<template>
  <template v-if="visible && context.imageLoadingStatus.value !== 'loaded'">
    <span class="tiptap-avatar-bg" />
    <span class="tiptap-avatar-fallback"><slot /></span>
  </template>
</template>

<script setup lang="ts">
/**
 * Фолбэк аватара (инициалы): показывается, пока изображение не загружено;
 * опциональная задержка delayMs.
 */
import { inject, onMounted, ref } from 'vue'
import { avatarInjectionKey } from './avatar-context'

const props = defineProps<{ delayMs?: number }>()

const context = inject(avatarInjectionKey)
if (!context) throw new Error('Avatar components must be used within an Avatar.Root')

const visible = ref(props.delayMs === undefined)

onMounted(() => {
  if (props.delayMs !== undefined) {
    window.setTimeout(() => {
      visible.value = true
    }, props.delayMs)
  }
})
</script>
