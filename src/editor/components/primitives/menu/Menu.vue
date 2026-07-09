<template>
  <span ref="triggerWrapperRef" style="display: contents" @click="handleTriggerClick">
    <slot name="trigger" />
  </span>
  <slot />
</template>

<script setup lang="ts">
/**
 * Меню (порт ariakit Menu из чанка 26xd4sczpcaxm): элемент-триггер +
 * позиционируемый контент; вложенные меню открываются вправо и закрывают
 * всю цепочку по выбору пункта.
 */
import { inject, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { menuInjectionKey } from './menu-context'

const props = withDefaults(
  defineProps<{
    open?: boolean
    placement?: string
  }>(),
  { open: undefined, placement: 'bottom-start' },
)

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const parentMenu = inject(menuInjectionKey, null)
// Подменю (вложенное меню) открывается/закрывается по наведению курсора.
const isSubmenu = parentMenu !== null

const open = ref(props.open ?? false)
const reference = ref<HTMLElement | null>(null)
const triggerWrapperRef = ref<HTMLElement | null>(null)

watch(
  () => props.open,
  (value) => {
    if (value !== undefined) open.value = value
  },
)

function setOpen(value: boolean) {
  open.value = value
  emit('update:open', value)
}

function closeAll() {
  setOpen(false)
  parentMenu?.closeAll()
}

// Таймер закрытия подменю по наведению: даёт время пройти зазор до всплывающего контента.
let closeTimer: ReturnType<typeof setTimeout> | undefined

function cancelClose() {
  if (closeTimer !== undefined) {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
}

function scheduleClose() {
  cancelClose()
  closeTimer = setTimeout(() => setOpen(false), 120)
}

function openHover() {
  cancelClose()
  setOpen(true)
}

function handleTriggerClick() {
  // У подменю клик не должен закрывать то, что уже открыто наведением.
  if (isSubmenu) setOpen(true)
  else setOpen(!open.value)
}

onMounted(() => {
  reference.value = (triggerWrapperRef.value?.firstElementChild as HTMLElement | null) ?? null
  if (isSubmenu && reference.value) {
    reference.value.addEventListener('pointerenter', openHover)
    reference.value.addEventListener('pointerleave', scheduleClose)
  }
})

onBeforeUnmount(() => {
  cancelClose()
  if (isSubmenu && reference.value) {
    reference.value.removeEventListener('pointerenter', openHover)
    reference.value.removeEventListener('pointerleave', scheduleClose)
  }
})

provide(menuInjectionKey, {
  open,
  setOpen,
  reference,
  placement: props.placement,
  closeAll,
  isSubmenu,
  cancelClose,
  scheduleClose,
})
</script>
