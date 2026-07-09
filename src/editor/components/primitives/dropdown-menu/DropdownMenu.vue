<template>
  <slot />
</template>

<script setup lang="ts">
/**
 * Корень выпадающего меню (Radix DropdownMenu → Vue provide/inject +
 * floating-ui). Порт по чанку 1vm78zqnxija2.
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
