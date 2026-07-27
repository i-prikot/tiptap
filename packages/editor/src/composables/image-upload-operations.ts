import type { Ref, ShallowRef } from 'vue'
import { ref, shallowRef } from 'vue'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'
import { focusNextNode, isValidPosition } from '../utils/tiptap-utils'
import {
  createPackageImageUploadError,
  getImageUploadErrorMetadata,
  validateUploadedImageUrl,
} from './image-upload-validation'
import type {
  DebugMetadata,
  PackageImageUploadError,
  UploadedImage,
} from './image-upload-validation'
import type {
  ImageUploadErrorMetadata,
  ImageUploadFileItem,
  UseImageUploadInput,
} from './image-upload-types'

const diagnostics = createDevelopmentDiagnostics('useImageUpload')

export class ImageUploadOperations {
  readonly fileItems: Ref<ImageUploadFileItem[]> = ref([])
  readonly selectionError: ShallowRef<ImageUploadErrorMetadata | undefined> = shallowRef()
  private readonly objectUrls = new Set<string>()

  constructor(private readonly input: UseImageUploadInput) {}

  private notifyError(error: Error): void {
    this.input.options.value.onError?.(error)
  }

  private reportSelectionError(error: PackageImageUploadError): void {
    this.selectionError.value = error.metadata
    this.notifyError(error)
  }

  private reportUnexpectedError(event: string, error: unknown, metadata: DebugMetadata): void {
    const normalizedError = error instanceof Error ? error : new Error('Upload failed')
    diagnostics.debug(event, { ...metadata, failureCategory: 'unexpected-image-upload-error' })
    this.notifyError(normalizedError)
  }

  private releaseObjectUrl(url?: string): void {
    if (!url || !this.objectUrls.delete(url)) return
    URL.revokeObjectURL(url)
  }

  private releaseFileItem(item: ImageUploadFileItem): void {
    item.abortController?.abort()
    this.releaseObjectUrl(item.url)
  }

  private updateFileItem(id: string, update: Partial<ImageUploadFileItem>): void {
    this.fileItems.value = this.fileItems.value.map((item) =>
      item.id === id ? { ...item, ...update } : item,
    )
  }

  private async uploadSingleFile(file: File): Promise<UploadedImage | null> {
    const options = this.input.options.value
    if (file.size > options.maxSize) {
      this.reportSelectionError(
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
    this.fileItems.value = [...this.fileItems.value, item]
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
          this.updateFileItem(id, { progress: event.progress })
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

      this.updateFileItem(id, { status: 'success', url, progress: 100 })
      diagnostics.debug('upload-success', { fileSize: file.size, itemId: id })
      options.onSuccess?.(url)
      return { id, file, url }
    } catch (error) {
      if (!abortController.signal.aborted) {
        this.updateFileItem(id, {
          status: 'error',
          progress: 0,
          error: getImageUploadErrorMetadata(error),
        })
        this.reportUnexpectedError('upload-failed', error, { fileSize: file.size, itemId: id })
      }
      return null
    }
  }

  private async uploadFiles(files: File[]): Promise<UploadedImage[]> {
    const options = this.input.options.value
    if (files.length === 0) {
      this.reportSelectionError(
        createPackageImageUploadError('errors.imageUploadEmptySelection', 'No files to upload'),
      )
      return []
    }
    if (options.limit && files.length > options.limit) {
      this.reportSelectionError(
        createPackageImageUploadError(
          'errors.imageUploadFileLimit',
          `Maximum ${options.limit} file${options.limit === 1 ? '' : 's'} allowed`,
          { limit: options.limit },
        ),
      )
      return []
    }

    this.selectionError.value = undefined
    const results = await Promise.all(files.map((file) => this.uploadSingleFile(file)))
    return results.filter(
      (result): result is UploadedImage =>
        result !== null &&
        this.fileItems.value.some((item) => item.id === result.id && item.status === 'success'),
    )
  }

  removeFileItem(id: string): void {
    const item = this.fileItems.value.find((entry) => entry.id === id)
    if (!item) return

    this.releaseFileItem(item)
    this.fileItems.value = this.fileItems.value.filter((entry) => entry.id !== id)
    diagnostics.debug('cancel-file', { fileSize: item.file.size, itemId: id })
  }

  clearAllFiles(): void {
    const count = this.fileItems.value.length
    this.fileItems.value.forEach((item) => this.releaseFileItem(item))
    this.fileItems.value = []
    diagnostics.debug('clear-files', { count })
  }

  private replaceUploadNode(uploadedImages: UploadedImage[]): void {
    const pos = this.input.getPos()
    if (!isValidPosition(pos)) {
      this.reportUnexpectedError(
        'invalid-node-position',
        new Error('Image upload node position is no longer valid'),
        { count: uploadedImages.length },
      )
      return
    }

    const imageNodes = uploadedImages.map(({ file, url }) => {
      const name = file.name.replace(/\.[^/.]+$/, '') || 'unknown'
      return { type: this.input.options.value.type, attrs: { src: url, alt: name, title: name } }
    })

    try {
      const replaced = this.input.editor
        .chain()
        .focus()
        .deleteRange({ from: pos, to: pos + this.input.node.value.nodeSize })
        .insertContentAt(pos, imageNodes)
        .run()
      if (!replaced) throw new Error('Unable to replace image upload node')

      diagnostics.debug('node-replacement', { count: uploadedImages.length, position: pos })
      focusNextNode(this.input.editor)
    } catch (error) {
      this.reportUnexpectedError('node-replacement-failed', error, { count: uploadedImages.length })
    }
  }

  private async handleFiles(files: File[]): Promise<void> {
    const uploadedImages = await this.uploadFiles(files)
    if (uploadedImages.length > 0) this.replaceUploadNode(uploadedImages)
  }

  handleWrapperClick(fileInput: HTMLInputElement | null): void {
    if (!fileInput || this.fileItems.value.length > 0) return
    fileInput.value = ''
    fileInput.click()
  }

  handleDragLeave(event: DragEvent, dragActive: Ref<boolean>, dragOver: Ref<boolean>): void {
    const currentTarget = event.currentTarget as HTMLElement
    if (!currentTarget.contains(event.relatedTarget as Node | null)) {
      dragActive.value = false
      dragOver.value = false
    }
  }

  handleDrop(event: DragEvent, dragActive: Ref<boolean>, dragOver: Ref<boolean>): void {
    dragActive.value = false
    dragOver.value = false
    const files = Array.from(event.dataTransfer?.files ?? [])
    diagnostics.debug('drop', { count: files.length })
    if (files.length > 0) void this.handleFiles(files)
  }

  handleFileInputChange(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? [])
    diagnostics.debug('selection', { count: files.length })
    if (files.length > 0) {
      void this.handleFiles(files)
      return
    }
    this.reportSelectionError(
      createPackageImageUploadError('errors.imageUploadEmptySelection', 'No file selected'),
    )
  }
}
