<template>
  <div
    role="group"
    data-slot="tiptap-input-group-addon"
    :data-align="align"
    :class="['tiptap-input-group-addon', `tiptap-input-group-addon--${align}`]"
    @click="focusInput"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
// Аддон инпут-группы; клик мимо кнопки фокусирует инпут
// (порт InputGroupAddon из чанка 2mux2p9tadf0h).
withDefaults(
  defineProps<{ align?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end' }>(),
  { align: 'inline-start' },
)

function focusInput(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('button')) return
  const current = event.currentTarget as HTMLElement
  current.parentElement?.querySelector('input')?.focus()
}
</script>
