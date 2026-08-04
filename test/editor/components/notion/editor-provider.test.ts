import { mount } from '@vue/test-utils'
import { nextTick, shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import type { BlockRoleOption } from '@i-prikot/editor-schema'
import EditorProvider from '../../../../packages/editor/src/components/notion/notion-editor/EditorProvider.vue'
import type { ImageUploadAdapter } from '../../../../packages/editor/src/types'

interface ChainCall {
  method: 'setMeta' | 'setContent' | 'focus'
  args: unknown[]
}

interface FakeChain {
  setMeta: (key: string, value: unknown) => FakeChain
  setContent: (content: unknown) => FakeChain
  focus: (position: string, options: { scrollIntoView: boolean }) => FakeChain
  run: () => boolean
}

interface FakeEditor {
  isEmpty: boolean
  chain: () => FakeChain
  on: (event: string, callback: () => void) => void
  off: (event: string, callback: () => void) => void
  destroy: () => void
}

interface CapturedEditorOptions {
  editorProps: { attributes: { class: string } }
  extensions: Array<{ name: string; options: Record<string, unknown> }>
  onCreate: (context: { editor: FakeEditor }) => void
}

interface EditorHarness {
  editor: FakeEditor
  chainCalls: ChainCall[][]
  emitUpdate: () => void
}

interface FakeProvider {
  isSynced: boolean
  on: (event: string, callback: () => void) => void
  off: (event: string, callback: () => void) => void
}

interface ProviderHarness {
  provider: FakeProvider
  triggerSynced: () => void
}

interface ExtensionKitInput {
  provider: FakeProvider | null
  ydoc: Y.Doc
  placeholder: () => string
  user: { id: string; name: string; color: string }
  imageUpload: ImageUploadAdapter
}

const testState = vi.hoisted(() => ({
  documentId: 'editor-provider-test-document',
  editorOptions: null as CapturedEditorOptions | null,
  editorRef: null as unknown,
  editorContentAreaProps: null as { blockRoles?: readonly BlockRoleOption[] } | null,
  createExtensionKit: vi.fn(),
  diagnostics: { debug: vi.fn(), error: vi.fn() },
  setTocContent: vi.fn(),
  provideTiptapEditor: vi.fn(),
}))

vi.mock('@i-prikot/editor-schema', () => ({
  CURRENT_SCHEMA_VERSION: 1,
  createLogger: () => testState.diagnostics,
}))

vi.mock('@tiptap/vue-3', () => {
  return {
    Editor: class {
      constructor(options: CapturedEditorOptions) {
        testState.editorOptions = options
        return (testState.editorRef as { value: object }).value
      }
    },
  }
})

vi.mock('../../../../packages/editor/src/extensions/extension-kit', () => ({
  createExtensionKit: testState.createExtensionKit,
}))

vi.mock('../../../../packages/editor/src/composables', () => ({
  provideEditorOverlayTarget: vi.fn(),
  provideTiptapEditor: testState.provideTiptapEditor,
  useEditorI18n: () => ({ t: (key: string) => key }),
  useToc: () => ({ setTocContent: testState.setTocContent }),
  useUser: () => ({ user: { id: 'test-user', name: 'Test User', color: '#2563eb' } }),
}))

vi.mock('../../../../packages/editor/src/utils/development-diagnostics', () => ({
  createDevelopmentDiagnostics: () => testState.diagnostics,
}))

vi.mock(
  '../../../../packages/editor/src/components/notion/notion-editor/EditorContentArea.vue',
  () => ({
    default: {
      name: 'EditorContentArea',
      props: { blockRoles: { type: Array, default: undefined } },
      setup(props: { blockRoles?: readonly BlockRoleOption[] }) {
        testState.editorContentAreaProps = props
        return () => null
      },
    },
  }),
)
vi.mock('../../../../packages/editor/src/components/notion/toc', () => ({
  TocSidebar: { render: () => null },
}))
vi.mock('../../../../packages/editor/src/components/notion/feedback', () => ({
  LoadingSpinner: { render: () => null },
}))
vi.mock(
  '../../../../packages/editor/src/components/table/table-overlays/TableOverlays.vue',
  () => ({
    default: { render: () => null },
  }),
)
const visualStubs = {
  TocSidebar: true,
  LoadingSpinner: true,
  TableHandle: true,
  TableOverlays: true,
  TableSelectionOverlay: true,
  TableExtendRowColumnButtons: true,
}

function createExtensionKitResult(options: ExtensionKitInput) {
  const collaborationExtensions = options.provider
    ? [
        { name: 'collaboration', options: { document: options.ydoc } },
        {
          name: 'collaborationCaret',
          options: { provider: options.provider, user: options.user },
        },
      ]
    : []

  return [
    {
      name: 'starterKit',
      options: { undoRedo: options.provider ? false : undefined },
    },
    ...collaborationExtensions,
    {
      name: 'placeholder',
      options: { placeholder: options.placeholder },
    },
    { name: 'imageUpload', options: { upload: options.imageUpload } },
    { name: 'blockRole', options: { roles: options.blockRoles ?? [] } },
  ]
}

function createEditorHarness(isEmpty = true): EditorHarness {
  const chainCalls: ChainCall[][] = []
  const updateCallbacks: Array<() => void> = []

  const editor: FakeEditor = {
    isEmpty,
    chain: () => {
      const calls: ChainCall[] = []
      const chain: FakeChain = {
        setMeta: (key, value) => {
          calls.push({ method: 'setMeta', args: [key, value] })
          return chain
        },
        setContent: (content) => {
          calls.push({ method: 'setContent', args: [content] })
          return chain
        },
        focus: (position, options) => {
          calls.push({ method: 'focus', args: [position, options] })
          return chain
        },
        run: () => true,
      }
      chainCalls.push(calls)
      return chain
    },
    on: (event, callback) => {
      if (event === 'update') updateCallbacks.push(callback)
    },
    off: (event, callback) => {
      if (event !== 'update') return
      const callbackIndex = updateCallbacks.indexOf(callback)
      if (callbackIndex >= 0) updateCallbacks.splice(callbackIndex, 1)
    },
    destroy: vi.fn(),
  }

  return {
    editor,
    chainCalls,
    emitUpdate: () => updateCallbacks.forEach((callback) => callback()),
  }
}

function createProviderHarness(isSynced: boolean): ProviderHarness {
  let syncedCallback: (() => void) | undefined

  return {
    provider: {
      isSynced,
      on: (event, callback) => {
        if (event === 'synced') syncedCallback = callback
      },
      off: (event, callback) => {
        if (event === 'synced' && syncedCallback === callback) syncedCallback = undefined
      },
    },
    triggerSynced: () => {
      if (!syncedCallback)
        throw new Error('Expected an unsynced provider to register a synced callback')
      syncedCallback()
    },
  }
}

function getEditorOptions(): CapturedEditorOptions {
  if (!testState.editorOptions)
    throw new Error('Expected useEditor to capture editor creation options')
  return testState.editorOptions
}

function getExtension(name: string) {
  const extension = getEditorOptions().extensions.find((candidate) => candidate.name === name)
  if (!extension)
    throw new Error(`Expected the editor configuration to include the ${name} extension`)
  return extension
}

async function mountEditorProvider(
  options: {
    editor?: EditorHarness
    provider?: FakeProvider | null
    placeholder?: string
    imageUpload?: ImageUploadAdapter
    blockRoles?: readonly BlockRoleOption[]
    onReady?: () => void
  } = {},
) {
  const editor = options.editor ?? createEditorHarness()
  const ydoc = new Y.Doc()
  const editorRef = shallowRef(editor.editor)
  testState.editorRef = editorRef

  const wrapper = mount(EditorProvider, {
    props: {
      provider: (options.provider ?? null) as never,
      documentId: testState.documentId,
      ydoc,
      placeholder: options.placeholder ?? 'Document-specific placeholder',
      imageUpload: options.imageUpload,
      blockRoles: options.blockRoles,
      onReady: options.onReady,
    },
    global: { stubs: visualStubs },
  })

  await vi.dynamicImportSettled()

  return { editor, editorRef, wrapper, ydoc }
}

function invokeCreation(editor: FakeEditor) {
  getEditorOptions().onCreate({ editor })
}

function extensionNames() {
  return getEditorOptions().extensions.map((extension) => extension.name)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  testState.createExtensionKit.mockImplementation(async (options: ExtensionKitInput) =>
    createExtensionKitResult(options),
  )
  localStorage.clear()
  testState.documentId = 'editor-provider-test-document'
  testState.editorOptions = null
  testState.editorRef = null
  testState.editorContentAreaProps = null
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('EditorProvider', () => {
  it('mounts the ready shell and publishes the editor ref through the provider harness', async () => {
    const { wrapper, ydoc } = await mountEditorProvider()

    expect(wrapper.find('.notion-like-editor-wrapper').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(false)
    expect(testState.provideTiptapEditor).toHaveBeenCalledOnce()
    expect(testState.editorOptions).not.toBeNull()

    ydoc.destroy()
  })

  it('passes visual and lifecycle configuration to the local extension kit', async () => {
    const { ydoc } = await mountEditorProvider({ placeholder: 'Write this document' })

    expect(getEditorOptions().editorProps).toEqual({
      attributes: { class: 'notion-like-editor' },
    })
    expect(extensionNames()).toEqual(['starterKit', 'placeholder', 'imageUpload', 'blockRole'])
    expect(extensionNames()).not.toContain('collaboration')
    expect(extensionNames()).not.toContain('collaborationCaret')
    expect(testState.createExtensionKit).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: null,
        ydoc,
        user: { id: 'test-user', name: 'Test User', color: '#2563eb' },
        imageUpload: expect.any(Function),
        onImageUploadError: expect.any(Function),
        onTableOfContentsUpdate: testState.setTocContent,
      }),
    )
    const extensionKitInput = testState.createExtensionKit.mock.calls[0]?.[0] as ExtensionKitInput
    expect(extensionKitInput.placeholder()).toBe('Write this document')
    expect(getExtension('starterKit').options.undoRedo).toBeUndefined()
    expect(getExtension('blockRole').options.roles).toEqual([])

    ydoc.destroy()
  })

  it('snapshots initial menu roles so later prop changes cannot diverge from the editor', async () => {
    const initialRoles = [{ label: 'Pricing', value: 'pricing' }] as const
    const { wrapper, ydoc } = await mountEditorProvider({ blockRoles: initialRoles })

    expect(getExtension('blockRole').options.roles).toEqual(['pricing'])
    expect(testState.editorContentAreaProps?.blockRoles).toEqual(initialRoles)

    await wrapper.setProps({ blockRoles: [{ label: 'Call to action', value: 'cta' }] })
    await nextTick()

    expect(testState.editorContentAreaProps?.blockRoles).toEqual(initialRoles)

    ydoc.destroy()
  })

  it('delegates image uploads to an adapter provided after mount', async () => {
    const replacementUpload = vi.fn(async () => 'https://example.test/replacement.png')
    const { wrapper, ydoc } = await mountEditorProvider()
    const upload = getExtension('imageUpload').options.upload as ImageUploadAdapter
    const file = new File(['image'], 'replacement.png', { type: 'image/png' })
    const callbacks = { onProgress: vi.fn(), abortSignal: new AbortController().signal }

    await expect(upload(file, callbacks)).rejects.toThrow('image upload adapter is not configured')

    await wrapper.setProps({ imageUpload: replacementUpload })

    await expect(upload(file, callbacks)).resolves.toBe('https://example.test/replacement.png')
    expect(replacementUpload).toHaveBeenCalledWith(file, callbacks)

    ydoc.destroy()
  })

  it('adds Yjs collaboration extensions and disables local history when a provider is supplied', async () => {
    const providerHarness = createProviderHarness(true)
    const { ydoc } = await mountEditorProvider({ provider: providerHarness.provider })

    expect(extensionNames()).toContain('collaboration')
    expect(extensionNames()).toContain('collaborationCaret')
    expect(getExtension('starterKit').options.undoRedo).toBe(false)
    expect(getExtension('collaboration').options.document).toMatchObject({
      clientID: ydoc.clientID,
      guid: ydoc.guid,
    })
    expect(getExtension('collaborationCaret').options).toMatchObject({
      provider: providerHarness.provider,
      user: { id: 'test-user', name: 'Test User', color: '#2563eb' },
    })

    ydoc.destroy()
  })

  it('leaves an empty local document untouched when the host supplies no content', async () => {
    const { editor, ydoc } = await mountEditorProvider()

    invokeCreation(editor.editor)

    expect(editor.chainCalls).toEqual([])

    ydoc.destroy()
  })

  it('waits for collaboration sync before ready without mutating an empty document', async () => {
    const providerHarness = createProviderHarness(false)
    const onReady = vi.fn()
    const { editor, ydoc } = await mountEditorProvider({
      provider: providerHarness.provider,
      onReady,
    })

    invokeCreation(editor.editor)
    expect(editor.chainCalls).toEqual([])
    expect(onReady).not.toHaveBeenCalled()

    providerHarness.triggerSynced()
    vi.runOnlyPendingTimers()

    expect(editor.chainCalls).toEqual([])
    expect(onReady).toHaveBeenCalledTimes(1)

    ydoc.destroy()
  })

  it('immediately marks an already-synced empty document ready without mutation', async () => {
    const providerHarness = createProviderHarness(true)
    const onReady = vi.fn()
    const { editor, ydoc } = await mountEditorProvider({
      provider: providerHarness.provider,
      onReady,
    })

    invokeCreation(editor.editor)

    expect(editor.chainCalls).toEqual([])
    expect(onReady).toHaveBeenCalledTimes(1)

    ydoc.destroy()
  })
})
