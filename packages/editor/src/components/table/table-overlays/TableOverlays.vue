<template>
  <template v-if="isActivated">
    <TableExtendRowColumnButtons :ref="registerTableOverlay" />
    <TableHandle :ref="registerTableOverlay" />
    <TableSelectionOverlay :ref="registerTableOverlay" :show-resize-handles="true" />
  </template>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { Editor } from '@tiptap/core'
import { useTiptapEditor } from '../../../composables'
import type { TableHandleState } from '../../../extensions/table-handle'

const editor = useTiptapEditor()
const isActivated = ref(false)

const TableExtendRowColumnButtons = defineAsyncComponent(
  () => import('../table-extend/TableExtendRowColumnButtons.vue'),
)
const TableHandle = defineAsyncComponent(() => import('../table-handle/TableHandle.vue'))
const TableSelectionOverlay = defineAsyncComponent(
  () => import('../table-selection/TableSelectionOverlay.vue'),
)

let removeSelectionActivationListener: (() => void) | undefined
let removeTableHandleStateListener: (() => void) | undefined
let pendingTableHandleState: TableHandleState | null = null
const mountedTableOverlays = new Set<ComponentPublicInstance>()

function isTableSelection(instance: Editor) {
  return (
    instance.isActive('table') || instance.isActive('tableCell') || instance.isActive('tableHeader')
  )
}

function stopActivationListeners() {
  removeSelectionActivationListener?.()
  removeSelectionActivationListener = undefined
  removeTableHandleStateListener?.()
  removeTableHandleStateListener = undefined
}

function activate() {
  if (isActivated.value) return

  isActivated.value = true
  removeSelectionActivationListener?.()
  removeSelectionActivationListener = undefined
}

function replayPendingTableHandleState() {
  if (!pendingTableHandleState || mountedTableOverlays.size < 3) return

  const tableHandleState = pendingTableHandleState
  pendingTableHandleState = null
  removeTableHandleStateListener?.()
  removeTableHandleStateListener = undefined
  editor.value?.emit('tableHandleState', tableHandleState)
}

function captureTableHandleState(tableHandleState: TableHandleState) {
  pendingTableHandleState = { ...tableHandleState }
  activate()
  replayPendingTableHandleState()
}

function registerTableOverlay(reference: Element | ComponentPublicInstance | null) {
  if (!reference || reference instanceof Element || mountedTableOverlays.has(reference)) return

  mountedTableOverlays.add(reference)
  replayPendingTableHandleState()
}

watch(
  editor,
  (instance, previousInstance) => {
    stopActivationListeners()
    pendingTableHandleState = null
    mountedTableOverlays.clear()

    if (instance !== previousInstance) isActivated.value = false
    if (!instance || isActivated.value) return

    const onTableHandleState = (tableHandleState: TableHandleState) => {
      captureTableHandleState(tableHandleState)
    }
    const onSelectionUpdate = () => {
      if (isTableSelection(instance)) activate()
    }

    instance.on('tableHandleState', onTableHandleState)
    instance.on('selectionUpdate', onSelectionUpdate)
    removeTableHandleStateListener = () => instance.off('tableHandleState', onTableHandleState)
    removeSelectionActivationListener = () => instance.off('selectionUpdate', onSelectionUpdate)

    if (isTableSelection(instance)) activate()
  },
  { immediate: true },
)

onBeforeUnmount(stopActivationListeners)
</script>
