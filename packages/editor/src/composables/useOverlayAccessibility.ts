import { nextTick, shallowRef } from 'vue'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'

const diagnostics = createDevelopmentDiagnostics('overlay-accessibility')

let overlayContentId = 0

export type OverlayFocusTarget = 'first' | 'last'

export interface OverlayAccessibilityOptions {
  component: string
  contentId?: string
}

export interface RovingFocusOptions {
  container: HTMLElement | null
  selector?: string
  target: OverlayFocusTarget
}

const defaultMenuItemSelector = '[data-menu-item]'

export function createOverlayContentId(prefix = 'tiptap-overlay'): string {
  overlayContentId += 1
  return `${prefix}-${overlayContentId}`
}

export function isKeyboardActivationEvent(event: Event): event is KeyboardEvent {
  return (
    event instanceof KeyboardEvent && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)
  )
}

export function isRovingItem(element: HTMLElement): boolean {
  if (element.matches(':disabled, [aria-disabled="true"]')) return false
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false

  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

export function getRovingItems(
  container: HTMLElement | null,
  selector = defaultMenuItemSelector,
): HTMLElement[] {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(isRovingItem)
}

export function focusRovingItem({
  container,
  selector = defaultMenuItemSelector,
  target,
}: RovingFocusOptions): boolean {
  const items = getRovingItems(container, selector)
  const item = target === 'first' ? items[0] : items.at(-1)
  if (!item) return false

  item.focus()
  return document.activeElement === item
}

export function getNextRovingIndex(
  currentIndex: number,
  itemCount: number,
  direction: 'next' | 'previous' | 'first' | 'last',
): number {
  if (itemCount === 0) return -1
  if (direction === 'first') return 0
  if (direction === 'last') return itemCount - 1
  if (currentIndex < 0) return direction === 'next' ? 0 : itemCount - 1

  return direction === 'next'
    ? (currentIndex + 1) % itemCount
    : (currentIndex - 1 + itemCount) % itemCount
}

export function useOverlayAccessibility(options: OverlayAccessibilityOptions) {
  const contentId = options.contentId ?? createOverlayContentId(`tiptap-${options.component}`)
  const triggerRef = shallowRef<HTMLElement | null>(null)
  let openedWithKeyboard = false

  function setTrigger(element: Element | null | undefined) {
    triggerRef.value = element instanceof HTMLElement ? element : null
  }

  function recordOpenEvent(event?: Event) {
    openedWithKeyboard = event ? isKeyboardActivationEvent(event) : false
  }

  async function focusContent(
    container: HTMLElement | null,
    target: OverlayFocusTarget = 'first',
  ): Promise<boolean> {
    if (!openedWithKeyboard) return false

    await nextTick()
    const didFocus = focusRovingItem({ container, target })
    if (!didFocus) {
      diagnostics.debug('focus target unavailable', {
        component: options.component,
        action: 'focus-content',
        state: target,
      })
    }
    return didFocus
  }

  async function restoreTriggerFocus(content: HTMLElement | null): Promise<boolean> {
    await nextTick()

    const trigger = triggerRef.value
    if (!trigger?.isConnected) {
      diagnostics.debug('focus trigger unavailable', {
        component: options.component,
        action: 'restore-trigger',
        state: 'disconnected',
      })
      return false
    }

    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      if (!content?.contains(activeElement) && activeElement.isConnected) return false
    }

    trigger.focus()
    const didFocus = document.activeElement === trigger
    if (!didFocus) {
      diagnostics.debug('focus restoration failed', {
        component: options.component,
        action: 'restore-trigger',
        state: 'failed',
      })
    }
    return didFocus
  }

  return {
    contentId,
    triggerRef,
    setTrigger,
    recordOpenEvent,
    focusContent,
    restoreTriggerFocus,
  }
}
