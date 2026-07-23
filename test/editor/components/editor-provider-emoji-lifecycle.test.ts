import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Deferred<Value> {
  promise: Promise<Value>
  resolve: (value: Value) => void
}

function createDeferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

const state = vi.hoisted(() => ({
  createExtensionKit: vi.fn(),
  diagnostics: {
    debug: vi.fn(),
    error: vi.fn(),
  },
  editorInstances: [] as Array<{
    isDestroyed: boolean
    destroy: ReturnType<typeof vi.fn>
    getJSON: ReturnType<typeof vi.fn>
    off: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
  }>,
}))

vi.mock('../../../packages/editor/src/extensions/extension-kit', () => ({
  createExtensionKit: state.createExtensionKit,
}))

vi.mock('@i-prikot/editor-schema', () => ({
  CURRENT_SCHEMA_VERSION: 1,
}))

vi.mock('../../../packages/editor/src/composables', async () => {
  const { ref } = await import('vue')

  return {
    provideEditorOverlayTarget: vi.fn(),
    provideTiptapEditor: vi.fn(),
    useToc: () => ({ setTocContent: vi.fn() }),
    useUser: () => ({ user: { id: 'test-user', name: 'Test User', color: '#000000' } }),
    useTiptapEditor: () => ref(null),
  }
})

vi.mock('../../../packages/editor/src/utils/development-diagnostics', () => ({
  createDevelopmentDiagnostics: () => state.diagnostics,
}))

vi.mock(
  '../../../packages/editor/src/components/notion/notion-editor/EditorContentArea.vue',
  () => ({
    default: { template: '<div />' },
  }),
)

vi.mock('../../../packages/editor/src/components/notion/toc', () => ({
  TocSidebar: { template: '<div />' },
}))

vi.mock('../../../packages/editor/src/components/notion/feedback', () => ({
  LoadingSpinner: { template: '<div />' },
}))

vi.mock('../../../packages/editor/src/components/table/table-overlays/TableOverlays.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@tiptap/vue-3', async (importOriginal) => ({
  ...(await importOriginal()),
  Editor: class {
    isDestroyed = false
    on = vi.fn()
    off = vi.fn()
    getJSON = vi.fn(() => ({ type: 'doc' }))
    destroy = vi.fn(() => {
      this.isDestroyed = true
    })

    constructor(options: { onCreate?: (event: { editor: unknown }) => void }) {
      state.editorInstances.push(this)
      options.onCreate?.({ editor: this })
    }
  },
}))

import EditorProvider from '../../../packages/editor/src/components/notion/notion-editor/EditorProvider.vue'

async function settleAsyncInitialization() {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function mountProvider() {
  return mount(EditorProvider, {
    props: {
      documentId: 'emoji-lifecycle-test',
      ydoc: {} as never,
      features: {
        tocSidebar: false,
        floatingMenus: false,
        mobileToolbar: false,
        tableControls: false,
        ai: false,
      },
      developmentDiagnostics: true,
    },
    shallow: true,
  })
}

beforeEach(() => {
  state.createExtensionKit.mockReset()
  state.diagnostics.debug.mockReset()
  state.diagnostics.error.mockReset()
  state.editorInstances.splice(0)
})

afterEach(() => {
  for (const editor of state.editorInstances) {
    if (!editor.isDestroyed) editor.destroy()
  }
})

describe('EditorProvider emoji lifecycle', () => {
  it('creates the editor and emits ready after the lazy extension kit resolves', async () => {
    state.createExtensionKit.mockResolvedValue([])

    const wrapper = mountProvider()
    await settleAsyncInitialization()

    expect(state.createExtensionKit).toHaveBeenCalledOnce()
    expect(state.editorInstances).toHaveLength(1)
    expect(state.diagnostics.debug).toHaveBeenCalledWith('editor-initialization', {
      result: 'completed',
    })

    wrapper.unmount()
  })

  it('does not create or expose an editor when the lazy extension kit rejects', async () => {
    state.createExtensionKit.mockRejectedValue(new Error('emoji module unavailable'))

    const wrapper = mountProvider()
    await settleAsyncInitialization()

    expect(state.editorInstances).toHaveLength(0)
    expect(wrapper.emitted('ready')).toBeUndefined()
    expect(state.diagnostics.error).toHaveBeenCalledWith('emoji-load', {
      result: 'failed',
      failureType: 'Error',
    })

    wrapper.unmount()
  })

  it('does not construct an editor after teardown when the lazy extension kit resolves late', async () => {
    const deferredExtensions = createDeferred<unknown[]>()
    state.createExtensionKit.mockReturnValue(deferredExtensions.promise)

    const wrapper = mountProvider()
    wrapper.unmount()
    deferredExtensions.resolve([])
    await settleAsyncInitialization()

    expect(state.editorInstances).toHaveLength(0)
    expect(state.diagnostics.debug).toHaveBeenCalledWith('emoji-load', {
      result: 'skipped-teardown',
    })
  })
})
