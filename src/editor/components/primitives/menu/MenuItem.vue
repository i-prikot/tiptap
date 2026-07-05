<template>
  <div
    class="tiptap-menu-item"
    role="menuitem"
    :data-submenu-trigger="submenuTrigger || undefined"
    :aria-disabled="disabled || undefined"
    @click="handleClick"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
// Пункт меню-обёртка: содержимое — кнопка (asChild-паттерн ariakit).
const props = defineProps<{ disabled?: boolean; submenuTrigger?: boolean }>()
const emit = defineEmits<{ select: [] }>()

function handleClick(event: MouseEvent) {
  if (props.disabled) {
    event.stopPropagation()
    return
  }
  emit('select')
}
</script>
