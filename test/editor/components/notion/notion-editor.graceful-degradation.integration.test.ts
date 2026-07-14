import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

const collaborationEnvironmentKeys = [
  'VITE_TIPTAP_COLLAB_APP_ID',
  'VITE_TIPTAP_COLLAB_TOKEN_URL',
  'VITE_TIPTAP_COLLAB_TOKEN',
  'VITE_TIPTAP_COLLAB_DOC_PREFIX',
  'VITE_TIPTAP_AI_APP_ID',
  'VITE_TIPTAP_AI_TOKEN_URL',
  'VITE_TIPTAP_AI_TOKEN',
] as const

type CollaborationEnvironmentKey = (typeof collaborationEnvironmentKeys)[number]
type CollaborationEnvironment = Partial<Record<CollaborationEnvironmentKey, string>>

const editorProviderModule = '../../../../src/editor/components/notion/EditorProvider.vue'
const wrappers: VueWrapper[] = []

const EditorProviderStub = defineComponent({
  name: 'EditorProviderStub',
  props: {
    provider: {
      type: Object,
      default: null,
    },
  },
  template:
    '<div data-testid="editor-provider" :data-provider-state="provider === null ? \'null\' : \'configured\'"></div>',
})

function configureEnvironment(overrides: CollaborationEnvironment = {}) {
  for (const key of collaborationEnvironmentKeys) {
    vi.stubEnv(key, overrides[key] ?? '')
  }
}

async function renderEditor(environment: CollaborationEnvironment = {}) {
  configureEnvironment(environment)
  vi.resetModules()
  vi.doMock(editorProviderModule, () => ({ default: EditorProviderStub }))

  const { default: NotionEditor } =
    await import('../../../../src/editor/components/notion/NotionEditor.vue')
  const wrapper = mount(NotionEditor, {
    props: { room: 'graceful-degradation-room' },
  })

  wrappers.push(wrapper)
  await nextTick()
  return wrapper
}

async function flushEditorUpdates() {
  await flushPromises()
  await nextTick()
}

afterEach(() => {
  while (wrappers.length) {
    wrappers.pop()?.unmount()
  }

  vi.doUnmock(editorProviderModule)
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('NotionEditor graceful degradation', () => {
  it('renders the local editor without cloud configuration or a token request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = await renderEditor()

    expect(
      wrapper.get('[data-testid="editor-provider"]').attributes('data-provider-state'),
      'An editor without cloud configuration should receive a null collaboration provider.',
    ).toBe('null')
    expect(
      wrapper.find('[role="alert"]').exists(),
      'An editor without cloud configuration should not show a setup error.',
    ).toBe(false)
    expect(
      wrapper.find('.spinner-container').exists(),
      'An editor without cloud configuration should not remain on the loading gate.',
    ).toBe(false)
    expect(
      fetchMock,
      'An editor without cloud configuration should not request a collaboration token.',
    ).not.toHaveBeenCalled()
  })

  it('shows SetupError when configured collaboration cannot obtain a token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = await renderEditor({
      VITE_TIPTAP_COLLAB_APP_ID: 'test-collab-app-id',
      VITE_TIPTAP_COLLAB_TOKEN_URL: '/api/test-collaboration-token',
    })
    await flushEditorUpdates()

    const setupError = wrapper.get('[role="alert"]')
    expect(
      setupError.text(),
      'A configured collaboration failure should render the real setup error heading.',
    ).toContain('Environment Variables Required')
    expect(
      setupError.text(),
      'A collaboration setup error should explain the required collaboration environment variables.',
    ).toContain('VITE_TIPTAP_COLLAB_APP_ID')
    expect(
      wrapper.find('[data-testid="editor-provider"]').exists(),
      'A configured collaboration failure should replace the editor provider with SetupError.',
    ).toBe(false)
    expect(
      fetchMock,
      'Configured collaboration without a static token should request the configured token endpoint.',
    ).toHaveBeenCalledWith('/api/test-collaboration-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(
      consoleError,
      'The failed token request should be contained by the collaboration token error handler.',
    ).toHaveBeenCalledWith('Failed to fetch collaboration token:', expect.any(Error))
  })
})
