import { createLogger } from '@i-prikot/editor-schema'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { ArrowDownToLineIcon } from '../icons'
import { isExtensionAvailable, isNodeTypeSelected } from '../utils/tiptap-utils'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

const logger = createLogger('useImageDownload')

export const IMAGE_DOWNLOAD_SHORTCUT_KEY = 'mod+shift+d'

function fileExtensionFor(url: string, mimeType?: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/)
  if (match && match[1]) return `.${match[1].toLowerCase()}`
  if (mimeType) {
    const byMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
    }
    const ext = byMime[mimeType.toLowerCase()]
    if (ext) return ext
  }
  return '.jpg'
}

function canDownloadImage(editor: Editor | null): boolean {
  return (
    !!editor &&
    !!editor.isEditable &&
    !!isExtensionAvailable(editor, ['image']) &&
    isNodeTypeSelected(editor, ['image'])
  )
}

function getSelectedImageAttrs(
  editor: Editor | null,
): { src: string; alt?: string; title?: string } | null {
  if (!editor || !canDownloadImage(editor)) return null
  const { selection } = editor.state
  if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
    const { src, alt, title } = selection.node.attrs
    return { src, alt, title }
  }
  return null
}

async function downloadViaFetch(url: string, fileName: string): Promise<boolean> {
  try {
    const response = await fetch(url)
    if (!response.ok) return false
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const name = /\.[a-zA-Z0-9]+$/.test(fileName)
      ? fileName
      : fileName + fileExtensionFor(url, response.headers.get('content-type') || undefined)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = name
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    return true
  } catch (error) {
    logger.warn('Fetch download failed:', error)
    return false
  }
}

function downloadDirect(url: string, fileName: string): boolean {
  try {
    const name = /\.[a-zA-Z0-9]+$/.test(fileName) ? fileName : fileName + fileExtensionFor(url)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    return true
  } catch (error) {
    logger.warn('Direct download failed:', error)
    return false
  }
}

export function useImageDownload(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canDownload = computed(() => (signal.value, canDownloadImage(editor.value)))

  const handleDownload = async (): Promise<boolean> => {
    const instance = editor.value
    if (!instance || !canDownloadImage(instance)) return false
    const attrs = getSelectedImageAttrs(instance)
    if (!attrs?.src) return false
    const fileName = attrs.title || attrs.alt || 'image'
    if (await downloadViaFetch(attrs.src, fileName)) return true
    if (downloadDirect(attrs.src, fileName)) return true
    try {
      window.open(attrs.src, '_blank')
      return true
    } catch (error) {
      logger.error('Failed to open image:', error)
      return false
    }
  }

  return {
    canDownload,
    handleDownload,
    label: 'Download image',
    shortcutKeys: IMAGE_DOWNLOAD_SHORTCUT_KEY,
    Icon: ArrowDownToLineIcon,
  }
}
