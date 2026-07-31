import StarterKit from '@tiptap/starter-kit'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { Editor } from '@tiptap/vue-3'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type EditorHotkeyCommand,
  useEditorHotkeys,
} from '../../../packages/editor/src/composables/useEditorHotkeys'
import { useDeleteNode } from '../../../packages/editor/src/composables/useDeleteNode'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function createHost() {
  const host = document.createElement('div')
  host.className = 'tinyfy-editor'
  const editorElement = document.createElement('div')
  editorElement.contentEditable = 'true'
  host.append(editorElement)
  document.body.append(host)
  return { editorElement }
}

function createEditor(content = '<p>First block</p>') {
  const host = document.createElement('div')
  host.className = 'tinyfy-editor'
  document.body.append(host)
  const editor = new Editor({ element: host, content, extensions: [StarterKit] })
  editors.push(editor)
  return editor
}

function mountHotkeys(editor: Editor, commands: readonly EditorHotkeyCommand[]) {
  const HotkeyHost = defineComponent({
    setup() {
      useEditorHotkeys(
        computed(() => editor),
        commands,
      )
      return () => h('div')
    },
  })
  const wrapper = mount(HotkeyHost)
  wrappers.push(wrapper)
  return wrapper
}

function mountDeleteNode(editor: Editor, onDeleted: () => void): ReturnType<typeof useDeleteNode> {
  let deletion: ReturnType<typeof useDeleteNode> | undefined
  const DeleteNodeHost = defineComponent({
    setup() {
      deletion = useDeleteNode(
        computed(() => editor),
        onDeleted,
      )
      return () => h('div')
    },
  })
  const wrapper = mount(DeleteNodeHost)
  wrappers.push(wrapper)
  if (!deletion) throw new Error('Expected delete-node composable to initialize')
  return deletion
}

function dispatchKey(target: HTMLElement, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('useEditorHotkeys', () => {
  it('dispatches an enabled shortcut once and prevents its browser default', () => {
    const { editorElement } = createHost()
    const execute = vi.fn(() => true)
    mountHotkeys({ view: { dom: editorElement } } as Editor, [
      { shortcut: 'mod+shift+h', isEnabled: () => true, execute },
    ])

    const event = dispatchKey(editorElement, { ctrlKey: true, key: 'h', shiftKey: true })

    expect(execute).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves disabled, failed, and already-handled shortcuts untouched', () => {
    const { editorElement } = createHost()
    const disabledExecute = vi.fn(() => true)
    const failedExecute = vi.fn(() => false)
    mountHotkeys({ view: { dom: editorElement } } as Editor, [
      { shortcut: 'mod+shift+h', isEnabled: () => false, execute: disabledExecute },
      { shortcut: 'mod+shift+t', isEnabled: () => true, execute: failedExecute },
    ])

    const disabledEvent = dispatchKey(editorElement, {
      ctrlKey: true,
      key: 'h',
      shiftKey: true,
    })
    const failedEvent = dispatchKey(editorElement, {
      ctrlKey: true,
      key: 't',
      shiftKey: true,
    })
    const handledEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: 't',
      shiftKey: true,
    })
    handledEvent.preventDefault()
    editorElement.dispatchEvent(handledEvent)

    expect(disabledExecute).not.toHaveBeenCalled()
    expect(failedExecute).toHaveBeenCalledOnce()
    expect(disabledEvent.defaultPrevented).toBe(false)
    expect(failedEvent.defaultPrevented).toBe(false)
    expect(handledEvent.defaultPrevented).toBe(true)
  })

  it('dispatches only for the event target inside its own editor host', () => {
    const firstHost = createHost()
    const secondHost = createHost()
    const firstExecute = vi.fn(() => true)
    const secondExecute = vi.fn(() => true)

    mountHotkeys({ view: { dom: firstHost.editorElement } } as Editor, [
      { shortcut: 'mod+shift+i', isEnabled: () => true, execute: firstExecute },
    ])
    mountHotkeys({ view: { dom: secondHost.editorElement } } as Editor, [
      { shortcut: 'mod+shift+i', isEnabled: () => true, execute: secondExecute },
    ])

    dispatchKey(firstHost.editorElement, { ctrlKey: true, key: 'i', shiftKey: true })

    expect(firstExecute).toHaveBeenCalledOnce()
    expect(secondExecute).not.toHaveBeenCalled()
  })
})

describe('useEditorHotkeys interaction gates', () => {
  it('ignores composition events and mobile contenteditable targets', () => {
    const { editorElement } = createHost()
    const execute = vi.fn(() => true)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    )
    mountHotkeys({ view: { dom: editorElement } } as Editor, [
      { shortcut: 'mod+shift+h', isEnabled: () => true, execute },
    ])

    const composingEvent = dispatchKey(editorElement, {
      ctrlKey: true,
      isComposing: true,
      key: 'h',
      shiftKey: true,
    })
    const mobileEvent = dispatchKey(editorElement, {
      ctrlKey: true,
      key: 'h',
      shiftKey: true,
    })

    expect(execute).not.toHaveBeenCalled()
    expect(composingEvent.defaultPrevented).toBe(false)
    expect(mobileEvent.defaultPrevented).toBe(false)
  })

  it('removes its document listener when unmounted', () => {
    const { editorElement } = createHost()
    const execute = vi.fn(() => true)
    const wrapper = mountHotkeys({ view: { dom: editorElement } } as Editor, [
      { shortcut: 'mod+shift+h', isEnabled: () => true, execute },
    ])

    wrapper.unmount()
    dispatchKey(editorElement, { ctrlKey: true, key: 'h', shiftKey: true })

    expect(execute).not.toHaveBeenCalled()
  })

  it('handles Backspace only for a NodeSelection and reports successful keyboard deletion', () => {
    const editor = createEditor()
    const onDeleted = vi.fn()
    mountDeleteNode(editor, onDeleted)

    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1)))
    dispatchKey(editor.view.dom, { key: 'Backspace' })

    expect(onDeleted).not.toHaveBeenCalled()

    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))
    const deleteEvent = dispatchKey(editor.view.dom, { key: 'Backspace' })

    expect(deleteEvent.defaultPrevented).toBe(true)
    expect(onDeleted).toHaveBeenCalledOnce()
    expect(editor.getText()).toBe('')
  })
})
