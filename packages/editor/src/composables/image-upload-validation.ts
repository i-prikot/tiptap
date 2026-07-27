import type { EditorMessageValues } from '../i18n/types'
import type { ImageUploadErrorMessageKey, ImageUploadErrorMetadata } from './useImageUpload'

export interface UploadedImage {
  id: string
  file: File
  url: string
}

export type DebugMetadata = Record<string, boolean | number | string>

export class PackageImageUploadError extends Error {
  readonly metadata: ImageUploadErrorMetadata

  constructor(metadata: ImageUploadErrorMetadata, message: string) {
    super(message)
    this.metadata = metadata
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const unit = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${parseFloat((bytes / Math.pow(1024, unit)).toFixed(2))} ${['Bytes', 'KB', 'MB', 'GB'][unit]}`
}

export function createPackageImageUploadError(
  key: ImageUploadErrorMessageKey,
  message: string,
  values?: EditorMessageValues,
): PackageImageUploadError {
  return new PackageImageUploadError({ key, values }, message)
}

export function getImageUploadErrorMetadata(error: unknown): ImageUploadErrorMetadata {
  return error instanceof PackageImageUploadError
    ? error.metadata
    : { key: 'errors.imageUploadFailed' }
}

export function validateUploadedImageUrl(value: string): string {
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
