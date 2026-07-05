/**
 * Троттлинг с leading/trailing и cancel — замена lodash.throttle из
 * чанка 3jdxmcvhjtoe- (useThrottledCallback, модуль 192439).
 */
export interface ThrottledFunction<Args extends unknown[]> {
  (...args: Args): void
  cancel(): void
}

export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): ThrottledFunction<Args> {
  const { leading = true, trailing = true } = options
  let lastCallTime = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let trailingArgs: Args | null = null

  const invoke = (args: Args) => {
    lastCallTime = Date.now()
    fn(...args)
  }

  const throttled = (...args: Args) => {
    const now = Date.now()
    if (!lastCallTime && !leading) lastCallTime = now
    const remaining = wait - (now - lastCallTime)
    if (remaining <= 0 || remaining > wait) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      invoke(args)
    } else if (trailing) {
      trailingArgs = args
      if (!timer) {
        timer = setTimeout(() => {
          timer = null
          if (trailingArgs) {
            const args = trailingArgs
            trailingArgs = null
            invoke(args)
          }
        }, remaining)
      }
    }
  }

  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    trailingArgs = null
    lastCallTime = 0
  }

  return throttled
}
