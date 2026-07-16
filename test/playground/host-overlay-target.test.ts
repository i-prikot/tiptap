import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountInDocument, settleTeleportUpdates } from '../editor/components/primitives/test-utils'

const NotionEditorStub = {
  template: '<div data-notion-editor-stub=""></div>',
}

const originalUrl = window.location.href
const originalDocumentElementClass = document.documentElement.className
const originalBodyClass = document.body.className

afterEach(() => {
  vi.resetModules()
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

    const HeaderProbe = {
      emits: ['toggleTheme'],
      template:
        '<button type="button" data-theme-toggle @click="$emit(\'toggleTheme\')">Toggle</button>',
    }

    vi.doMock('../../src/playground/components/NotionEditorHeader.vue', () => ({
      default: HeaderProbe,
    }))
    vi.doMock('../../src/editor/components/notion/NotionEditor.vue', () => ({
      default: NotionEditorStub,
    }))

    const { default: App } = await import('../../src/App.vue')
    const wrapper = mountInDocument(App)

    await settleTeleportUpdates()

    const editorRoot = wrapper.get('.tinyfy-editor')
    expect(editorRoot.classes()).not.toContain('dark')
    expect(document.documentElement.classList.contains('host-document-theme')).toBe(true)
    expect(document.body.classList.contains('host-page-theme')).toBe(true)

    await wrapper.get('[data-theme-toggle]').trigger('click')
    await settleTeleportUpdates()

    expect(editorRoot.classes()).toContain('dark')
    expect(document.documentElement.classList.contains('host-document-theme')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.body.classList.contains('host-page-theme')).toBe(true)
    expect(document.body.classList.contains('dark')).toBe(false)
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('keeps header tooltips and the CTA inside the scoped editor root', async () => {
    window.history.replaceState({}, '', '/?cta')
    vi.resetModules()

    const { default: Tooltip } = await import('../../src/editor/components/primitives/Tooltip.vue')
    const HeaderProbe = {
      components: { Tooltip },
      template: `
        <Tooltip :delay="0">
          <button type="button">Undo</button>
          <template #content>Undo the last change</template>
        </Tooltip>
      `,
    }

    vi.doMock('../../src/playground/components/NotionEditorHeader.vue', () => ({
      default: HeaderProbe,
    }))
    vi.doMock('../../src/editor/components/notion/NotionEditor.vue', () => ({
      default: NotionEditorStub,
    }))

    const { default: App } = await import('../../src/App.vue')
    const wrapper = mountInDocument(App)

    await settleTeleportUpdates()

    const editorRoot = wrapper.get('.tinyfy-editor').element
    const overlayRoot = editorRoot.querySelector<HTMLElement>('[data-tiptap-overlay-root]')

    expect(overlayRoot).not.toBeNull()
    expect(overlayRoot).toContain(document.querySelector('.tiptap-cta'))

    await wrapper.get('.tiptap-tooltip-trigger').trigger('focusin')
    await settleTeleportUpdates()

    const tooltip = document.querySelector('[role="tooltip"]')
    expect(tooltip).not.toBeNull()
    expect(overlayRoot?.contains(tooltip)).toBe(true)
  })
})
