<template>
  <div
    class="tiptap-badge"
    :data-style="variant"
    :data-size="size"
    :data-appearance="appearance"
    :data-text-trim="trimText ? 'on' : 'off'"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
// Бейдж для шорткатов и меток (порт Badge из чанка 3q2p49kc-ifgd).
withDefaults(
  defineProps<{
    variant?: string
    size?: string
    appearance?: string
    trimText?: boolean
  }>(),
  { size: 'default', appearance: 'default', trimText: false },
)
</script>
