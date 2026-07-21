import { onBeforeUnmount } from 'vue'

export type RafLoopCallback = (timestamp: number) => boolean

export function useRafLoop(callback: RafLoopCallback) {
  let frameId: number | null = null
  let running = false

  function stop() {
    running = false
    if (frameId !== null) cancelAnimationFrame(frameId)
    frameId = null
  }

  function schedule() {
    frameId = requestAnimationFrame((timestamp) => {
      frameId = null
      if (!running) return

      const shouldContinue = callback(timestamp)
      if (running && shouldContinue) schedule()
      else running = false
    })
  }

  function start() {
    if (running) return
    running = true
    schedule()
  }

  onBeforeUnmount(stop)

  return { start, stop }
}
