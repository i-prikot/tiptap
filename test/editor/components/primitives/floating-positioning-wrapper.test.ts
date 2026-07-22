import { defineComponent, h, shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import FloatingPositioningWrapper from '../../../../src/editor/components/primitives/floating-positioning-wrapper/FloatingPositioningWrapper.vue'
import { provideEditorOverlayTarget } from '../../../../src/editor/composables/useEditorOverlayTarget'
import { mountInDocument, settleTeleportUpdates } from './test-utils'

function requireFloatingElement(selector: string) {
  const element = document.querySelector<HTMLElement>(selector)

  expect(element, `Expected ${selector} to be rendered`).not.toBeNull()
  if (!element) throw new Error(`Expected ${selector} to be rendered`)

  return element
}

describe('FloatingPositioningWrapper', () => {
  it('teleports to body and updates the floating element model as open changes', async () => {
    const updateFloatingElement = vi.fn()
    const wrapper = mountInDocument(FloatingPositioningWrapper, {
      props: {
        open: false,
        floatingStyles: { position: 'fixed' },
        'onUpdate:floatingElement': updateFloatingElement,
      },
      attrs: { 'data-testid': 'body-floating-wrapper' },
      slots: { default: '<span>Floating content</span>' },
    })

    expect(document.querySelector('[data-testid="body-floating-wrapper"]')).toBeNull()

    await wrapper.setProps({ open: true })
    await settleTeleportUpdates()

    const floatingElement = requireFloatingElement('[data-testid="body-floating-wrapper"]')
    expect(floatingElement.parentElement).toBe(document.body)
    expect(updateFloatingElement).toHaveBeenLastCalledWith(floatingElement)

    await wrapper.setProps({ open: false })
    await settleTeleportUpdates()

    expect(document.querySelector('[data-testid="body-floating-wrapper"]')).toBeNull()
    expect(updateFloatingElement).toHaveBeenLastCalledWith(null)
  })

  it('uses the injected editor overlay target when one is available', async () => {
    const overlayTarget = document.createElement('div')
    overlayTarget.id = 'editor-overlay-target'
    document.body.append(overlayTarget)

    const WrapperHost = defineComponent({
      setup() {
        provideEditorOverlayTarget(shallowRef(overlayTarget))

        return () =>
          h(
            FloatingPositioningWrapper,
            { open: true, floatingStyles: { position: 'absolute' } },
            { default: () => h('span', { 'data-testid': 'overlay-target-content' }, 'Content') },
          )
      },
    })

    mountInDocument(WrapperHost)
    await settleTeleportUpdates()

    expect(overlayTarget.querySelector('[data-testid="overlay-target-content"]')).not.toBeNull()
  })

  it('forwards wrapper attributes and listeners while preserving floating positioning styles', async () => {
    const onPointerdown = vi.fn()
    mountInDocument(FloatingPositioningWrapper, {
      props: {
        open: true,
        floatingStyles: {
          position: 'fixed',
          transform: 'translate(12px, 24px)',
        },
        wrapperStyle: {
          minWidth: 'max-content',
          transform: 'scale(0.8)',
          zIndex: 1000,
        },
      },
      attrs: {
        'data-radix-popper-content-wrapper': '',
        'data-testid': 'styled-floating-wrapper',
        role: 'presentation',
        style: { minWidth: '30px', zIndex: 2000 },
        onPointerdown,
      },
      slots: { default: '<span>Floating content</span>' },
    })
    await settleTeleportUpdates()

    const floatingElement = requireFloatingElement('[data-testid="styled-floating-wrapper"]')
    floatingElement.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

    expect(floatingElement.getAttribute('data-radix-popper-content-wrapper')).toBe('')
    expect(floatingElement.getAttribute('role')).toBe('presentation')
    expect(floatingElement.style).toMatchObject({
      minWidth: '30px',
      position: 'fixed',
      transform: 'translate(12px, 24px)',
      zIndex: '2000',
    })
    expect(onPointerdown).toHaveBeenCalledExactlyOnceWith(expect.any(PointerEvent))
  })
})
