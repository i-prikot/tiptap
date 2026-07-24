/**
 * Rect body + автоскролл к курсору, если его перекрывает оверлей
 * (мобильный тулбар).
 */
import { onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { throttle } from '../utils/throttle'
import { useWindowSize } from './useWindowSize'

export interface ElementRectState {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

const EMPTY_RECT: ElementRectState = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}

export function useCursorVisibility(options: {
  editor: ComputedRef<Editor | null>
  overlayHeight: ComputedRef<number>
}) {
  const { editor, overlayHeight } = options
  const windowSize = useWindowSize()
  const rect = reactive<ElementRectState>({ ...EMPTY_RECT })

  const updateRect = throttle(
    () => {
      const bounding = document.body.getBoundingClientRect()
      Object.assign(rect, {
        x: bounding.x,
        y: bounding.y,
        width: bounding.width,
        height: bounding.height,
        top: bounding.top,
        right: bounding.right,
        bottom: bounding.bottom,
        left: bounding.left,
      })
    },
    100,
    { leading: true, trailing: true },
  )

  let cleanups: Array<() => void> = []
  let observerFrameId: number | null = null

  onMounted(() => {
    updateRect()
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        if (observerFrameId !== null) return
        observerFrameId = window.requestAnimationFrame(() => {
          observerFrameId = null
          updateRect()
        })
      })
      observer.observe(document.body)
      cleanups.push(() => {
        if (observerFrameId !== null) window.cancelAnimationFrame(observerFrameId)
        observerFrameId = null
        observer.disconnect()
      })
    }
    const handler = () => updateRect()
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler, true)
    cleanups.push(() => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler, true)
    })
  })
  onBeforeUnmount(() => {
    cleanups.forEach((fn) => fn())
    cleanups = []
    updateRect.cancel()
  })

  // Если курсор оказался под оверлеем — плавно скроллим к нему.
  watch([editor, overlayHeight, () => windowSize.height, () => rect.height], () => {
    const instance = editor.value
    if (!instance) return
    const { state, view } = instance
    if (!view.hasFocus()) return
    const { from } = state.selection
    const cursorCoords = view.coordsAtPos(from)
    const windowHeight = windowSize.height
    if (
      windowHeight < rect.height &&
      cursorCoords &&
      windowHeight - cursorCoords.top < overlayHeight.value
    ) {
      const target = Math.max(windowHeight / 2, overlayHeight.value)
      const cursorAbsoluteTop = cursorCoords.top + window.scrollY
      window.scrollTo({ top: Math.max(0, cursorAbsoluteTop - target), behavior: 'smooth' })
    }
  })

  return rect
}
