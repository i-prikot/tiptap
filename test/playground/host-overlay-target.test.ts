import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountInDocument, settleTeleportUpdates } from '../editor/components/primitives/test-utils'

const NotionEditorStub = {
  template: '<div data-notion-editor-stub=""></div>',
}

function mockEditorPublicApi() {
  vi.doMock('@i-prikot/editor', async () => {
    const { defineComponent } = await import('vue')
    const overlayTargetApi =
      await import('../../packages/editor/src/composables/useEditorOverlayTarget')

    return {
      default: NotionEditorStub,
      Button: defineComponent({ template: '<button type="button"><slot /></button>' }),
      defaultEditorLocale: 'ru',
      ...overlayTargetApi,
    }
  })
}

async function createOverlayHeaderProbe() {
  const { computed, defineComponent, ref } = await import('vue')
  const { useEditorOverlayTarget } =
    await import('../../packages/editor/src/composables/useEditorOverlayTarget')

  return defineComponent({
    setup() {
      const overlayTarget = useEditorOverlayTarget()
      const tooltipOpen = ref(false)
      const teleportTarget = computed(() => overlayTarget?.value ?? null)

      return { teleportTarget, tooltipOpen }
    },
    template: `
      <button type="button" class="tiptap-tooltip-trigger" @focusin="tooltipOpen = true">Undo</button>
      <Teleport v-if="tooltipOpen && teleportTarget" :to="teleportTarget">
        <div role="tooltip">Undo the last change</div>
      </Teleport>
    `,
  })
}

const originalUrl = window.location.href
const originalDocumentElementClass = document.documentElement.className
const originalBodyClass = document.body.className

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('../../src/playground/components/CtaPopup.vue')
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', originalUrl)
  document.documentElement.className = originalDocumentElementClass
  document.body.className = originalBodyClass
})

describe('playground host theme boundary', () => {
  it('delegates theme selection to the playground root without mutating the host page', async () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener,
        removeEventListener,
      }),
    )
    document.documentElement.className = 'host-document-theme'
    document.body.className = 'host-page-theme'
    vi.resetModules()
    mockEditorPublicApi()
    vi.doMock('../../src/playground/components/CtaPopup.vue', () => ({
      default: { template: '<div data-cta-popup-stub=""></div>' },
    }))

    const HeaderProbe = {
      emits: ['toggleTheme'],
      template:
        '<button type="button" data-theme-toggle @click="$emit(\'toggleTheme\')">Toggle</button>',
    }

    vi.doMock('../../src/playground/components/NotionEditorHeader.vue', () => ({
      default: HeaderProbe,
    }))
    vi.doMock('../../src/editor/components/notion/notion-editor/NotionEditor.vue', () => ({
      default: NotionEditorStub,
    }))

    const { default: App } = await import('../../src/App.vue')
    const wrapper = mountInDocument(App)

    await settleTeleportUpdates()

    const editorRoot = wrapper.get('.tinyfy-editor')
    expect(editorRoot.attributes('data-tiptap-theme')).toBe('light')
    expect(document.documentElement.classList.contains('host-document-theme')).toBe(true)
    expect(document.body.classList.contains('host-page-theme')).toBe(true)

    await wrapper.get('[data-theme-toggle]').trigger('click')
    await settleTeleportUpdates()

    expect(editorRoot.attributes('data-tiptap-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('host-document-theme')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.body.classList.contains('host-page-theme')).toBe(true)
    expect(document.body.classList.contains('dark')).toBe(false)
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(removeEventListener).not.toHaveBeenCalled()
  }, 30_000)

  it('keeps header tooltips and the CTA inside the scoped editor root', async () => {
    window.history.replaceState({}, '', '/?cta')
    vi.resetModules()
    mockEditorPublicApi()

    const HeaderProbe = await createOverlayHeaderProbe()

    vi.doMock('../../src/playground/components/NotionEditorHeader.vue', () => ({
      default: HeaderProbe,
    }))
    vi.doMock('../../src/editor/components/notion/notion-editor/NotionEditor.vue', () => ({
      default: NotionEditorStub,
    }))

    const { default: App } = await import('../../src/App.vue')
    const wrapper = mountInDocument(App)

    await settleTeleportUpdates()

    const editorRoot = wrapper.get('.tinyfy-editor').element
    const overlayRoot = editorRoot.querySelector<HTMLElement>('[data-tiptap-overlay-root]')

    expect(overlayRoot).not.toBeNull()
    expect(overlayRoot?.contains(document.querySelector('.tiptap-cta'))).toBe(true)

    await wrapper.get('.tiptap-tooltip-trigger').trigger('focusin')
    await settleTeleportUpdates()

    const tooltip = document.querySelector('[role="tooltip"]')
    expect(tooltip).not.toBeNull()
    expect(overlayRoot?.contains(tooltip)).toBe(true)
  })
})
