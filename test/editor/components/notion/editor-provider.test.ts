import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import EditorProvider from '../../../../src/editor/components/notion/EditorProvider.vue'
import type { ImageUploadAdapter } from '../../../../src/editor/types'

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

const testState = vi.hoisted(() => ({
  documentId: 'editor-provider-test-document',
  editorOptions: null as CapturedEditorOptions | null,
  editorRef: null as unknown,
  setTocContent: vi.fn(),
  provideTiptapEditor: vi.fn(),
  useEditor: vi.fn(),
}))

vi.mock('@tiptap/vue-3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tiptap/vue-3')>()
  return { ...actual, useEditor: testState.useEditor }
})

vi.mock('../../../../src/editor/composables/useUser', () => ({
  useUser: () => ({
    user: { id: 'test-user', name: 'Test User', color: '#2563eb' },
  }),
}))

vi.mock('../../../../src/editor/composables/useToc', () => ({
  useToc: () => ({ setTocContent: testState.setTocContent }),
}))

vi.mock('../../../../src/editor/composables/useTiptapEditor', () => ({
  provideTiptapEditor: testState.provideTiptapEditor,
}))

vi.mock('../../../../src/editor/components/notion/NotionEditorHeader.vue', () => ({
  default: { render: () => null },
}))
vi.mock('../../../../src/editor/components/notion/EditorContentArea.vue', () => ({
  default: { render: () => null },
}))
vi.mock('../../../../src/editor/components/notion/TocSidebar.vue', () => ({
  default: { render: () => null },
}))
vi.mock('../../../../src/editor/components/notion/LoadingSpinner.vue', () => ({
  default: { render: () => null },
}))
vi.mock('../../../../src/editor/components/notion/CtaPopup.vue', () => ({
  default: { render: () => null },
}))
vi.mock('../../../../src/editor/components/table/TableHandle.vue', () => ({
  default: { render: () => null },
}))
vi.mock('../../../../src/editor/components/table/TableSelectionOverlay.vue', () => ({
  default: { render: () => null },
}))
vi.mock('../../../../src/editor/components/table/TableExtendRowColumnButtons.vue', () => ({
  default: { render: () => null },
}))
const visualStubs = {
  NotionEditorHeader: true,
  EditorContentArea: true,
  TocSidebar: true,
  LoadingSpinner: true,
  CtaPopup: true,
  TableHandle: true,
  TableSelectionOverlay: true,
  TableExtendRowColumnButtons: true,
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

function mountEditorProvider(
  options: {
    editor?: EditorHarness
    provider?: FakeProvider | null
    placeholder?: string
    imageUpload?: ImageUploadAdapter
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
      onReady: options.onReady,
    },
    global: { stubs: visualStubs },
  })

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
  localStorage.clear()
  testState.documentId = 'editor-provider-test-document'
  testState.editorOptions = null
  testState.editorRef = null
  testState.useEditor.mockImplementation((options: CapturedEditorOptions) => {
    testState.editorOptions = options
    return testState.editorRef
  })
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('EditorProvider', () => {
  it('mounts the ready shell and publishes the editor ref through the provider harness', () => {
    const { editorRef, wrapper, ydoc } = mountEditorProvider()

    expect(wrapper.find('.notion-like-editor-wrapper').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(false)
    expect(testState.provideTiptapEditor).toHaveBeenCalledWith(editorRef)
    expect(testState.useEditor).toHaveBeenCalledOnce()

    ydoc.destroy()
  })

  it('uses the complete local extension assembly with the supplied visual configuration', () => {
    const { ydoc } = mountEditorProvider({ placeholder: 'Write this document' })

    expect(getEditorOptions().editorProps).toEqual({
      attributes: { class: 'notion-like-editor' },
    })
    expect(extensionNames()).toEqual([
      'starterKit',
      'horizontalRule',
      'textAlign',
      'placeholder',
      'mention',
      'emoji',
      'tableKit',
      'nodeBackground',
      'nodeAlignment',
      'textStyle',
      'Mathematics',
      'superscript',
      'subscript',
      'indent',
      'color',
      'taskList',
      'taskItem',
      'highlight',
      'selection',
      'image',
      'tableOfContents',
      'tableHandleExtension',
      'listNormalization',
      'tripleClickBlockSelection',
      'imageUpload',
      'uniqueID',
      'typography',
      'uiState',
      'tocNode',
    ])
    expect(extensionNames()).not.toContain('collaboration')
    expect(extensionNames()).not.toContain('collaborationCaret')
    expect(getExtension('starterKit').options).toMatchObject({
      horizontalRule: false,
      dropcursor: { width: 2 },
      link: { openOnClick: false },
    })
    expect(getExtension('starterKit').options.undoRedo).toBeUndefined()
    const placeholder = getExtension('placeholder').options.placeholder as () => string
    expect(placeholder()).toBe('Write this document')
    expect(getExtension('placeholder').options).toMatchObject({
      emptyNodeClass: 'is-empty with-slash',
    })
    expect(getExtension('tableKit').options).toMatchObject({
      table: { resizable: true, cellMinWidth: 120 },
    })
    expect(getExtension('nodeBackground').options.types).toEqual([
      'paragraph',
      'heading',
      'blockquote',
      'taskList',
      'bulletList',
      'orderedList',
      'tableCell',
      'tableHeader',
      'tocNode',
    ])
    expect(getExtension('imageUpload').options).toMatchObject({
      accept: 'image/*',
      maxSize: 5 * 1024 * 1024,
      limit: 3,
    })
    expect(getExtension('tableOfContents').options).toMatchObject({
      getIndex: expect.any(Function),
      onUpdate: expect.any(Function),
    })
    expect(getExtension('uniqueID').options.types).toEqual([
      'table',
      'paragraph',
      'bulletList',
      'orderedList',
      'taskList',
      'heading',
      'blockquote',
      'codeBlock',
      'tocNode',
    ])
    expect(getExtension('tocNode').options.topOffset).toBe(48)

    ydoc.destroy()
  })

  it('delegates image uploads to an adapter provided after mount', async () => {
    const replacementUpload = vi.fn(async () => 'https://example.test/replacement.png')
    const { wrapper, ydoc } = mountEditorProvider()
    const upload = getExtension('imageUpload').options.upload as ImageUploadAdapter
    const file = new File(['image'], 'replacement.png', { type: 'image/png' })
    const callbacks = { onProgress: vi.fn(), abortSignal: new AbortController().signal }

    await expect(upload(file, callbacks)).rejects.toThrow('image upload adapter is not configured')

    await wrapper.setProps({ imageUpload: replacementUpload })

    await expect(upload(file, callbacks)).resolves.toBe('https://example.test/replacement.png')
    expect(replacementUpload).toHaveBeenCalledWith(file, callbacks)

    ydoc.destroy()
  })

  it('adds Yjs collaboration extensions and disables local history when a provider is supplied', () => {
    const providerHarness = createProviderHarness(true)
    const { ydoc } = mountEditorProvider({ provider: providerHarness.provider })

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

  it('leaves an empty local document untouched when the host supplies no content', () => {
    const { editor, ydoc } = mountEditorProvider()

    invokeCreation(editor.editor)

    expect(editor.chainCalls).toEqual([])

    ydoc.destroy()
  })

  it('waits for collaboration sync before ready without mutating an empty document', () => {
    const providerHarness = createProviderHarness(false)
    const onReady = vi.fn()
    const { editor, ydoc } = mountEditorProvider({
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

  it('immediately marks an already-synced empty document ready without mutation', () => {
    const providerHarness = createProviderHarness(true)
    const onReady = vi.fn()
    const { editor, ydoc } = mountEditorProvider({
      provider: providerHarness.provider,
      onReady,
    })

    invokeCreation(editor.editor)

    expect(editor.chainCalls).toEqual([])
    expect(onReady).toHaveBeenCalledTimes(1)

    ydoc.destroy()
  })
})
