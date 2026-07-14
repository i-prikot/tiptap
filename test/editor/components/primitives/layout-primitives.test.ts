import { describe, expect, it } from 'vitest'
import Badge from '../../../../src/editor/components/primitives/Badge.vue'
import ButtonGroup from '../../../../src/editor/components/primitives/ButtonGroup.vue'
import Separator from '../../../../src/editor/components/primitives/Separator.vue'
import Spacer from '../../../../src/editor/components/primitives/Spacer.vue'
import Card from '../../../../src/editor/components/primitives/card/Card.vue'
import CardBody from '../../../../src/editor/components/primitives/card/CardBody.vue'
import CardGroupLabel from '../../../../src/editor/components/primitives/card/CardGroupLabel.vue'
import CardItemGroup from '../../../../src/editor/components/primitives/card/CardItemGroup.vue'
import Input from '../../../../src/editor/components/primitives/input/Input.vue'
import InputGroup from '../../../../src/editor/components/primitives/input/InputGroup.vue'
import InputGroupAddon from '../../../../src/editor/components/primitives/input/InputGroupAddon.vue'
import InputGroupButton from '../../../../src/editor/components/primitives/input/InputGroupButton.vue'
import InputGroupInput from '../../../../src/editor/components/primitives/input/InputGroupInput.vue'
import Toolbar from '../../../../src/editor/components/primitives/toolbar/Toolbar.vue'
import ToolbarGroup from '../../../../src/editor/components/primitives/toolbar/ToolbarGroup.vue'
import ToolbarSeparator from '../../../../src/editor/components/primitives/toolbar/ToolbarSeparator.vue'
import { mountInDocument, settleTeleportUpdates } from './test-utils'

describe('layout primitives', () => {
  it('renders badge, button-group, separator, and spacer variants', () => {
    const badge = mountInDocument(Badge, {
      props: { appearance: 'outline', size: 'small', trimText: true, variant: 'warning' },
      slots: { default: 'Warning' },
    })
    const group = mountInDocument(ButtonGroup, {
      props: { orientation: 'horizontal' },
      slots: { default: '<button type="button">One</button>' },
    })
    const separator = mountInDocument(Separator, { props: { orientation: 'horizontal' } })
    const verticalSpacer = mountInDocument(Spacer, {
      props: { orientation: 'vertical', size: '12px' },
    })
    const horizontalSpacer = mountInDocument(Spacer, {
      props: { orientation: 'horizontal', size: '12px' },
    })
    const flexibleSpacer = mountInDocument(Spacer)

    expect(badge.get('.tiptap-badge').attributes()).toMatchObject({
      'data-appearance': 'outline',
      'data-size': 'small',
      'data-style': 'warning',
      'data-text-trim': 'on',
    })
    expect(group.get('[role="group"]').classes()).toContain('tiptap-button-group-horizontal')
    expect(separator.get('[role="separator"]').attributes('aria-orientation')).toBe('horizontal')
    expect(verticalSpacer.get('.tiptap-spacer').attributes('style')).toContain('height: 12px')
    expect(horizontalSpacer.get('.tiptap-spacer').attributes('style')).toContain('width: 12px')
    expect(flexibleSpacer.get('.tiptap-spacer').attributes('style')).toContain('flex-grow: 1')
  })

  it('preserves card slot content and orientation attributes', () => {
    const card = mountInDocument(Card, { slots: { default: '<p>Card content</p>' } })
    const body = mountInDocument(CardBody, { slots: { default: 'Body content' } })
    const label = mountInDocument(CardGroupLabel, { slots: { default: 'Settings' } })
    const itemGroup = mountInDocument(CardItemGroup, {
      props: { orientation: 'horizontal' },
      slots: { default: '<button type="button">Save</button>' },
    })

    expect(card.get('.tiptap-card').text()).toBe('Card content')
    expect(body.get('.tiptap-card-body').text()).toBe('Body content')
    expect(label.get('.tiptap-card-group-label').text()).toBe('Settings')
    expect(itemGroup.get('.tiptap-card-item-group').attributes('data-orientation')).toBe(
      'horizontal',
    )
  })

  it('forwards input attributes and focuses an input from its addon', async () => {
    const group = mountInDocument(InputGroup, { slots: { default: '<span>Controls</span>' } })
    const addon = mountInDocument(InputGroupAddon, { props: { align: 'inline-end' } })
    const groupInput = document.createElement('input')
    groupInput.id = 'group-input'
    addon.element.parentElement?.append(groupInput)
    const input = mountInDocument(Input, {
      props: { type: 'search' },
      attrs: { 'aria-label': 'Search', placeholder: 'Find text' },
    })
    const groupInputControl = mountInDocument(InputGroupInput, { props: { type: 'email' } })
    const button = mountInDocument(InputGroupButton, {
      props: { size: 'sm', type: 'submit', variant: 'primary' },
      slots: { default: 'Submit' },
    })

    await addon.trigger('click')

    expect(document.activeElement?.id).toBe('group-input')
    expect(group.get('[role="group"]').text()).toBe('Controls')
    expect(addon.classes()).toContain('tiptap-input-group-addon--inline-end')
    expect(button.get('button').attributes()).toMatchObject({
      'data-size': 'sm',
      'data-style': 'primary',
      type: 'submit',
    })
    expect(input.get('input').attributes()).toMatchObject({
      'aria-label': 'Search',
      placeholder: 'Find text',
      type: 'search',
    })
    expect(groupInputControl.get('input').attributes('type')).toBe('email')
  })

  it('keeps button clicks inside an input addon and renders default input controls', async () => {
    const addon = mountInDocument(InputGroupAddon)
    const input = document.createElement('input')
    input.id = 'input-with-button'
    addon.element.parentElement?.append(input)
    const button = document.createElement('button')
    addon.element.append(button)

    button.click()
    await settleTeleportUpdates()

    expect(document.activeElement?.id).not.toBe('input-with-button')
    expect(mountInDocument(InputGroupInput).get('input').attributes('type')).toBe('text')
  })

  it('renders toolbar groups and separators and tracks focus visibility', async () => {
    const toolbar = mountInDocument(Toolbar, {
      props: { variant: 'floating' },
      slots: { default: '<button id="first" type="button">First</button>' },
    })
    const first = toolbar.get('#first')
    const toolbarGroup = mountInDocument(ToolbarGroup, { slots: { default: 'Tools' } })
    const toolbarSeparator = mountInDocument(ToolbarSeparator)

    await first.trigger('focus')
    await settleTeleportUpdates()
    await first.trigger('blur')

    expect(toolbar.get('[role="toolbar"]').attributes('data-variant')).toBe('floating')
    expect(first.attributes('data-focus-visible')).toBeUndefined()
    expect(toolbarGroup.get('[role="group"]').classes()).toContain('tiptap-toolbar-group')
    expect(toolbarSeparator.get('[role="separator"]').attributes('data-orientation')).toBe(
      'vertical',
    )
  })
})
