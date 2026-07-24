import { createLogger } from '@i-prikot/editor-schema'
import { inject, provide, toValue } from 'vue'
import type { InjectionKey, MaybeRefOrGetter } from 'vue'
import type {
  NotionEditorOperation,
  NotionEditorOperationErrorClass,
  NotionEditorOperationErrorCode,
  NotionEditorOperationErrorPayload,
} from '../components/notion/notion-editor/public-api'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'

export type EditorOperationErrorReporter = (
  operation: NotionEditorOperation,
  cause: unknown,
) => NotionEditorOperationErrorPayload | null

const logger = createLogger('useEditorOperationError')
const editorOperationErrorInjectionKey: InjectionKey<EditorOperationErrorReporter> =
  Symbol('editor-operation-error')

function operationErrorCode(operation: NotionEditorOperation): NotionEditorOperationErrorCode {
  return operation === 'image-upload' ? 'IMAGE_UPLOAD_FAILED' : 'IMAGE_DOWNLOAD_FAILED'
}

function operationErrorClass(cause: unknown): NotionEditorOperationErrorClass {
  if (typeof DOMException !== 'undefined' && cause instanceof DOMException) return 'DOMException'
  if (cause instanceof Error) return 'Error'
  return 'UnknownError'
}

function operationErrorPayload(
  operation: NotionEditorOperation,
  cause: unknown,
): NotionEditorOperationErrorPayload {
  return {
    operation,
    errorClass: operationErrorClass(cause),
    code: operationErrorCode(operation),
  }
}

function isOperation(value: unknown): value is NotionEditorOperation {
  return value === 'image-upload' || value === 'image-download'
}

export function provideEditorOperationError(
  emit: (payload: NotionEditorOperationErrorPayload) => void,
  developmentDiagnostics: MaybeRefOrGetter<boolean> = false,
): EditorOperationErrorReporter {
  const diagnostics = createDevelopmentDiagnostics('useEditorOperationError', {
    isEnabled: () => toValue(developmentDiagnostics) === true,
  })

  const report: EditorOperationErrorReporter = (operation, cause) => {
    if (!isOperation(operation)) {
      logger.error('operation-error-reporter-invalid-operation', {
        code: 'OPERATION_ERROR_INVALID_OPERATION',
      })
      return null
    }

    const payload = operationErrorPayload(operation, cause)
    diagnostics.debug('operation-error-reported', { ...payload })
    emit(payload)
    return payload
  }

  provide(editorOperationErrorInjectionKey, report)
  diagnostics.debug('operation-error-provider-ready', {})
  return report
}

export function useEditorOperationError(): EditorOperationErrorReporter {
  const reporter = inject(editorOperationErrorInjectionKey, null)
  if (reporter) return reporter

  logger.error('operation-error-reporter-unavailable', {
    code: 'OPERATION_ERROR_REPORTER_UNAVAILABLE',
  })

  return (operation, cause) => {
    if (!isOperation(operation)) return null

    const payload = operationErrorPayload(operation, cause)
    logger.error('operation-error-dropped', payload)
    return payload
  }
}
