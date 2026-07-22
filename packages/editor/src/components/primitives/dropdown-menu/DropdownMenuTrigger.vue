<template>
  <span ref="triggerRef" style="display: contents" @click="toggle">
    <slot />
  </span>
</template>

<script setup lang="ts">
// Триггер выпадающего меню: клик открывает/закрывает.
import { inject, onMounted, shallowRef } from 'vue'
import { dropdownMenuInjectionKey } from './dropdown-menu-context'

const injected = inject(dropdownMenuInjectionKey)
if (!injected) throw new Error('DropdownMenuTrigger must be used within DropdownMenu')
const context = injected

const triggerRef = shallowRef<HTMLElement | null>(null)

onMounted(() => {
  // реальный DOM-элемент триггера — первый ребёнок обёртки display:contents
  context.reference.value =
    (triggerRef.value?.firstElementChild as HTMLElement | null) ?? triggerRef.value
})

function toggle() {
  context.setOpen(!context.open.value)
}
</script>
