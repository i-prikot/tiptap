import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NotionEditor from '../../../../src/editor/components/notion/notion-editor/NotionEditor.vue'
import type { NotionEditorOperationErrorPayload } from '../../../../src/editor/components/notion/notion-editor/public-api'

const testState = vi.hoisted(() => ({
  emitOperationError: undefined as
    ((payload: NotionEditorOperationErrorPayload) => void) | undefined,
}))

vi.mock('../../../../src/editor/components/notion/notion-editor/NotionEditorContent.vue', () => ({
  default: { render: () => null },
}))

vi.mock('../../../../src/editor/composables', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/editor/composables')>()
  return {
    ...actual,
    provideEditorOperationError: (emit: (payload: NotionEditorOperationErrorPayload) => void) => {
      testState.emitOperationError = emit
      return vi.fn()
    },
  }
})

afterEach(() => {
  testState.emitOperationError = undefined
})

describe('NotionEditor operation errors', () => {
  it('emits exactly one safe public event for an image-upload failure', () => {
    const onOperationError = vi.fn()
    const Host = defineComponent({
      setup() {
        return () =>
          h(NotionEditor, {
            baseUrl: 'https://tinyfy.example.test',
            documentId: 'tinyfy-operation-error-test',
            onOperationError,
          })
      },
    })
    mount(Host)

    if (!testState.emitOperationError) throw new Error('Expected operation error callback')

    testState.emitOperationError({
      operation: 'image-upload',
      errorClass: 'Error',
      code: 'IMAGE_UPLOAD_FAILED',
    })

    expect(onOperationError).toHaveBeenCalledTimes(1)
    expect(onOperationError).toHaveBeenCalledWith({
      operation: 'image-upload',
      errorClass: 'Error',
      code: 'IMAGE_UPLOAD_FAILED',
    })
  })
})
