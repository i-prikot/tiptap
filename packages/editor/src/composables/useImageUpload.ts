import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { formatFileSize } from './image-upload-validation'
import { ImageUploadOperations } from './image-upload-operations'
import type { UseImageUploadInput } from './image-upload-types'

export type {
  ImageUploadErrorMessageKey,
  ImageUploadErrorMetadata,
  ImageUploadFileItem,
  UseImageUploadInput,
} from './image-upload-types'

export function useImageUpload(input: UseImageUploadInput) {
  const operations = new ImageUploadOperations(input)
  const dragActive = ref(false)
  const dragOver = ref(false)
  const fileInputRef = input.fileInputRef ?? shallowRef<HTMLInputElement | null>(null)
  const accept = computed(() => input.node.value.attrs.accept as string)
  const limit = computed(() => input.node.value.attrs.limit as number)
  const maxSize = computed(() => input.node.value.attrs.maxSize as number)
  const hasFiles = computed(() => operations.fileItems.value.length > 0)

  onScopeDispose(() => operations.clearAllFiles())

  return {
    accept,
    clearAllFiles: () => operations.clearAllFiles(),
    dragActive,
    dragOver,
    fileItems: operations.fileItems,
    formatFileSize,
    handleDragLeave: (event: DragEvent) => operations.handleDragLeave(event, dragActive, dragOver),
    handleDrop: (event: DragEvent) => operations.handleDrop(event, dragActive, dragOver),
    handleFileInputChange: (event: Event) => operations.handleFileInputChange(event),
    handleWrapperClick: () => operations.handleWrapperClick(fileInputRef.value),
    hasFiles,
    limit,
    maxSize,
    removeFileItem: (id: string) => operations.removeFileItem(id),
    selectionError: operations.selectionError,
  }
}
