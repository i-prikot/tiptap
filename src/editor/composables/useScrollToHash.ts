/**
 * Скролл к блоку по hash из URL (uniqueID-атрибут data-id):
 * срабатывает при загрузке (после синка коллаборации), hashchange,
 * pageshow и popstate.
 * Порт useScrollToHash из чанка 1_-l0xapy_wlh.
 */
import { onBeforeUnmount, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { selectNodeAndHideFloating } from '../utils/toc-utils'

/** Расширение редактора по имени (с предупреждением, как в оригинале). */
export function getEditorExtension(editor: Editor | null, name: string) {
  if (!editor) return null
  const extension = editor.extensionManager.extensions.find((item) => item.name === name)
  if (!extension) {
    console.warn(
      `Extension "${name}" not found in the editor schema. Ensure it is included in the editor configuration.`,
    )
    return null
  }
  return extension
}

export interface UseScrollToHashOptions {
  onTargetFound?: (id: string) => void
  onTargetNotFound?: (id: string) => void
}

export function useScrollToHash(
  editor: ComputedRef<Editor | null>,
  options: UseScrollToHashOptions = {},
) {
  const { onTargetFound = () => {}, onTargetNotFound = () => {} } = options
  let lastScrolledHash: string | null = null

  function scrollToHash(id: string): boolean {
    const instance = editor.value
    if (!instance) return false
    const attributeName =
      getEditorExtension(instance, 'uniqueID')?.options?.attributeName ?? 'data-id'
    let foundPos: number | null = null
    instance.state.doc.descendants((node, pos) => {
      if (node.attrs?.[attributeName] !== id) return true
      foundPos = pos
      return false
    })
    if (foundPos === null) return false

    selectNodeAndHideFloating(instance, foundPos)
    setTimeout(() => {
      const dom = instance.view.nodeDOM(foundPos!)
      if (dom instanceof Element) dom.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 0)
    return true
  }

  function handleHash(delay = 0) {
    const hash = window.location.hash?.substring(1)
    if (!hash || hash === lastScrolledHash) return
    setTimeout(() => {
      if (scrollToHash(hash)) {
        lastScrolledHash = hash
        onTargetFound(hash)
      } else {
        onTargetNotFound(hash)
      }
    }, delay)
  }

  // при коллаборации ждём synced, иначе пробуем сразу после создания редактора
  watch(
    editor,
    (instance, _prev, onCleanup) => {
      if (!instance) return
      const provider = instance.extensionManager.extensions.find(
        (item) => item.name === 'collaborationCaret',
      )?.options?.provider
      if (provider?.on) {
        const handler = () => handleHash(500)
        provider.on('synced', handler)
        onCleanup(() => provider.off?.('synced', handler))
        return
      }
      handleHash(500)
    },
    { immediate: true },
  )

  const onHashChange = () => handleHash()
  const onPageShow = () => handleHash(500)
  window.addEventListener('hashchange', onHashChange)
  window.addEventListener('pageshow', onPageShow)
  window.addEventListener('popstate', onHashChange)
  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', onHashChange)
    window.removeEventListener('pageshow', onPageShow)
    window.removeEventListener('popstate', onHashChange)
  })

  return { scrollToHash }
}
