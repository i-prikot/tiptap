/**
 * Видимость floating-тулбара: скрытие по мета `hideFloatingToolbar`
 * (selectNodeAndHideFloating), повторный показ по pointerdown на
 * выделенном узле, обновление по selectionUpdate.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isNodeSelection } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import type { Selection } from '@tiptap/pm/state'
import { HIDE_FLOATING_META } from '../utils/toc-utils'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'

export function useFloatingToolbarVisibility(options: {
  editor: ComputedRef<Editor | null>
  isSelectionValid: (editor: Editor | null, selection?: Selection) => boolean
  extraHideWhen?: ComputedRef<boolean>
}): { shouldShow: Ref<boolean> } {
  const { editor, isSelectionValid, extraHideWhen } = options
  const shouldShow = ref(false)
  // Узел выделен через selectNodeAndHideFloating — тулбар не показываем,
  // пока пользователь не кликнет по узлу.
  let hiddenByMeta = false
  let cleanups: Array<() => void> = []
  const diagnostics = createDevelopmentDiagnostics('useFloatingToolbarVisibility')

  watch(
    editor,
    (instance) => {
      cleanups.forEach((fn) => fn())
      cleanups = []
      if (!instance) return

      const onTransaction = ({
        transaction,
      }: {
        transaction: { getMeta(key: string): unknown; selectionSet: boolean }
      }) => {
        const hideFloatingMeta = transaction.getMeta(HIDE_FLOATING_META)
        if (hideFloatingMeta !== undefined) hiddenByMeta = Boolean(hideFloatingMeta)
        else if (transaction.selectionSet) hiddenByMeta = false
        else return
      }
      instance.on('transaction', onTransaction as never)
      cleanups.push(() => instance.off('transaction', onTransaction as never))

      const dom = instance.view.dom
      const onPointerDown = (event: PointerEvent) => {
        const selection = instance.state.selection
        if (!(selection instanceof NodeSelection)) return
        const nodeDom = instance.view.nodeDOM(selection.from) as HTMLElement | null
        if (nodeDom && nodeDom.contains(event.target as Node)) {
          hiddenByMeta = false
          shouldShow.value = isSelectionValid(instance, selection) && !extraHideWhen?.value
        }
      }
      dom.addEventListener('pointerdown', onPointerDown, { capture: true })
      cleanups.push(() => dom.removeEventListener('pointerdown', onPointerDown, { capture: true }))

      const onSelectionUpdate = () => {
        const { selection } = instance.state
        const valid = isSelectionValid(instance, selection)
        if (extraHideWhen?.value || (isNodeSelection(selection) && hiddenByMeta))
          shouldShow.value = false
        else shouldShow.value = valid
      }
      onSelectionUpdate()
      instance.on('selectionUpdate', onSelectionUpdate)
      cleanups.push(() => {
        instance.off('selectionUpdate', onSelectionUpdate)
        diagnostics.debug('editor subscriptions removed')
      })
      diagnostics.debug('editor subscriptions added')
    },
    { immediate: true },
  )

  if (extraHideWhen) {
    watch(extraHideWhen, (hide) => {
      if (hide) shouldShow.value = false
      else {
        const instance = editor.value
        if (instance) shouldShow.value = isSelectionValid(instance, instance.state.selection)
      }
    })
  }

  onBeforeUnmount(() => cleanups.forEach((fn) => fn()))
  return { shouldShow }
}
