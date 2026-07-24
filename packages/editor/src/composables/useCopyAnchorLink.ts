import { createLogger } from '@i-prikot/editor-schema'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { LinkIcon } from '../icons'
import { getEditorExtension } from './useScrollToHash'
import { useAnchorNavigation } from './useAnchorNavigation'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import { getAnchorNodeAndPos } from './nodeActionUtils'

const logger = createLogger('useCopyAnchorLink')

export const COPY_ANCHOR_LINK_SHORTCUT_KEY = 'mod+ctrl+l'

function getNodeIdInfo(editor: Editor | null) {
  if (!editor || !editor.isEditable) return null
  const anchor = getAnchorNodeAndPos(editor)
  if (!anchor) return null
  const attributeName = getEditorExtension(editor, 'uniqueID')?.options?.attributeName || 'data-id'
  const nodeId = (anchor.node.attrs?.[attributeName] as string | undefined) ?? null
  return { node: anchor.node, nodeId, hasNodeId: nodeId !== null }
}

export function useCopyAnchorLink(editor: ComputedRef<Editor | null>) {
  const { baseUrl } = useAnchorNavigation()
  const signal = useEditorSelectionSignal(editor)
  const canCopyAnchorLink = computed(
    () => (signal.value, getNodeIdInfo(editor.value)?.hasNodeId ?? false),
  )

  const handleCopyAnchorLink = async (): Promise<boolean> => {
    const info = getNodeIdInfo(editor.value)
    if (!info || !info.hasNodeId || !info.nodeId) return false
    try {
      const url = new URL(baseUrl.value)
      url.searchParams.set('source', 'copy_link')
      url.hash = info.nodeId
      await navigator.clipboard.writeText(url.toString())
      return true
    } catch (error) {
      logger.error('Failed to copy node ID to clipboard:', error)
      return false
    }
  }

  return {
    canCopyAnchorLink,
    handleCopyAnchorLink,
    label: 'Copy anchor link',
    shortcutKeys: COPY_ANCHOR_LINK_SHORTCUT_KEY,
    Icon: LinkIcon,
  }
}
