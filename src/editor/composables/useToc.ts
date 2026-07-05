/**
 * TOC-контекст: хранит текущее содержимое оглавления и функции навигации.
 * Vue-эквивалент TocProvider/useToc из чанка 094r3nrv45pwr (модуль 891721):
 * React Context заменён на provide/inject.
 */
import { inject, provide, shallowRef } from 'vue'
import type { InjectionKey, ShallowRef } from 'vue'
import { navigateToHeading, normalizeHeadingDepths } from '../utils/toc-utils'
import type { NavigateToHeadingOptions, TocItem } from '../utils/toc-utils'

export interface TocContext {
  tocContent: ShallowRef<TocItem[] | null>
  setTocContent: (content: TocItem[] | null) => void
  navigateToHeading: (item: TocItem, options?: NavigateToHeadingOptions) => void
  normalizeHeadingDepths: (items: TocItem[]) => number[]
}

const tocInjectionKey: InjectionKey<TocContext> = Symbol('toc')

/** Создаёт контекст TOC и предоставляет его потомкам. */
export function provideToc(): TocContext {
  const tocContent = shallowRef<TocItem[] | null>(null)

  const context: TocContext = {
    tocContent,
    setTocContent: content => {
      tocContent.value = content
    },
    navigateToHeading: (item, options) => {
      navigateToHeading(item, { topOffset: options?.topOffset ?? 0, behavior: options?.behavior ?? 'smooth' })
    },
    normalizeHeadingDepths,
  }

  provide(tocInjectionKey, context)
  return context
}

export function useToc(): TocContext {
  const context = inject(tocInjectionKey)
  if (!context) throw new Error('useToc must be used inside provideToc()')
  return context
}
