import { afterEach, describe, expect, it, vi } from 'vitest'
import Tooltip from '../../../../src/editor/components/primitives/Tooltip.vue'
import { mountInDocument, settleTeleportUpdates } from './test-utils'

function mountTooltip(props: Record<string, unknown> = {}) {
  return mountInDocument(Tooltip, {
    props,
    slots: {
      content: 'Helpful description',
      default: '<button type="button">Trigger</button>',
    },
  })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Tooltip', () => {
  it('keeps the teleported layer absent while closed', () => {
    const wrapper = mountTooltip()

    expect(wrapper.get('.tiptap-tooltip-trigger').attributes('data-tooltip-state')).toBe('closed')
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
  })

  it('opens only after the configured mouse-entry delay', async () => {
    vi.useFakeTimers()
    const wrapper = mountTooltip({ delay: 150 })
    const trigger = wrapper.get('.tiptap-tooltip-trigger')

    await trigger.trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(149)
    await settleTeleportUpdates()

    expect(document.querySelector('[role="tooltip"]')).toBeNull()

    await vi.advanceTimersByTimeAsync(1)
    await settleTeleportUpdates()

    expect(trigger.attributes('data-tooltip-state')).toBe('open')
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Helpful description')
  })

  it('cancels a pending open when the pointer leaves before the delay', async () => {
    vi.useFakeTimers()
    const wrapper = mountTooltip({ delay: 150 })
    const trigger = wrapper.get('.tiptap-tooltip-trigger')

    await trigger.trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(75)
    await trigger.trigger('mouseleave')
    await vi.advanceTimersByTimeAsync(150)
    await settleTeleportUpdates()

    expect(trigger.attributes('data-tooltip-state')).toBe('closed')
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
  })

  it('honors the configured close delay after mouse leave', async () => {
    vi.useFakeTimers()
    const wrapper = mountTooltip({ closeDelay: 80, delay: 0 })
    const trigger = wrapper.get('.tiptap-tooltip-trigger')

    await trigger.trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(0)
    await settleTeleportUpdates()
    await trigger.trigger('mouseleave')
    await vi.advanceTimersByTimeAsync(79)
    await settleTeleportUpdates()

    expect(document.querySelector('[role="tooltip"]')).not.toBeNull()

    await vi.advanceTimersByTimeAsync(1)
    await settleTeleportUpdates()

    expect(trigger.attributes('data-tooltip-state')).toBe('closed')
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
  })

  it('opens immediately on focus and closes on focus loss', async () => {
    const wrapper = mountTooltip()
    const trigger = wrapper.get('.tiptap-tooltip-trigger')

    await trigger.trigger('focusin')
    await settleTeleportUpdates()

    expect(trigger.attributes('data-tooltip-state')).toBe('open')
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull()

    await trigger.trigger('focusout')
    await settleTeleportUpdates()

    expect(trigger.attributes('data-tooltip-state')).toBe('closed')
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
  })
})
