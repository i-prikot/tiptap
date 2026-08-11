import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollaborationOptions } from '../../../packages/editor/src/components/notion/notion-editor/public-api'

interface ProviderOptions {
  name: string
  url: string
  token: string
  document: { guid: string }
}

interface CollabContext {
  hasCollab: { value: boolean }
  ydoc: { guid: string }
}

let provideCollab: (documentId: string, config?: CollaborationOptions) => CollabContext

const state = vi.hoisted(() => ({
  context: undefined as CollabContext | undefined,
  destroy: vi.fn(),
  v4Provider: vi.fn(),
  logger: { debug: vi.fn(), error: vi.fn() },
}))

const wrappers: VueWrapper[] = []

function mountCollab(config: CollaborationOptions) {
  const Host = defineComponent({
    setup() {
      state.context = provideCollab('document-id', config)
      return () => h('div')
    },
  })

  const wrapper = mount(Host)
  wrappers.push(wrapper)
  return wrapper
}

function getContext() {
  if (!state.context) throw new Error('Expected collaboration context')
  return state.context
}

function expectProviderOptions(options: ProviderOptions, token: string) {
  expect(options.name).toBe('room-document-id')
  expect(options.url).toBe('wss://collab-app.collab.tiptap.cloud')
  expect(options.token).toBe(token)
  expect(options.document).toBe(getContext().ydoc)
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  state.context = undefined
  state.v4Provider.mockImplementation(() => ({ destroy: state.destroy }))
  vi.doMock('@i-prikot/editor-schema', () => ({
    createLogger: () => state.logger,
  }))
  vi.doMock('@hocuspocus/provider', () => ({
    HocuspocusProvider: class {
      constructor(options: ProviderOptions) {
        return state.v4Provider(options)
      }
    },
  }))
  ;({ provideCollab } = await import('../../../packages/editor/src/composables/useCollab'))
})

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('provideCollab', () => {
  it('constructs the v4 provider with the derived Cloud URL for a static token', async () => {
    mountCollab({
      appId: 'collab-app',
      token: 'static-token',
      documentNamePrefix: 'room-',
    })
    await flushPromises()

    expect(state.v4Provider).toHaveBeenCalledOnce()
    expectProviderOptions(state.v4Provider.mock.calls[0]?.[0] as ProviderOptions, 'static-token')
    expect(getContext().hasCollab.value).toBe(true)
  })

  it('constructs the v4 provider after retrieving a token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'fetched-token' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    mountCollab({
      appId: 'collab-app',
      tokenUrl: '/api/collaboration-token',
      documentNamePrefix: 'room-',
    })
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/collaboration-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(state.v4Provider).toHaveBeenCalledOnce()
    expectProviderOptions(state.v4Provider.mock.calls[0]?.[0] as ProviderOptions, 'fetched-token')
  })

  it('keeps collaboration local for an invalid app id', async () => {
    mountCollab({ appId: 'collab-app@attacker.example', token: 'static-token' })
    await flushPromises()

    expect(state.v4Provider).not.toHaveBeenCalled()
    expect(getContext().hasCollab.value).toBe(false)
  })

  it('destroys the created provider on unmount', async () => {
    const wrapper = mountCollab({ appId: 'collab-app', token: 'static-token' })
    await flushPromises()

    wrapper.unmount()

    expect(state.destroy).toHaveBeenCalledOnce()
  })

  it('falls back to local editing when token retrieval fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    mountCollab({ appId: 'collab-app', tokenUrl: '/api/collaboration-token' })
    await flushPromises()

    expect(state.v4Provider).not.toHaveBeenCalled()
    expect(getContext().hasCollab.value).toBe(false)
    expect(state.logger.error).toHaveBeenCalledWith('token fetch failed', {
      service: 'collaboration',
      status: 503,
    })
  })

  it('falls back to local editing when token retrieval rejects unexpectedly', async () => {
    // fetchCollabToken reads this before its internal error handling, so the
    // synchronous throw becomes the rejected promise handled by provideCollab.
    const rejectedToken = {
      trim() {
        throw new Error('unexpected token retrieval failure')
      },
    } as unknown as string

    mountCollab({ appId: 'collab-app', token: rejectedToken })
    await flushPromises()

    expect(state.v4Provider).not.toHaveBeenCalled()
    expect(getContext().hasCollab.value).toBe(false)
    expect(state.logger.error).toHaveBeenCalledWith('provider setup failed', {
      service: 'collaboration',
      stage: 'token-retrieval',
      failureType: 'Error',
    })
    expect(JSON.stringify(state.logger.error.mock.calls)).not.toContain('collab-app')
  })

  it('does not create a provider when token retrieval resolves after unmount', async () => {
    let resolveToken: ((response: { ok: boolean; json: () => Promise<{ token: string }> }) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveToken = resolve
        }),
      ),
    )

    const wrapper = mountCollab({ appId: 'collab-app', tokenUrl: '/api/collaboration-token' })
    wrapper.unmount()
    if (!resolveToken) throw new Error('Expected a pending collaboration token request')
    resolveToken({ ok: true, json: async () => ({ token: 'late-token' }) })
    await flushPromises()

    expect(state.v4Provider).not.toHaveBeenCalled()
    expect(getContext().hasCollab.value).toBe(false)
  })

  it('falls back to local editing when v4 provider construction fails with redacted diagnostics', async () => {
    state.v4Provider.mockImplementation(() => {
      throw new Error('connection setup failed')
    })

    mountCollab({ appId: 'collab-app', token: 'static-token' })
    await flushPromises()

    expect(getContext().hasCollab.value).toBe(false)
    expect(state.logger.error).toHaveBeenCalledWith('provider setup failed', {
      service: 'collaboration',
      stage: 'provider-construction',
      failureType: 'Error',
    })
    expect(JSON.stringify(state.logger.error.mock.calls)).not.toContain('static-token')
    expect(JSON.stringify(state.logger.error.mock.calls)).not.toContain('collab-app')
  })
})
