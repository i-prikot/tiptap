/**
 * Подписка на событие `tableHandleState`, которое эмитит
 * TableHandleExtension при наведении/драге по таблице.
 * Порт useTableHandleState из чанка 2yhkpc8fmweba (модуль 946302).
 */
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import type { ComputedRef, Ref, ShallowRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { TableHandleState } from '../extensions/table-handle'

export type { TableHandleState }

export function useTableHandleState(
  editor: ComputedRef<Editor | null> | Ref<Editor | null>,
): ShallowRef<TableHandleState | null> {
  const state = shallowRef<TableHandleState | null>(null)
  let unsubscribe: (() => void) | null = null

  watch(
    () => editor.value,
    instance => {
      unsubscribe?.()
      unsubscribe = null
      if (!instance) {
        state.value = null
        return
      }
      const handler = (next: TableHandleState) => {
        state.value = { ...next }
      }
      instance.on('tableHandleState', handler)
      unsubscribe = () => instance.off('tableHandleState', handler)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => unsubscribe?.())
  return state
}
