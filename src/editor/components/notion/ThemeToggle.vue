<template>
  <Button
    variant="ghost"
    :aria-label="`Switch to ${isDarkMode ? 'light' : 'dark'} mode`"
    @click="toggleDarkMode"
  >
    <MoonStarIcon v-if="isDarkMode" class="tiptap-button-icon" />
    <SunIcon v-else class="tiptap-button-icon" />
  </Button>
</template>

<script setup lang="ts">
/**
 * Переключатель светлой/тёмной темы: инициализируется из
 * prefers-color-scheme и meta[color-scheme], тумблерит класс `dark`
 * на <html>. Порт ThemeToggle из чанка 3xpmbr0kqzhen.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MoonStarIcon, SunIcon } from '../../icons'
import Button from '../primitives/Button.vue'

const isDarkMode = ref(false)

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
const handleMediaChange = () => {
  isDarkMode.value = mediaQuery.matches
}

onMounted(() => {
  mediaQuery.addEventListener('change', handleMediaChange)
  isDarkMode.value =
    !!document.querySelector('meta[name="color-scheme"][content="dark"]') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
})

onBeforeUnmount(() => {
  mediaQuery.removeEventListener('change', handleMediaChange)
})

watch(
  isDarkMode,
  (value) => {
    document.documentElement.classList.toggle('dark', value)
  },
  { immediate: true },
)

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
}
</script>
