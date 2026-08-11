import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import NotionEditorHeader from '../../apps/playground/src/components/NotionEditorHeader.vue'
import ThemeToggle from '../../apps/playground/src/components/ThemeToggle.vue'

vi.mock('@i-prikot/editor', () => ({
  Button: defineComponent({
    emits: ['click'],
    setup(_props, { emit, slots }) {
      return () => h('button', { onClick: () => emit('click') }, slots.default?.())
    },
  }),
  ButtonGroup: defineComponent({
    setup(_props, { slots }) {
      return () => h('div', slots.default?.())
    },
  }),
  CollabUsers: defineComponent({ template: '<div />' }),
  Separator: defineComponent({ template: '<hr />' }),
  Spacer: defineComponent({ template: '<div />' }),
  UndoRedoButton: defineComponent({ template: '<button />' }),
  MoonStarIcon: defineComponent({ template: '<span>moon</span>' }),
  SunIcon: defineComponent({ template: '<span>sun</span>' }),
}))

describe('playground editor header', () => {
  it('emits the mode requested by the theme toggle', () => {
    const onDarkModeToggle = vi.fn()
    const onLightModeToggle = vi.fn()
    const darkMode = mount(ThemeToggle, {
      props: { isDarkMode: true, onToggle: onDarkModeToggle },
    })
    const lightMode = mount(ThemeToggle, {
      props: { isDarkMode: false, onToggle: onLightModeToggle },
    })

    expect(darkMode.get('button').attributes('aria-label')).toBe('Switch to light mode')
    expect(lightMode.get('button').attributes('aria-label')).toBe('Switch to dark mode')

    const darkModeEmit = darkMode.vm.$.setupState.emit as (event: 'toggle') => void
    const lightModeEmit = lightMode.vm.$.setupState.emit as (event: 'toggle') => void
    darkModeEmit('toggle')
    lightModeEmit('toggle')

    expect(onDarkModeToggle).toHaveBeenCalledOnce()
    expect(onLightModeToggle).toHaveBeenCalledOnce()
  })

  it('emits only valid locale changes from the header selector', async () => {
    const onUpdateLocale = vi.fn()
    const wrapper = mount(NotionEditorHeader, {
      props: { editor: null, isDarkMode: false, locale: 'en', onUpdateLocale },
    })

    const localeSelect = wrapper.get('select[name="editor-locale"]')
    await localeSelect.setValue('ru')
    const handleLocaleChange = wrapper.vm.$.setupState.handleLocaleChange as (event: Event) => void
    handleLocaleChange(new Event('change', { bubbles: true }))

    expect(onUpdateLocale).toHaveBeenCalledOnce()
    expect(onUpdateLocale).toHaveBeenCalledWith('ru')
  })
})
