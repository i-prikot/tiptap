<template>
  <NodeViewWrapper class="tiptap-image-upload" tabindex="0" @click="handleWrapperClick">
    <!-- дропзона (пока нет загружаемых файлов) -->
    <div
      v-if="!hasFiles"
      class="tiptap-image-upload-drag-area"
      :class="{ 'drag-active': dragActive, 'drag-over': dragOver }"
      @dragenter.prevent.stop="dragActive = true"
      @dragleave.prevent.stop="handleDragLeave"
      @dragover.prevent.stop="dragOver = true"
      @drop.prevent.stop="handleDrop"
    >
      <div class="tiptap-image-upload-dropzone">
        <svg
          width="43"
          height="57"
          viewBox="0 0 43 57"
          fill="currentColor"
          class="tiptap-image-upload-dropzone-rect-primary"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0.75 10.75C0.75 5.64137 4.89137 1.5 10 1.5H32.3431C33.2051 1.5 34.0317 1.84241 34.6412 2.4519L40.2981 8.10876C40.9076 8.71825 41.25 9.5449 41.25 10.4069V46.75C41.25 51.8586 37.1086 56 32 56H10C4.89137 56 0.75 51.8586 0.75 46.75V10.75Z"
            fill="currentColor"
            fill-opacity="0.11"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
        <svg
          width="10"
          height="10"
          class="tiptap-image-upload-dropzone-rect-secondary"
          viewBox="0 0 10 10"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0.75H0.343146C1.40401 0.75 2.42143 1.17143 3.17157 1.92157L8.82843 7.57843C9.57857 8.32857 10 9.34599 10 10.4069V10.75H4C1.79086 10.75 0 8.95914 0 6.75V0.75Z"
            fill="currentColor"
          />
        </svg>
        <div class="tiptap-image-upload-icon-container">
          <CloudUploadIcon />
        </div>
      </div>
      <div class="tiptap-image-upload-content">
        <span class="tiptap-image-upload-text"><em>Click to upload</em> or drag and drop</span>
        <span class="tiptap-image-upload-subtext">
          Maximum {{ limit }} file{{ limit === 1 ? '' : 's' }}, {{ maxSize / 1024 / 1024 }}MB each.
        </span>
      </div>
    </div>

    <!-- предпросмотр загружаемых файлов -->
    <div v-if="hasFiles" class="tiptap-image-upload-previews">
      <div v-if="fileItems.length > 1" class="tiptap-image-upload-header">
        <span>Uploading {{ fileItems.length }} files</span>
        <Button type="button" variant="ghost" @click.stop="clearAllFiles">Clear All</Button>
      </div>
      <div v-for="item in fileItems" :key="item.id" class="tiptap-image-upload-preview">
        <div
          v-if="item.status === 'uploading'"
          class="tiptap-image-upload-progress"
          :style="{ width: `${item.progress}%` }"
        />
        <div class="tiptap-image-upload-preview-content">
          <div class="tiptap-image-upload-file-info">
            <div class="tiptap-image-upload-file-icon">
              <CloudUploadIcon />
            </div>
            <div class="tiptap-image-upload-details">
              <span class="tiptap-image-upload-text">{{ item.file.name }}</span>
              <span class="tiptap-image-upload-subtext">{{ formatFileSize(item.file.size) }}</span>
              <span v-if="item.status === 'error'" class="tiptap-image-upload-subtext">
                {{ item.errorMessage }}
              </span>
            </div>
          </div>
          <div class="tiptap-image-upload-actions">
            <span v-if="item.status === 'uploading'" class="tiptap-image-upload-progress-text">
              {{ item.progress }}%
            </span>
            <Button type="button" variant="ghost" @click.stop="removeFileItem(item.id)">
              <CloseIcon class="tiptap-button-icon" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <input
      ref="fileInputRef"
      name="file"
      :accept="accept"
      type="file"
      :multiple="limit > 1"
      @change="handleFileInputChange"
      @click.stop
    />
  </NodeViewWrapper>
</template>

<script setup lang="ts">
/**
 * NodeView загрузки изображений: дропзона + input[type=file], прогресс,
 * отмена через AbortController; после загрузки узел заменяется image-узлами
 * и курсор переходит к следующему блоку.
 * Порт React-компонента из чанка 3jdxmcvhjtoe-.
 */
import { computed, h, ref } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { focusNextNode, isValidPosition } from '../../utils/tiptap-utils'
import { Button } from '@/editor/components/primitives'
import type { ImageUploadNodeOptions } from './image-upload-node'

const CloudUploadIcon = () =>
  h(
    'svg',
    {
      width: '24',
      height: '24',
      viewBox: '0 0 24 24',
      class: 'tiptap-image-upload-icon',
      fill: 'currentColor',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    [
      h('path', {
        d: 'M11.1953 4.41771C10.3478 4.08499 9.43578 3.94949 8.5282 4.02147C7.62062 4.09345 6.74133 4.37102 5.95691 4.83316C5.1725 5.2953 4.50354 5.92989 4.00071 6.68886C3.49788 7.44783 3.17436 8.31128 3.05465 9.2138C2.93495 10.1163 3.0222 11.0343 3.3098 11.8981C3.5974 12.7619 4.07781 13.5489 4.71463 14.1995C5.10094 14.5942 5.09414 15.2274 4.69945 15.6137C4.30476 16 3.67163 15.9932 3.28532 15.5985C2.43622 14.731 1.79568 13.6816 1.41221 12.5299C1.02875 11.3781 0.91241 10.1542 1.07201 8.95084C1.23162 7.74748 1.66298 6.59621 2.33343 5.58425C3.00387 4.57229 3.89581 3.72617 4.9417 3.10998C5.98758 2.4938 7.15998 2.1237 8.37008 2.02773C9.58018 1.93176 10.7963 2.11243 11.9262 2.55605C13.0561 2.99968 14.0703 3.69462 14.8919 4.58825C15.5423 5.29573 16.0585 6.11304 16.4177 7.00002H17.4999C18.6799 6.99991 19.8288 7.37933 20.7766 8.08222C21.7245 8.78515 22.4212 9.7743 22.7637 10.9036C23.1062 12.0328 23.0765 13.2423 22.6788 14.3534C22.2812 15.4644 21.5367 16.4181 20.5554 17.0736C20.0962 17.3803 19.4752 17.2567 19.1684 16.7975C18.8617 16.3382 18.9853 15.7172 19.4445 15.4105C20.069 14.9934 20.5427 14.3865 20.7958 13.6794C21.0488 12.9724 21.0678 12.2027 20.8498 11.4841C20.6318 10.7655 20.1885 10.136 19.5853 9.6887C18.9821 9.24138 18.251 8.99993 17.5001 9.00002H15.71C15.2679 9.00002 14.8783 8.70973 14.7518 8.28611C14.4913 7.41374 14.0357 6.61208 13.4195 5.94186C12.8034 5.27164 12.0427 4.75043 11.1953 4.41771Z',
        fill: 'currentColor',
      }),
      h('path', {
        d: 'M11 14.4142V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V14.4142L15.2929 16.7071C15.6834 17.0976 16.3166 17.0976 16.7071 16.7071C17.0976 16.3166 17.0976 15.6834 16.7071 15.2929L12.7078 11.2936C12.7054 11.2912 12.703 11.2888 12.7005 11.2864C12.5208 11.1099 12.2746 11.0008 12.003 11L12 11L11.997 11C11.8625 11.0004 11.7343 11.0273 11.6172 11.0759C11.502 11.1236 11.3938 11.1937 11.2995 11.2864C11.297 11.2888 11.2946 11.2912 11.2922 11.2936L7.29289 15.2929C6.90237 15.6834 6.90237 16.3166 7.29289 16.7071C7.68342 17.0976 8.31658 17.0976 8.70711 16.7071L11 14.4142Z',
        fill: 'currentColor',
      }),
    ],
  )

const CloseIcon = (props: { class?: string }) =>
  h(
    'svg',
    {
      width: '24',
      height: '24',
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      xmlns: 'http://www.w3.org/2000/svg',
      class: props.class,
    },
    [
      h('path', {
        d: 'M18.7071 6.70711C19.0976 6.31658 19.0976 5.68342 18.7071 5.29289C18.3166 4.90237 17.6834 4.90237 17.2929 5.29289L12 10.5858L6.70711 5.29289C6.31658 4.90237 5.68342 4.90237 5.29289 5.29289C4.90237 5.68342 4.90237 6.31658 5.29289 6.70711L10.5858 12L5.29289 17.2929C4.90237 17.6834 4.90237 18.3166 5.29289 18.7071C5.68342 19.0976 6.31658 19.0976 6.70711 18.7071L12 13.4142L17.2929 18.7071C17.6834 19.0976 18.3166 19.0976 18.7071 18.7071C19.0976 18.3166 19.0976 17.6834 18.7071 17.2929L13.4142 12L18.7071 6.70711Z',
        fill: 'currentColor',
      }),
    ],
  )

const props = defineProps(nodeViewProps)

const accept = computed(() => props.node.attrs.accept as string)
const limit = computed(() => props.node.attrs.limit as number)
const maxSize = computed(() => props.node.attrs.maxSize as number)
const uploadOptions = computed(() => props.extension.options as ImageUploadNodeOptions)

interface FileItem {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  url?: string
  abortController?: AbortController
  errorMessage?: string
}

const fileItems = ref<FileItem[]>([])
const hasFiles = computed(() => fileItems.value.length > 0)

const dragActive = ref(false)
const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes'
  const unit = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${parseFloat((bytes / Math.pow(1024, unit)).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][unit]}`
}

function validateUploadedImageUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value, window.location.href)
  } catch {
    throw new Error('Upload failed: Invalid URL returned')
  }

  if (url.protocol === 'http:' || url.protocol === 'https:') return url.href
  throw new Error('Upload failed: Invalid URL returned')
}

async function uploadSingleFile(file: File): Promise<string | null> {
  const options = uploadOptions.value
  if (file.size > options.maxSize) {
    options.onError?.(
      new Error(`File size exceeds maximum allowed (${options.maxSize / 1024 / 1024}MB)`),
    )
    return null
  }

  const abortController = new AbortController()
  const id = crypto.randomUUID()
  const item: FileItem = { id, file, progress: 0, status: 'uploading', abortController }
  fileItems.value = [...fileItems.value, item]

  try {
    if (!options.upload) throw new Error('image upload adapter is not configured')
    const uploadedUrl = await options.upload(file, {
      onProgress: (event) => {
        fileItems.value = fileItems.value.map((entry) =>
          entry.id === id ? { ...entry, progress: event.progress } : entry,
        )
      },
      abortSignal: abortController.signal,
    })
    if (!uploadedUrl) throw new Error('Upload failed: No URL returned')
    const url = validateUploadedImageUrl(uploadedUrl)
    if (abortController.signal.aborted) return null

    fileItems.value = fileItems.value.map((entry) =>
      entry.id === id ? { ...entry, status: 'success' as const, url, progress: 100 } : entry,
    )
    options.onSuccess?.(url)
    return url
  } catch (error) {
    if (!abortController.signal.aborted) {
      const errorMessage =
        error instanceof Error && error.message === 'image upload adapter is not configured'
          ? error.message
          : 'Image upload failed'
      fileItems.value = fileItems.value.map((entry) =>
        entry.id === id ? { ...entry, status: 'error' as const, progress: 0, errorMessage } : entry,
      )
      options.onError?.(error instanceof Error ? error : new Error('Upload failed'))
    }
    return null
  }
}

async function uploadFiles(files: File[]): Promise<string[]> {
  const options = uploadOptions.value
  if (!files || files.length === 0) {
    options.onError?.(new Error('No files to upload'))
    return []
  }
  if (options.limit && files.length > options.limit) {
    options.onError?.(
      new Error(`Maximum ${options.limit} file${options.limit === 1 ? '' : 's'} allowed`),
    )
    return []
  }
  const results = await Promise.all(files.map((file) => uploadSingleFile(file)))
  return results.filter((url): url is string => url !== null)
}

function removeFileItem(id: string) {
  const item = fileItems.value.find((entry) => entry.id === id)
  if (item?.abortController) item.abortController.abort()
  if (item?.url) URL.revokeObjectURL(item.url)
  fileItems.value = fileItems.value.filter((entry) => entry.id !== id)
}

function clearAllFiles() {
  fileItems.value.forEach((item) => {
    if (item.abortController) item.abortController.abort()
    if (item.url) URL.revokeObjectURL(item.url)
  })
  fileItems.value = []
}

/** Заменяет upload-узел загруженными изображениями. */
async function handleFiles(files: File[]) {
  const urls = await uploadFiles(files)
  if (urls.length === 0) return

  const pos = props.getPos()
  if (!isValidPosition(pos)) return

  const options = uploadOptions.value
  const imageNodes = urls.map((url, index) => {
    const name = files[index]?.name.replace(/\.[^/.]+$/, '') || 'unknown'
    return { type: options.type, attrs: { ...options, src: url, alt: name, title: name } }
  })

  props.editor
    .chain()
    .focus()
    .deleteRange({ from: pos, to: pos + props.node.nodeSize })
    .insertContentAt(pos, imageNodes)
    .run()
  focusNextNode(props.editor)
}

function handleWrapperClick() {
  if (fileInputRef.value && fileItems.value.length === 0) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

function handleDragLeave(event: DragEvent) {
  const currentTarget = event.currentTarget as HTMLElement
  if (!currentTarget.contains(event.relatedTarget as Node | null)) {
    dragActive.value = false
    dragOver.value = false
  }
}

function handleDrop(event: DragEvent) {
  dragActive.value = false
  dragOver.value = false
  const files = Array.from(event.dataTransfer?.files ?? [])
  if (files.length > 0) handleFiles(files)
}

function handleFileInputChange(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (files && files.length !== 0) {
    handleFiles(Array.from(files))
  } else {
    uploadOptions.value.onError?.(new Error('No file selected'))
  }
}
</script>
