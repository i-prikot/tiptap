<template>
  <Teleport v-if="target" :to="target">
    <slot />
  </Teleport>
  <slot v-else />
</template>

<script setup lang="ts">
defineProps<{
  target: HTMLElement | null
}>()
</script>
