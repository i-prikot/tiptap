import { afterEach, describe, expect, it } from 'vitest'
import { getDocumentId } from '../../../src/editor/utils/document-id'

describe('getDocumentId', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('returns the final segment of a nested pathname', () => {
    window.history.replaceState(null, '', '/documents/team/roadmap')

    expect(getDocumentId()).toBe('roadmap')
  })

  it('returns default for root and trailing-slash paths', () => {
    window.history.replaceState(null, '', '/')
    expect(getDocumentId()).toBe('default')

    window.history.replaceState(null, '', '/documents/team/')
    expect(getDocumentId()).toBe('default')
  })

  it('does not use query or hash data as the document id', () => {
    window.history.replaceState(null, '', '/documents/notes?view=compact#section-two')

    expect(getDocumentId()).toBe('notes')
  })
})
