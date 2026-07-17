/** Controls supplied by the editor for a single image-upload request. */
export interface ImageUploadCallbacks {
  onProgress: (event: { progress: number }) => void
  abortSignal: AbortSignal
}

/** Host-owned storage adapter used by the image-upload node. */
export type ImageUploadAdapter = (file: File, callbacks: ImageUploadCallbacks) => Promise<string>
