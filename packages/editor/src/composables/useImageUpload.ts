import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import type { ComputedRef } from 'vue'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Editor } from '@tiptap/core'
import type { ImageUploadNodeOptions } from '@i-prikot/editor-schema'
import type { EditorMessageKey, EditorMessageValues } from '../i18n/types'
import { focusNextNode, isValidPosition } from '../utils/tiptap-utils'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'

export type ImageUploadErrorMessageKey = Extract<EditorMessageKey, `errors.imageUpload${string}`>

export interface ImageUploadErrorMetadata {
  key: ImageUploadErrorMessageKey
  values?: EditorMessageValues
}

export interface ImageUploadFileItem {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  url?: string
  abortController?: AbortController
  error?: ImageUploadErrorMetadata
}

export interface UseImageUploadInput {
  editor: Editor
  getPos: () => number | undefined
  node: ComputedRef<ProseMirrorNode>
  options: ComputedRef<ImageUploadNodeOptions>
}

interface UploadedImage {
  id: string
  file: File
  url: string
}

type DebugMetadata = Record<string, boolean | number | string>

class PackageImageUploadError extends Error {
  readonly metadata: ImageUploadErrorMetadata

  constructor(metadata: ImageUploadErrorMetadata, message: string) {
    super(message)
    this.metadata = metadata
  }
}

const diagnostics = createDevelopmentDiagnostics('useImageUpload')

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const unit = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${parseFloat((bytes / Math.pow(1024, unit)).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][unit]}`
}

function createPackageImageUploadError(
  key: ImageUploadErrorMessageKey,
  message: string,
  values?: EditorMessageValues,
): PackageImageUploadError {
  return new PackageImageUploadError({ key, values }, message)
}

function getImageUploadErrorMetadata(error: unknown): ImageUploadErrorMetadata {
  return error instanceof PackageImageUploadError
    ? error.metadata
    : { key: 'errors.imageUploadFailed' }
}

function validateUploadedImageUrl(value: string): string {
  let url: URL

  try {
    url = new URL(value, window.location.href)
  } catch {
    throw createPackageImageUploadError(
      'errors.imageUploadInvalidUrl',
      'Upload failed: Invalid URL returned',
    )
  }

  if (url.protocol === 'http:' || url.protocol === 'https:') return url.href
  throw createPackageImageUploadError(
    'errors.imageUploadInvalidUrl',
    'Upload failed: Invalid URL returned',
  )
}

export function useImageUpload(input: UseImageUploadInput) {
  const fileItems = ref<ImageUploadFileItem[]>([])
  const dragActive = ref(false)
  const dragOver = ref(false)
  const fileInputRef = shallowRef<HTMLInputElement | null>(null)
  const selectionError = shallowRef<ImageUploadErrorMetadata>()
  const objectUrls = new Set<string>()

  const accept = computed(() => input.node.value.attrs.accept as string)
  const limit = computed(() => input.node.value.attrs.limit as number)
  const maxSize = computed(() => input.node.value.attrs.maxSize as number)
  const hasFiles = computed(() => fileItems.value.length > 0)

  function notifyError(error: Error): void {
    input.options.value.onError?.(error)
  }

  function reportSelectionError(error: PackageImageUploadError): void {
    selectionError.value = error.metadata
    notifyError(error)
  }

  function reportUnexpectedError(event: string, error: unknown, metadata: DebugMetadata): void {
    const normalizedError = error instanceof Error ? error : new Error('Upload failed')
    diagnostics.debug(event, {
      ...metadata,
      failureCategory: 'unexpected-image-upload-error',
    })
    notifyError(normalizedError)
  }

  function releaseObjectUrl(url?: string): void {
    if (!url || !objectUrls.delete(url)) return
    URL.revokeObjectURL(url)
  }

  function releaseFileItem(item: ImageUploadFileItem): void {
    item.abortController?.abort()
    releaseObjectUrl(item.url)
  }

  function updateFileItem(id: string, update: Partial<ImageUploadFileItem>): void {
    fileItems.value = fileItems.value.map((item) =>
      item.id === id ? { ...item, ...update } : item,
    )
  }

  async function uploadSingleFile(file: File): Promise<UploadedImage | null> {
    const options = input.options.value
    if (file.size > options.maxSize) {
      reportSelectionError(
        createPackageImageUploadError(
          'errors.imageUploadFileSizeLimit',
          `File size exceeds maximum allowed (${options.maxSize / 1024 / 1024}MB)`,
          { maxSize: options.maxSize / 1024 / 1024 },
        ),
      )
      return null
    }

    const abortController = new AbortController()
    const id = crypto.randomUUID()
    const item: ImageUploadFileItem = {
      id,
      file,
      progress: 0,
      status: 'uploading',
      abortController,
    }
    fileItems.value = [...fileItems.value, item]
    diagnostics.debug('upload-start', { fileSize: file.size, itemId: id })

    try {
      if (!options.upload) {
        throw createPackageImageUploadError(
          'errors.imageUploadAdapterNotConfigured',
          'image upload adapter is not configured',
        )
      }
      const uploadedUrl = await options.upload(file, {
        onProgress: (event) => {
          updateFileItem(id, { progress: event.progress })
          diagnostics.debug('upload-progress', { itemId: id, progress: event.progress })
        },
        abortSignal: abortController.signal,
      })
      if (!uploadedUrl) {
        throw createPackageImageUploadError(
          'errors.imageUploadInvalidUrl',
          'Upload failed: No URL returned',
        )
      }
      const url = validateUploadedImageUrl(uploadedUrl)
      if (abortController.signal.aborted) return null

      updateFileItem(id, { status: 'success', url, progress: 100 })
      diagnostics.debug('upload-success', { fileSize: file.size, itemId: id })
      options.onSuccess?.(url)
      return { id, file, url }
    } catch (error) {
      if (!abortController.signal.aborted) {
        updateFileItem(id, {
          status: 'error',
          progress: 0,
          error: getImageUploadErrorMetadata(error),
        })
        reportUnexpectedError('upload-failed', error, {
          fileSize: file.size,
          itemId: id,
        })
      }
      return null
    }
  }

  async function uploadFiles(files: File[]): Promise<UploadedImage[]> {
    const options = input.options.value
    if (files.length === 0) {
      reportSelectionError(
        createPackageImageUploadError('errors.imageUploadEmptySelection', 'No files to upload'),
      )
      return []
    }
    if (options.limit && files.length > options.limit) {
      reportSelectionError(
        createPackageImageUploadError(
          'errors.imageUploadFileLimit',
          `Maximum ${options.limit} file${options.limit === 1 ? '' : 's'} allowed`,
          { limit: options.limit },
        ),
      )
      return []
    }

    selectionError.value = undefined
    const results = await Promise.all(files.map((file) => uploadSingleFile(file)))
    return results.filter(
      (result): result is UploadedImage =>
        result !== null &&
        fileItems.value.some((item) => item.id === result.id && item.status === 'success'),
    )
  }

  function removeFileItem(id: string): void {
    const item = fileItems.value.find((entry) => entry.id === id)
    if (!item) return

    releaseFileItem(item)
    fileItems.value = fileItems.value.filter((entry) => entry.id !== id)
    diagnostics.debug('cancel-file', { fileSize: item.file.size, itemId: id })
  }

  function clearAllFiles(): void {
    const count = fileItems.value.length
    fileItems.value.forEach(releaseFileItem)
    fileItems.value = []
    diagnostics.debug('clear-files', { count })
  }

  function replaceUploadNode(uploadedImages: UploadedImage[]): void {
    const pos = input.getPos()
    if (!isValidPosition(pos)) {
      reportUnexpectedError(
        'invalid-node-position',
        new Error('Image upload node position is no longer valid'),
        {
          count: uploadedImages.length,
        },
      )
      return
    }

    const imageNodes = uploadedImages.map(({ file, url }) => {
      const name = file.name.replace(/\.[^/.]+$/, '') || 'unknown'
      return { type: input.options.value.type, attrs: { src: url, alt: name, title: name } }
    })

    try {
      const replaced = input.editor
        .chain()
        .focus()
        .deleteRange({ from: pos, to: pos + input.node.value.nodeSize })
        .insertContentAt(pos, imageNodes)
        .run()
      if (!replaced) throw new Error('Unable to replace image upload node')

      diagnostics.debug('node-replacement', { count: uploadedImages.length, position: pos })
      focusNextNode(input.editor)
    } catch (error) {
      reportUnexpectedError('node-replacement-failed', error, { count: uploadedImages.length })
    }
  }

  async function handleFiles(files: File[]): Promise<void> {
    const uploadedImages = await uploadFiles(files)
    if (uploadedImages.length > 0) replaceUploadNode(uploadedImages)
  }

  function handleWrapperClick(): void {
    if (!fileInputRef.value || hasFiles.value) return
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }

  function handleDragLeave(event: DragEvent): void {
    const currentTarget = event.currentTarget as HTMLElement
    if (!currentTarget.contains(event.relatedTarget as Node | null)) {
      dragActive.value = false
      dragOver.value = false
    }
  }

  function handleDrop(event: DragEvent): void {
    dragActive.value = false
    dragOver.value = false
    const files = Array.from(event.dataTransfer?.files ?? [])
    diagnostics.debug('drop', { count: files.length })
    if (files.length > 0) void handleFiles(files)
  }

  function handleFileInputChange(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? [])
    diagnostics.debug('selection', { count: files.length })
    if (files.length > 0) {
      void handleFiles(files)
      return
    }
    reportSelectionError(
      createPackageImageUploadError('errors.imageUploadEmptySelection', 'No file selected'),
    )
  }

  onScopeDispose(clearAllFiles)

  return {
    accept,
    clearAllFiles,
    dragActive,
    dragOver,
    fileInputRef,
    fileItems,
    formatFileSize,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    handleWrapperClick,
    hasFiles,
    limit,
    maxSize,
    removeFileItem,
    selectionError,
  }
}
