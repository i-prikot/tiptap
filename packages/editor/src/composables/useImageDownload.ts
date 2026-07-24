import { createLogger } from '@i-prikot/editor-schema'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { ArrowDownToLineIcon } from '../icons'
import { isExtensionAvailable, isNodeTypeSelected } from '../utils/tiptap-utils'
import { useEditorOperationError } from './useEditorOperationError'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

const logger = createLogger('useImageDownload')

export const IMAGE_DOWNLOAD_SHORTCUT_KEY = 'mod+shift+d'

type DownloadStrategy = 'fetch' | 'object-url' | 'direct-anchor' | 'window-open'

interface DownloadSuccess {
  success: true
  strategy: DownloadStrategy
}

interface DownloadFailure {
  success: false
  strategy: DownloadStrategy
  error: unknown
}

type DownloadAttempt = DownloadSuccess | DownloadFailure

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

function failedDownload(strategy: DownloadStrategy, error: unknown): DownloadFailure {
  return { success: false, strategy, error }
}

function completedDownload(strategy: DownloadStrategy): DownloadSuccess {
  return { success: true, strategy }
}

async function downloadViaFetch(url: string, fileName: string): Promise<DownloadAttempt> {
  logger.debug('download-attempt', { strategy: 'fetch' })

  let response: Response
  try {
    response = await fetch(url)
  } catch (error) {
    return failedDownload('fetch', error)
  }

  if (!response.ok) {
    return failedDownload(
      'fetch',
      new Error(`Image download request failed with status ${response.status}`),
    )
  }

  logger.debug('download-attempt', { strategy: 'object-url' })
  let objectUrl: string | undefined
  let anchor: HTMLAnchorElement | undefined
  try {
    const blob = await response.blob()
    objectUrl = URL.createObjectURL(blob)
    const name = /\.[a-zA-Z0-9]+$/.test(fileName)
      ? fileName
      : fileName + fileExtensionFor(url, response.headers.get('content-type') || undefined)
    anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = name
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    return completedDownload('object-url')
  } catch (error) {
    return failedDownload('object-url', error)
  } finally {
    anchor?.remove()
    const objectUrlToRevoke = objectUrl
    if (objectUrlToRevoke) setTimeout(() => URL.revokeObjectURL(objectUrlToRevoke), 0)
  }
}

function downloadDirect(url: string, fileName: string): DownloadAttempt {
  logger.debug('download-attempt', { strategy: 'direct-anchor' })

  let anchor: HTMLAnchorElement | undefined
  try {
    const name = /\.[a-zA-Z0-9]+$/.test(fileName) ? fileName : fileName + fileExtensionFor(url)
    anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    return completedDownload('direct-anchor')
  } catch (error) {
    return failedDownload('direct-anchor', error)
  } finally {
    anchor?.remove()
  }
}

export function useImageDownload(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canDownload = computed(() => (signal.value, canDownloadImage(editor.value)))
  const reportOperationError = useEditorOperationError()

  const handleDownload = async (): Promise<boolean> => {
    const instance = editor.value
    if (!instance || !canDownloadImage(instance)) {
      logger.debug('download-unavailable', { reason: 'image-not-selected' })
      return false
    }

    const attrs = getSelectedImageAttrs(instance)
    if (!attrs?.src) {
      logger.debug('download-unavailable', { reason: 'image-source-missing' })
      return false
    }

    const fileName = attrs.title || attrs.alt || 'image'
    const fetchedDownload = await downloadViaFetch(attrs.src, fileName)
    if (fetchedDownload.success) {
      logger.debug('download-strategy-selected', { strategy: fetchedDownload.strategy })
      logger.info('download-completed', { strategy: fetchedDownload.strategy })
      return true
    }

    const directDownload = downloadDirect(attrs.src, fileName)
    if (directDownload.success) {
      logger.debug('download-strategy-selected', { strategy: directDownload.strategy })
      logger.info('download-completed', { strategy: directDownload.strategy })
      return true
    }

    logger.debug('download-attempt', { strategy: 'window-open' })
    let finalFailure: DownloadFailure
    try {
      const popup = window.open(attrs.src, '_blank')
      if (popup) {
        logger.debug('download-strategy-selected', { strategy: 'window-open' })
        logger.info('download-completed', { strategy: 'window-open' })
        return true
      }
      finalFailure = failedDownload('window-open', new Error('Image download popup was blocked'))
    } catch (error) {
      finalFailure = failedDownload('window-open', error)
    }

    const payload = reportOperationError('image-download', finalFailure.error)
    if (payload) logger.error('image-download-failed', payload)
    return false
  }

  return {
    canDownload,
    handleDownload,
    label: 'Download image',
    shortcutKeys: IMAGE_DOWNLOAD_SHORTCUT_KEY,
    Icon: ArrowDownToLineIcon,
  }
}
