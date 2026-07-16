const LIBRARY_STORAGE_NAMESPACE = 'notion-like-editor-vue:'

export interface IdentityStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function getNamespacedStorageKey(key: string): string {
  return key.startsWith(LIBRARY_STORAGE_NAMESPACE) ? key : `${LIBRARY_STORAGE_NAMESPACE}${key}`
}
