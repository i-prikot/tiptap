<template>
  <Button
    variant="ghost"
    :aria-label="`Switch to ${props.isDarkMode ? 'light' : 'dark'} mode`"
    @click="emit('toggle')"
  >
    <MoonStarIcon v-if="props.isDarkMode" class="tiptap-button-icon" />
    <SunIcon v-else class="tiptap-button-icon" />
  </Button>
</template>

<script setup lang="ts">
import { MoonStarIcon, SunIcon } from '../../editor/icons'
import Button from '../../editor/components/primitives/Button.vue'

const props = defineProps<{ isDarkMode: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
</script>
