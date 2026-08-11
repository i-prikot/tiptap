import { CURRENT_SCHEMA_VERSION } from '@i-prikot/editor-schema'
import type { JSONContent } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/vue-3'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import { EDITOR_UPDATE_DEBOUNCE_MS } from './public-api'
import type { EditorFeatureFlags, NotionEditorUpdatePayload } from './public-api'
import type { createDevelopmentDiagnostics } from '../../../utils/development-diagnostics'
import { CANCEL_PENDING_UPDATE_META } from './editor-lifecycle-signals'

interface EditorLifecycleOptions {
  diagnostics: ReturnType<typeof createDevelopmentDiagnostics>
  getContent: () => JSONContent | undefined
  getFeatures: () => EditorFeatureFlags
  getProvider: () => HocuspocusProvider | null | undefined
  onReady: (editor: TiptapEditor) => void
  onUpdate: (payload: NotionEditorUpdatePayload) => void
  onContentSyncError: () => void
  onSerializationError: () => void
}

interface EditorLifecycleState {
  isApplyingExternalContent: boolean
  isTearingDown: boolean
  hasEmittedReady: boolean
  updateTimer: ReturnType<typeof setTimeout> | undefined
  scheduledUpdateCount: number
  emittedUpdateCount: number
  lifecycleUpdateListener: (() => void) | undefined
  pendingUpdateCancellationListener: ((payload: { transaction: Transaction }) => void) | undefined
  collabSyncedListener: (() => void) | undefined
  collabSyncedProvider: HocuspocusProvider | undefined
}

function hasEqualContent(left: JSONContent, right: JSONContent) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function createLifecycleState(): EditorLifecycleState {
  return {
    isApplyingExternalContent: false,
    isTearingDown: false,
    hasEmittedReady: false,
    updateTimer: undefined,
    scheduledUpdateCount: 0,
    emittedUpdateCount: 0,
    lifecycleUpdateListener: undefined,
    pendingUpdateCancellationListener: undefined,
    collabSyncedListener: undefined,
    collabSyncedProvider: undefined,
  }
}

function removeCollabSyncedListener(state: EditorLifecycleState, options: EditorLifecycleOptions) {
  if (state.collabSyncedListener && state.collabSyncedProvider) {
    state.collabSyncedProvider.off('synced', state.collabSyncedListener)
    options.diagnostics.debug('collab-synced-listener-detached', {})
  }
  state.collabSyncedListener = undefined
  state.collabSyncedProvider = undefined
}

function createUpdateScheduler(state: EditorLifecycleState, options: EditorLifecycleOptions) {
  const cancelScheduledUpdate = (
    reason: 'content-sync' | 'imperative-silent-content' | 'teardown' | 'unready',
  ) => {
    if (!state.updateTimer) return
    clearTimeout(state.updateTimer)
    state.updateTimer = undefined
    options.diagnostics.debug('update-cancelled', {
      reason,
      scheduledUpdateCount: state.scheduledUpdateCount,
      emittedUpdateCount: state.emittedUpdateCount,
    })
  }
  const flushUpdate = (editor: TiptapEditor) => {
    state.updateTimer = undefined
    if (state.isTearingDown || editor.isDestroyed) {
      options.diagnostics.debug('update-cancelled', {
        reason: 'unready',
        scheduledUpdateCount: state.scheduledUpdateCount,
        emittedUpdateCount: state.emittedUpdateCount,
      })
      return
    }
    try {
      options.onUpdate({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        json: editor.getJSON(),
        html: editor.getHTML(),
      })
      state.emittedUpdateCount += 1
      options.diagnostics.debug('update-flushed', {
        debounceMs: EDITOR_UPDATE_DEBOUNCE_MS,
        scheduledUpdateCount: state.scheduledUpdateCount,
        emittedUpdateCount: state.emittedUpdateCount,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    } catch {
      options.onSerializationError()
    }
  }
  const scheduleUpdate = (editor: TiptapEditor) => {
    if (state.isTearingDown || state.isApplyingExternalContent) {
      options.diagnostics.debug('update-cancelled', {
        reason: 'unready',
        scheduledUpdateCount: state.scheduledUpdateCount,
        emittedUpdateCount: state.emittedUpdateCount,
      })
      return
    }
    if (state.updateTimer) clearTimeout(state.updateTimer)
    state.scheduledUpdateCount += 1
    options.diagnostics.debug('update-scheduled', {
      debounceMs: EDITOR_UPDATE_DEBOUNCE_MS,
      scheduledUpdateCount: state.scheduledUpdateCount,
      emittedUpdateCount: state.emittedUpdateCount,
    })
    state.updateTimer = setTimeout(() => flushUpdate(editor), EDITOR_UPDATE_DEBOUNCE_MS)
  }

  return { cancelScheduledUpdate, scheduleUpdate }
}

function createReadyEmitter(
  state: EditorLifecycleState,
  options: EditorLifecycleOptions,
  scheduleUpdate: (editor: TiptapEditor) => void,
  cancelScheduledUpdate: (reason: 'imperative-silent-content') => void,
) {
  return (editor: TiptapEditor) => {
    if (state.isTearingDown || state.hasEmittedReady) return
    state.lifecycleUpdateListener = () => scheduleUpdate(editor)
    editor.on('update', state.lifecycleUpdateListener)
    state.pendingUpdateCancellationListener = ({ transaction }) => {
      if (transaction.getMeta(CANCEL_PENDING_UPDATE_META) === true) {
        cancelScheduledUpdate('imperative-silent-content')
      }
    }
    editor.on('transaction', state.pendingUpdateCancellationListener)
    state.hasEmittedReady = true
    options.onReady(editor)
    options.diagnostics.debug('ready', { debounceMs: EDITOR_UPDATE_DEBOUNCE_MS })
    options.diagnostics.debug('features-resolved', { ...options.getFeatures() })
  }
}

function createContentSynchronization(
  state: EditorLifecycleState,
  options: EditorLifecycleOptions,
  cancelScheduledUpdate: (reason: 'content-sync') => void,
) {
  const applyExternalContent = (editor: TiptapEditor, content: JSONContent) => {
    if (hasEqualContent(editor.getJSON(), content)) {
      options.diagnostics.debug('content-sync', { result: 'skipped-equal' })
      return false
    }
    state.isApplyingExternalContent = true
    try {
      cancelScheduledUpdate('content-sync')
      editor.commands.setContent(content, { emitUpdate: false })
      options.diagnostics.debug('content-sync', { result: 'applied' })
      return true
    } catch {
      options.onContentSyncError()
      return false
    } finally {
      state.isApplyingExternalContent = false
    }
  }
  const initializeContent = (editor: TiptapEditor, onInitialized: () => void) => {
    const applyHostContent = () => {
      const content = options.getContent()
      if (content !== undefined) applyExternalContent(editor, content)
    }
    const provider = options.getProvider()
    if (provider && !provider.isSynced) {
      removeCollabSyncedListener(state, options)
      state.collabSyncedListener = () => {
        removeCollabSyncedListener(state, options)
        setTimeout(() => {
          if (state.isTearingDown) return
          applyHostContent()
          onInitialized()
        }, 0)
      }
      state.collabSyncedProvider = provider
      provider.on('synced', state.collabSyncedListener)
      options.diagnostics.debug('collab-synced-listener-attached', {})
      return
    }
    applyHostContent()
    onInitialized()
  }

  return { applyExternalContent, initializeContent }
}

function teardownEditor(
  state: EditorLifecycleState,
  options: EditorLifecycleOptions,
  cancelScheduledUpdate: (reason: 'teardown') => void,
  editor: TiptapEditor | undefined,
) {
  state.isTearingDown = true
  cancelScheduledUpdate('teardown')
  if (editor && state.lifecycleUpdateListener) editor.off('update', state.lifecycleUpdateListener)
  if (editor && state.pendingUpdateCancellationListener) {
    editor.off('transaction', state.pendingUpdateCancellationListener)
  }
  removeCollabSyncedListener(state, options)
  options.diagnostics.debug('teardown', {
    scheduledUpdateCount: state.scheduledUpdateCount,
    emittedUpdateCount: state.emittedUpdateCount,
  })
  editor?.destroy()
}

export function useEditorLifecycle(options: EditorLifecycleOptions) {
  const state = createLifecycleState()
  const { cancelScheduledUpdate, scheduleUpdate } = createUpdateScheduler(state, options)
  const emitReady = createReadyEmitter(state, options, scheduleUpdate, cancelScheduledUpdate)
  const contentSynchronization = createContentSynchronization(state, options, cancelScheduledUpdate)

  return {
    get isTearingDown() {
      return state.isTearingDown
    },
    ...contentSynchronization,
    emitReady,
    teardown: (editor: TiptapEditor | undefined) =>
      teardownEditor(state, options, cancelScheduledUpdate, editor),
  }
}
