/**
 * Scrolls to a block when the host supplies a decoded unique-node identifier.
 */
import { watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { selectNodeAndHideFloating } from '../utils/toc-utils'
import { useAnchorNavigation } from './useAnchorNavigation'

/** Resolves an editor extension by name. */
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
  const { consumeRequestedAnchorChange, currentAnchor } = useAnchorNavigation()
  let lastScrolledAnchor: string | null = null

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

  function handleAnchor(anchor: string | undefined, delay = 0) {
    if (!anchor || anchor === lastScrolledAnchor) return
    setTimeout(() => {
      if (scrollToHash(anchor)) {
        lastScrolledAnchor = anchor
        onTargetFound(anchor)
      } else {
        onTargetNotFound(anchor)
      }
    }, delay)
  }

  watch(
    [editor, currentAnchor],
    ([instance, anchor], _previous, onCleanup) => {
      if (!instance || !anchor) return
      if (consumeRequestedAnchorChange(anchor)) return
      const provider = instance.extensionManager.extensions.find(
        (item) => item.name === 'collaborationCaret',
      )?.options?.provider

      if (provider?.on && !provider.isSynced) {
        const handleSynced = () => handleAnchor(anchor, 500)
        provider.on('synced', handleSynced)
        onCleanup(() => provider.off?.('synced', handleSynced))
        return
      }

      handleAnchor(anchor, 500)
    },
    { immediate: true },
  )

  return { scrollToHash }
}
