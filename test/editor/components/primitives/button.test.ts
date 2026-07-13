import { describe, expect, it } from 'vitest'
import Button from '../../../../src/editor/components/primitives/Button.vue'
import Tooltip from '../../../../src/editor/components/primitives/Tooltip.vue'
import { mountInDocument, settleTeleportUpdates } from './test-utils'

describe('Button', () => {
  it('forwards slot content and arbitrary attributes without duplicating caller classes', () => {
    const wrapper = mountInDocument(Button, {
      props: {
        size: 'sm',
        tooltip: 'Save changes',
        variant: 'primary',
      },
      attrs: {
        'aria-label': 'Save document',
        class: 'caller-button-class',
        disabled: true,
      },
      slots: {
        default: 'Save',
      },
    })

    const button = wrapper.get('button')

    expect(button.text()).toBe('Save')
    expect(button.attributes('aria-label')).toBe('Save document')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('data-style')).toBe('primary')
    expect(button.attributes('data-size')).toBe('sm')
    expect(
      button.classes().filter((className) => className === 'caller-button-class'),
    ).toHaveLength(1)
    expect(wrapper.findAll('.caller-button-class')).toHaveLength(1)
  })

  it('does not render a tooltip trigger or layer when tooltip display is opted out', () => {
    const wrapper = mountInDocument(Button, {
      props: {
        showTooltip: false,
        tooltip: 'Save changes',
      },
      slots: {
        default: 'Save',
      },
    })

    expect(wrapper.find('[data-tooltip-state]').exists()).toBe(false)
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
  })

  it('reveals its teleported label and ordered shortcut keys on focus', async () => {
    const wrapper = mountInDocument(Button, {
      props: {
        shortcutKeys: 'ctrl+shift+k',
        showTooltip: true,
        tooltip: 'Command palette',
      },
      slots: {
        default: 'Open',
      },
      global: {
        stubs: {
          Tooltip,
        },
      },
    })

    wrapper.get('button').element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await settleTeleportUpdates()

    const tooltipTrigger = document.querySelector<HTMLElement>('[data-tooltip-state]')
    expect(tooltipTrigger).not.toBeNull()
    if (!tooltipTrigger) throw new Error('Expected button tooltip trigger to be rendered')
    expect(tooltipTrigger.dataset.tooltipState).toBe('open')

    const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')
    expect(tooltip).not.toBeNull()
    if (!tooltip) throw new Error('Expected focused button tooltip to be rendered')
    expect(tooltip.textContent).toContain('Command palette')
    expect(Array.from(tooltip.querySelectorAll('kbd')).map((key) => key.textContent)).toEqual([
      'Ctrl',
      '+',
      'Shift',
      '+',
      'K',
    ])
  })
})
