/**
 * Реактивный media query: useIsBreakpoint('max', 768) → true на узких
 * экранах.
 */
import { onBeforeUnmount, ref } from 'vue'
import type { Ref } from 'vue'

export function useIsBreakpoint(
  mode: 'min' | 'max' = 'max',
  width = 768,
): Ref<boolean | undefined> {
  const matches = ref<boolean | undefined>(undefined)

  const query = mode === 'min' ? `(min-width: ${width}px)` : `(max-width: ${width - 1}px)`
  const mediaQuery = window.matchMedia(query)
  const update = (event: MediaQueryList | MediaQueryListEvent) => {
    matches.value = event.matches
  }
  update(mediaQuery)
  mediaQuery.addEventListener('change', update)
  onBeforeUnmount(() => mediaQuery.removeEventListener('change', update))

  return matches
}
