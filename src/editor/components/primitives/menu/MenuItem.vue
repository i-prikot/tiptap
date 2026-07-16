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
/**
 * Пункт контекстного Menu. Обработчик @select запускает действие. Если у
 * MenuContent включён closeOnSelect, выбор конечного пункта закрывает всю
 * Menu-цепочку; при MenuContent.closeOnSelect=false @select срабатывает без
 * closeAll. submenu-trigger её не закрывает.
 * Для одноуровневого click-to-close без @select и без цепочки подменю
 * используйте DropdownMenuItem.
 */
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
