<template>
  <slot />
</template>

<script setup lang="ts">
/**
 * Примитив для компактного одноуровневого селектора, принадлежащего явному
 * DropdownMenuTrigger: например, TurnIntoDropdown и список участников.
 * DropdownMenuContent настраивает side/align/sideOffset. Для контекстных
 * действий и вложенных подменю с placement, задаваемым владеющим Menu,
 * hover-таймингом и
 * closeAll по родительской цепочке используйте Menu; не подменяйте примитивы
 * только потому, что оба рендерят позиционируемое меню.
 */
import { provide, ref, watch } from 'vue'
import { dropdownMenuInjectionKey } from './dropdown-menu-context'

const props = defineProps<{ open?: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const open = ref(props.open ?? false)
const reference = ref<HTMLElement | null>(null)

watch(
  () => props.open,
  (value) => {
    if (value !== undefined) open.value = value
  },
)

provide(dropdownMenuInjectionKey, {
  open,
  setOpen: (value) => {
    open.value = value
    emit('update:open', value)
  },
  reference,
})
</script>
