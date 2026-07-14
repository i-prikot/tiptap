import { mount } from '@vue/test-utils'
import type { Editor } from '@tiptap/vue-3'
import { computed, defineComponent, h, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCursorVisibility } from '../../../src/editor/composables/useCursorVisibility'

interface VisualViewportMock {
  width: number
  height: number
  offsetTop: number
  offsetLeft: number
  scale: number
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
}

function installViewport(viewport: VisualViewportMock) {
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
}

function mountCursorVisibility(editor: Ref<Editor | null>, overlayHeight: Ref<number>) {
  const Host = defineComponent({
    setup() {
      useCursorVisibility({
        editor: computed(() => editor.value),
        overlayHeight: computed(() => overlayHeight.value),
      })
      return () => h('div')
    },
  })

  return mount(Host)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('cursor visibility behavior', () => {
  it('does not scroll when no editor is available and ResizeObserver is unavailable', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('ResizeObserver', undefined)
    const scrollTo = vi.fn()
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo })
    installViewport({
      width: 320,
      height: 640,
      offsetTop: 0,
      offsetLeft: 0,
      scale: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const wrapper = mountCursorVisibility(shallowRef<Editor | null>(null), shallowRef(96))
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    expect(scrollTo).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('smoothly scrolls the focused cursor above the mobile overlay and disconnects its observer', async () => {
    vi.useFakeTimers()
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe = observe
        disconnect = disconnect
      },
    )
    const scrollTo = vi.fn()
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 })
    vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 320,
      height: 800,
      top: 0,
      right: 320,
      bottom: 800,
      left: 0,
      toJSON: () => ({}),
    })
    installViewport({
      width: 320,
      height: 640,
      offsetTop: 0,
      offsetLeft: 0,
      scale: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const editor = shallowRef<Editor | null>({
      state: { selection: { from: 5 } },
      view: {
        hasFocus: vi.fn(() => true),
        coordsAtPos: vi.fn(() => ({ top: 600 })),
      },
    } as unknown as Editor)

    const wrapper = mountCursorVisibility(editor, shallowRef(96))
    vi.advanceTimersByTime(200)
    await wrapper.vm.$nextTick()

    expect(observe).toHaveBeenCalledWith(document.body)
    expect(scrollTo).toHaveBeenCalledWith({ top: 400, behavior: 'smooth' })
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
