/**
 * Идентификатор документа — последний сегмент пути URL либо "default".
 * Порт getDocumentId из чанка 3xpmbr0kqzhen.
 */
export function getDocumentId(): string {
  const segments = window.location.pathname.split('/')
  return segments[segments.length - 1] || 'default'
}
