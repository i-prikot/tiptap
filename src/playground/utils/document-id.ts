/**
 * Returns the final URL path segment, or the playground default document ID.
 */
export function getDocumentId(): string {
  const segments = window.location.pathname.split('/')
  return segments[segments.length - 1] || 'default'
}
