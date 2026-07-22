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
import { computed, provide, ref, shallowRef } from 'vue'
import { dropdownMenuInjectionKey } from './dropdown-menu-context'

const props = defineProps<{ open?: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const uncontrolledOpen = ref(props.open ?? false)
const open = computed({
  get: () => props.open ?? uncontrolledOpen.value,
  set: (value: boolean) => {
    if (props.open === undefined) uncontrolledOpen.value = value
    emit('update:open', value)
  },
})
const reference = shallowRef<HTMLElement | null>(null)

provide(dropdownMenuInjectionKey, {
  open,
  setOpen: (value) => (open.value = value),
  reference,
})
</script>
