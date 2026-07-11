/**
 * Утилиты Table of Contents: нормализация глубин заголовков,
 * поиск скроллируемого предка и переход к заголовку.
 * Порт из чанка 094r3nrv45pwr (модули 891721, 563618).
 */
import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import type { TocItem } from '../types/toc'

/** Мета-флаг транзакции: выделение установлено программно (скрыть floating toolbar). */
export const HIDE_FLOATING_META = 'hideFloatingToolbar'

export type { TocItem } from '../types/toc'

/**
 * Приводит уровни заголовков к последовательным глубинам без «дыр»:
 * [2, 4, 2] -> [1, 2, 1].
 */
export function normalizeHeadingDepths(items: TocItem[]): number[] {
  if (items.length === 0) return []

  const levels = items.map((item) => item.originalLevel ?? item.level ?? 1)
  const positive = levels.filter((level) => level > 0)
  const baseLevel = positive.includes(1) ? 1 : Math.min(...positive)
  const shifted = levels.map((level) => Math.max(1, level - (baseLevel - 1)))

  const depths: number[] = []
  const stack: Array<{ level: number; depth: number }> = []
  for (let i = 0; i < shifted.length; i++) {
    const level = shifted[i] ?? 1
    while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop()
    const depth = stack.length === 0 ? 1 : stack[stack.length - 1].depth + 1
    depths.push(depth)
    stack.push({ level, depth })
  }
  return depths
}

/** Ближайший скроллируемый предок либо window. */
export function getScrollableAncestor(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const { overflowY } = getComputedStyle(parent)
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return window
}

/** Выделяет узел и помечает транзакцию, чтобы floating toolbar не показывался. */
export function selectNodeAndHideFloating(editor: Editor | null, pos: number) {
  if (!editor) return
  const { state, view } = editor
  view.dispatch(
    state.tr.setSelection(NodeSelection.create(state.doc, pos)).setMeta(HIDE_FLOATING_META, true),
  )
}

export interface NavigateToHeadingOptions {
  topOffset?: number
  behavior?: ScrollBehavior
}

/** Скроллит к заголовку, выделяет его и обновляет hash в URL. */
export function navigateToHeading(item: TocItem, options: NavigateToHeadingOptions = {}) {
  const { topOffset = 0, behavior = 'smooth' } = options
  if (!item.dom) return

  const rect = item.dom.getBoundingClientRect()
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const alreadyVisible =
    rect.top >= topOffset && rect.bottom > topOffset && rect.top < viewportHeight

  if (!alreadyVisible) {
    const scrollParent = getScrollableAncestor(item.dom)
    if (scrollParent === window) {
      const top = item.dom.getBoundingClientRect().top + window.scrollY - topOffset
      window.scrollTo({ top, behavior })
    } else {
      const scrollElement = scrollParent as HTMLElement
      const itemRect = item.dom.getBoundingClientRect()
      const parentRect = scrollElement.getBoundingClientRect()
      const top = itemRect.top - parentRect.top + scrollElement.scrollTop - topOffset
      scrollElement.scrollTo({ top, behavior })
    }
  }

  if (item.editor && typeof item.pos === 'number') {
    selectNodeAndHideFloating(item.editor, item.pos)
  }

  if (item.id) {
    const url = new URL(window.location.href)
    url.hash = item.id
    window.history.replaceState(null, '', url.toString())
  }
}
