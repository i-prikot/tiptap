<template>
  <EditorOverlayTeleport :target="teleportTarget">
    <div v-if="open" ref="floatingRef" :style="{ ...floatingStyles, zIndex }" v-bind="$attrs">
      <slot />
    </div>
  </EditorOverlayTeleport>
</template>

<script setup lang="ts">
/**
 * Плавающий элемент, позиционируемый по rect текущего выделения.
 * Использует @floating-ui/vue для позиционирования.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { Selection } from '@tiptap/pm/state'
import { flip, offset, shift, useFloating } from '@floating-ui/vue'
import type { VirtualElement } from '@floating-ui/vue'
import { useTiptapEditor, useEditorOverlayTarget } from '../../../composables'
import { throttledAutoUpdate } from '../../../utils/throttle'
import { EditorOverlayTeleport } from '../../primitives'

import { getSelectionBoundingRect } from '../../../utils/selection-utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    shouldShow: boolean
    zIndex?: number
    closeOnEscape?: boolean
    resetTextSelectionOnClose?: boolean
  }>(),
  { zIndex: 50, closeOnEscape: true, resetTextSelectionOnClose: true },
)

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const overlayTarget = useEditorOverlayTarget()
const teleportTarget = computed(() => overlayTarget?.value ?? null)
const open = ref(false)
const floatingRef = shallowRef<HTMLElement | null>(null)

// Виртуальный reference: rect выделения пересчитывается на каждом апдейте.
const virtualReference = shallowRef<VirtualElement>({
  getBoundingClientRect: () => {
    const instance = editor.value
    return (instance && getSelectionBoundingRect(instance)) || new DOMRect()
  },
})

const { floatingStyles, update } = useFloating(virtualReference, floatingRef, {
  placement: 'top',
  whileElementsMounted: throttledAutoUpdate,
  middleware: [shift(), flip(), offset(4)],
})

/**
 * Обычное закрытие (Escape, drag, смена shouldShow) НЕ трогает selection —
 * иначе ломается drag&drop блоков: drag-handle выделяет перетаскиваемый
 * блок, а ProseMirror при drop удаляет источник через deleteSelection().
 * Сброс selection в начало документа (resetTextSelectionOnClose) в
 * оригинале происходит только при dismiss кликом вне редактора.
 */
function setOpen(value: boolean) {
  if (open.value === value) return
  open.value = value
  emit('update:open', value)
}

function resetTextSelection() {
  const instance = editor.value
  if (!instance) return
  const tr = instance.state.tr.setSelection(Selection.near(instance.state.doc.resolve(0)))
  instance.view.dispatch(tr)
}

/** Клик снаружи (не редактор, не floating-слои) — закрыть со сбросом. */
function handleOutsidePointerDown(event: PointerEvent) {
  if (!open.value) return
  const target = event.target as HTMLElement | null
  if (!target) return
  if (floatingRef.value?.contains(target)) return
  const instance = editor.value
  const editorDom = instance?.view.dom
  if (editorDom && (editorDom === target || editorDom.parentElement?.contains(target))) return
  if (
    target.closest?.('[data-radix-popper-content-wrapper], .tiptap-menu-content, .tiptap-tooltip')
  )
    return
  if (props.resetTextSelectionOnClose) resetTextSelection()
  setOpen(false)
}

watch(
  () => props.shouldShow,
  (value) => {
    if (open.value !== value) {
      open.value = value
      emit('update:open', value)
    }
  },
  { immediate: true },
)

watch(
  [open, floatingRef],
  ([isOpen, element]) => {
    if (isOpen && element) update()
  },
  { flush: 'post' },
)

// Обновляем позицию при каждом изменении выделения, пока элемент виден.
let cleanups: Array<() => void> = []
watch(
  editor,
  (instance) => {
    cleanups.forEach((fn) => fn())
    cleanups = []
    if (!instance) return

    const onSelectionUpdate = () => {
      if (open.value) update()
    }
    instance.on('selectionUpdate', onSelectionUpdate)
    cleanups.push(() => instance.off('selectionUpdate', onSelectionUpdate))

    const dom = instance.view.dom
    if (props.closeOnEscape) {
      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && open.value) setOpen(false)
      }
      dom.addEventListener('keydown', onKeydown)
      cleanups.push(() => dom.removeEventListener('keydown', onKeydown))
    }

    // Скрываем при начале drag'а в редакторе.
    const onDrag = () => {
      if (open.value) setOpen(false)
    }
    dom.addEventListener('dragstart', onDrag)
    dom.addEventListener('dragover', onDrag)
    cleanups.push(() => {
      dom.removeEventListener('dragstart', onDrag)
      dom.removeEventListener('dragover', onDrag)
    })
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
})

onBeforeUnmount(() => {
  cleanups.forEach((fn) => fn())
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
})
</script>
