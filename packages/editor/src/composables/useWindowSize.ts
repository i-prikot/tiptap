/**
 * Размеры visualViewport с троттлингом 200ms.
 */
import { onBeforeUnmount, onMounted, reactive } from 'vue'
import { throttle } from '../utils/throttle'

export interface WindowSizeState {
  width: number
  height: number
  offsetTop: number
  offsetLeft: number
  scale: number
}

export function useWindowSize() {
  const size = reactive<WindowSizeState>({
    width: 0,
    height: 0,
    offsetTop: 0,
    offsetLeft: 0,
    scale: 0,
  })

  const update = throttle(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const { width = 0, height = 0, offsetTop = 0, offsetLeft = 0, scale = 0 } = viewport
    if (
      width === size.width &&
      height === size.height &&
      offsetTop === size.offsetTop &&
      offsetLeft === size.offsetLeft &&
      scale === size.scale
    ) {
      return
    }
    Object.assign(size, { width, height, offsetTop, offsetLeft, scale })
  }, 200)

  let viewport: VisualViewport | null = null

  onMounted(() => {
    viewport = window.visualViewport
    if (!viewport) return
    viewport.addEventListener('resize', update)
    update()
  })
  onBeforeUnmount(() => {
    viewport?.removeEventListener('resize', update)
    viewport = null
    update.cancel()
  })

  return size
}
