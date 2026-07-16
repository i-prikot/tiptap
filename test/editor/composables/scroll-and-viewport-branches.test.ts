import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tiptap/vue-3'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { provideAnchorNavigation } from '../../../src/editor/composables/useAnchorNavigation'
import { useScrollToHash } from '../../../src/editor/composables/useScrollToHash'
import { useWindowSize } from '../../../src/editor/composables/useWindowSize'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

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

function mountWindowSize() {
  let size: ReturnType<typeof useWindowSize> | undefined
  const Host = defineComponent({
    setup() {
      size = useWindowSize()
      return () => h('div')
    },
  })
  wrappers.push(mount(Host))
  if (!size) throw new Error('Expected window size state')
  return size
}

function createScrollEditor() {
  const host = document.createElement('div')
  document.body.append(host)
  const UniqueId = Extension.create({
    name: 'uniqueID',
    addGlobalAttributes() {
      return [
        {
          types: ['paragraph'],
          attributes: { 'data-id': { default: null } },
        },
      ]
    },
  })
  const editor = new Editor({
    element: host,
    extensions: [StarterKit, UniqueId],
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { 'data-id': 'target' },
          content: [{ type: 'text', text: 'Target' }],
        },
      ],
    },
  })
  editors.push(editor)
  return editor
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('scroll and viewport branch behavior', () => {
  it('updates visual viewport state, skips equal values, and removes listeners', async () => {
    vi.useFakeTimers()
    const viewport: VisualViewportMock = {
      width: 320,
      height: 640,
      offsetTop: 12,
      offsetLeft: 8,
      scale: 2,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    installViewport(viewport)
    const size = mountWindowSize()
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(size).toMatchObject({ width: 320, height: 640, offsetTop: 12, offsetLeft: 8, scale: 2 })
    const update = viewport.addEventListener.mock.calls[0]?.[1] as (() => void) | undefined
    if (!update) throw new Error('Expected resize handler')
    update()
    vi.advanceTimersByTime(200)
    viewport.width = 375
    update()
    vi.advanceTimersByTime(200)
    expect(size.width).toBe(375)
    expect(viewport.removeEventListener).not.toHaveBeenCalled()
  })

  it('reacts to host anchors while ignoring TOC-originated anchor echoes', async () => {
    vi.useFakeTimers()
    const editor = createScrollEditor()
    const scrollIntoView = vi.fn()
    const target = document.createElement('p')
    Object.assign(target, { scrollIntoView })
    Object.assign(editor.view, { nodeDOM: () => target })
    const found = vi.fn()
    const missing = vi.fn()
    const currentAnchor = ref<string>()
    let api: ReturnType<typeof useScrollToHash> | undefined
    let requestAnchorChange: ((anchor: string) => void) | undefined
    const ScrollTarget = defineComponent({
      setup() {
        api = useScrollToHash(
          computed(() => editor),
          { onTargetFound: found, onTargetNotFound: missing },
        )
        return () => h('div')
      },
    })
    const Host = defineComponent({
      setup() {
        const anchorNavigation = provideAnchorNavigation(
          computed(() => 'https://example.test/document'),
          computed(() => currentAnchor.value),
          (anchor) => {
            currentAnchor.value = anchor
          },
        )
        requestAnchorChange = anchorNavigation.requestAnchorChange
        return () => h(ScrollTarget)
      },
    })
    wrappers.push(mount(Host))
    if (!api) throw new Error('Expected scroll API')

    expect(api.scrollToHash('target')).toBe(true)
    vi.runAllTimers()
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(api.scrollToHash('missing')).toBe(false)

    requestAnchorChange?.('target')
    await nextTick()
    vi.runAllTimers()
    expect(found).not.toHaveBeenCalled()
    expect(scrollIntoView).toHaveBeenCalledOnce()

    currentAnchor.value = 'missing'
    await nextTick()
    vi.runAllTimers()
    expect(missing).toHaveBeenCalledWith('missing')

    currentAnchor.value = 'target'
    await nextTick()
    vi.runAllTimers()
    expect(found).toHaveBeenCalledWith('target')
  })

  it('scrolls to a later matching host anchor after a declined TOC request', async () => {
    vi.useFakeTimers()
    const editor = createScrollEditor()
    const scrollIntoView = vi.fn()
    const target = document.createElement('p')
    Object.assign(target, { scrollIntoView })
    Object.assign(editor.view, { nodeDOM: () => target })
    const found = vi.fn()
    const currentAnchor = ref<string>()
    let requestAnchorChange: ((anchor: string) => void) | undefined
    const ScrollTarget = defineComponent({
      setup() {
        useScrollToHash(
          computed(() => editor),
          { onTargetFound: found },
        )
        return () => h('div')
      },
    })
    const Host = defineComponent({
      setup() {
        const anchorNavigation = provideAnchorNavigation(
          computed(() => 'https://example.test/document'),
          computed(() => currentAnchor.value),
          () => {},
        )
        requestAnchorChange = anchorNavigation.requestAnchorChange
        return () => h(ScrollTarget)
      },
    })
    wrappers.push(mount(Host))

    requestAnchorChange?.('target')
    await nextTick()

    currentAnchor.value = 'target'
    await nextTick()
    vi.runAllTimers()

    expect(found).toHaveBeenCalledWith('target')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })
})
