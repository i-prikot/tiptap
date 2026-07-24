export const errors = {
  imageUploadFailed: 'Image upload failed',
  imageUploadAdapterNotConfigured: 'Image upload adapter is unavailable',
  imageUploadInvalidUrl: 'The image upload did not return a valid URL',
  imageUploadEmptySelection: 'No image files were selected',
  imageUploadFileLimit: 'You can upload up to {limit} image files at a time',
  imageUploadFileSizeLimit: 'This image exceeds the {maxSize}MB size limit',
} as const
