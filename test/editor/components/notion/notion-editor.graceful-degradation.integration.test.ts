import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  AiOptions,
  CollaborationOptions,
  EditorFeatureFlags,
} from '../../../../src/editor/components/notion/notion-editor/public-api'

const editorProviderModule =
  '../../../../src/editor/components/notion/notion-editor/EditorProvider.vue'
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

interface RenderEditorOptions {
  ai?: AiOptions
  collaboration?: CollaborationOptions
  features?: Partial<EditorFeatureFlags>
}

async function renderEditor({ ai, collaboration, features }: RenderEditorOptions = {}) {
  vi.doMock(editorProviderModule, () => ({ default: EditorProviderStub }))

  const { default: NotionEditor } =
    await import('../../../../src/editor/components/notion/notion-editor/NotionEditor.vue')
  const wrapper = mount(NotionEditor, {
    props: {
      documentId: 'graceful-degradation-document',
      baseUrl: 'https://editor.example.test/graceful-degradation-document',
      ai,
      collaboration,
      features,
    },
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

  it('does not request an AI token when configured AI is disabled', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = await renderEditor({
      ai: {
        appId: 'test-ai-app-id',
        tokenUrl: '/api/test-ai-token',
      },
    })
    await flushEditorUpdates()

    expect(
      fetchMock,
      'Configured AI must remain inert until the host explicitly enables features.ai.',
    ).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('.spinner-container').exists()).toBe(false)
  })

  it('clears pending AI setup when the feature is disabled after mount', async () => {
    type TokenResponse = Pick<Response, 'json' | 'ok'>

    let resolveTokenRequest: ((response: TokenResponse) => void) | undefined
    const tokenRequest = new Promise<TokenResponse>((resolve) => {
      resolveTokenRequest = resolve
    })
    const fetchMock = vi.fn().mockReturnValue(tokenRequest)
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = await renderEditor({
      ai: {
        appId: 'test-ai-app-id',
        tokenUrl: '/api/test-ai-token',
      },
      features: { ai: true },
    })
    await nextTick()

    expect(fetchMock).toHaveBeenCalledWith('/api/test-ai-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    await wrapper.setProps({ features: { ai: false } })
    await nextTick()

    expect(
      wrapper.find('[role="alert"]').exists(),
      'Disabling AI must clear setup errors while an earlier token request is pending.',
    ).toBe(false)
    expect(
      wrapper.find('.spinner-container').exists(),
      'Disabling AI must release the editor readiness gate while a token request is pending.',
    ).toBe(false)

    if (!resolveTokenRequest) throw new Error('AI token request was not started')
    resolveTokenRequest({
      ok: true,
      json: async () => ({ token: 'test-ai-token' }),
    })
    await flushEditorUpdates()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('.spinner-container').exists()).toBe(false)
  })

  it('shows SetupError when configured collaboration cannot obtain a token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = await renderEditor({
      collaboration: {
        appId: 'test-collab-app-id',
        tokenUrl: '/api/test-collaboration-token',
      },
    })
    await flushEditorUpdates()

    const setupError = wrapper.get('[role="alert"]')
    expect(
      setupError.text(),
      'A configured collaboration failure should render the real setup error heading.',
    ).toContain('Cloud Configuration Required')
    expect(
      setupError.text(),
      'A collaboration setup error should explain the required collaboration configuration.',
    ).toContain('collaboration.appId')
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
