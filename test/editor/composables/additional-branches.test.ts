import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tiptap/vue-3'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, ref, shallowRef } from 'vue'
import { NodeSelection } from '@tiptap/pm/state'
import { afterEach, describe, expect, it } from 'vitest'
import { useFloatingToolbarVisibility } from '../../../src/editor/composables/useFloatingToolbarVisibility'
import { canMoveNode, useMoveNode } from '../../../src/editor/composables/useMoveNode'
import { getColorByValue, useRecentColors } from '../../../src/editor/composables/useRecentColors'
import { getEditorExtension } from '../../../src/editor/composables/useScrollToHash'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function createEditor(content: string) {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({ element: host, content, extensions: [StarterKit] })
  editors.push(editor)
  return editor
}

function selectBlock(editor: Editor, index: number) {
  let position = 0
  let found = 0
  editor.state.doc.forEach((_node, offset) => {
    if (found === index) position = offset
    found++
  })
  editor.view.dispatch(
    editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, position)),
  )
}

function useMoveAction(editor: Editor, direction: 'up' | 'down', hideWhenUnavailable = false) {
  let action: ReturnType<typeof useMoveNode> | undefined
  const Host = defineComponent({
    setup() {
      action = useMoveNode(
        computed(() => editor),
        direction,
        hideWhenUnavailable,
      )
      return () => h('div')
    },
  })
  wrappers.push(mount(Host))
  if (!action) throw new Error('Expected move action')
  return action
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  localStorage.clear()
  document.body.replaceChildren()
})

describe('additional composable branch behavior', () => {
  it('moves selected blocks in both directions and rejects edge movement', () => {
    const editor = createEditor('<p>First</p><p>Second</p><p>Third</p>')
    selectBlock(editor, 1)

    const up = useMoveAction(editor, 'up', true)
    expect(up.canMoveNode.value).toBe(true)
    expect(up.isVisible.value).toBe(true)
    expect(up.handleMoveNode()).toBe(true)
    expect(editor.getText()).toMatch(/^Second\s+First\s+Third$/)

    selectBlock(editor, 0)
    expect(canMoveNode(editor, 'up')).toBe(false)
    expect(up.handleMoveNode()).toBe(false)

    selectBlock(editor, 0)
    const down = useMoveAction(editor, 'down')
    expect(down.isVisible.value).toBe(true)
    expect(down.canMoveNode.value).toBe(true)
    expect(down.handleMoveNode()).toBe(true)
    expect(editor.getText()).toMatch(/^First\s+Second\s+Third$/)
    expect(canMoveNode(null, 'down')).toBe(false)
  })

  it('loads, deduplicates, limits, and safely falls back for recent colors', async () => {
    localStorage.setItem(
      'tiptapRecentlyUsedColors',
      JSON.stringify([
        { type: 'text', value: '#111', label: '#111' },
        { type: 'highlight', value: '#222', label: '#222' },
        { type: 'text', value: '#333', label: '#333' },
      ]),
    )
    let colors: ReturnType<typeof useRecentColors> | undefined
    const Host = defineComponent({
      setup() {
        colors = useRecentColors(2)
        return () => h('div')
      },
    })
    wrappers.push(mount(Host))
    await nextTick()
    if (!colors) throw new Error('Expected colors composable')

    expect(colors.isInitialized.value).toBe(true)
    expect(colors.recentColors.value).toEqual([
      { type: 'text', value: '#111', label: '#111' },
      { type: 'highlight', value: '#222', label: '#222' },
    ])
    colors.addRecentColor({ type: 'text', value: '#111', label: '#111' })
    expect(colors.recentColors.value).toEqual([
      { type: 'text', value: '#111', label: '#111' },
      { type: 'highlight', value: '#222', label: '#222' },
    ])
    colors.addRecentColor({ type: 'text', value: '#444', label: '#444' })
    expect(colors.recentColors.value).toEqual([
      { type: 'text', value: '#444', label: '#444' },
      { type: 'text', value: '#111', label: '#111' },
    ])
    expect(getColorByValue('#111', [{ value: '#111', label: 'Black' }])).toEqual({
      value: '#111',
      label: 'Black',
    })
    expect(getColorByValue('#999', [])).toEqual({ value: '#999', label: '#999' })
  })

  it('finds configured extensions and handles missing editor extensions', () => {
    const editor = createEditor('<p>Content</p>')
    const extension = Extension.create({ name: 'coverageExtension' })
    ;(editor.extensionManager.extensions as unknown as Array<unknown>).push(extension)

    expect(getEditorExtension(null, 'coverageExtension')).toBeNull()
    expect(getEditorExtension(editor, 'coverageExtension')).toBe(extension)
    expect(getEditorExtension(editor, 'missingExtension')).toBeNull()
  })

  it('reacts to floating-toolbar transaction, selection, pointer, and extra-hide paths', async () => {
    type EditorListener = (payload: unknown) => void
    const listeners = new Map<string, Set<EditorListener>>()
    const dom = document.createElement('div')
    const nodeDom = document.createElement('div')
    dom.append(nodeDom)
    const editor = createEditor('<p>Visible</p>')
    const editorRef = shallowRef(editor)
    const extraHide = ref(false)
    let visibility: ReturnType<typeof useFloatingToolbarVisibility> | undefined
    const originalOn = editor.on.bind(editor)
    const originalOff = editor.off.bind(editor)
    editor.on = ((event: string, callback: EditorListener) => {
      const callbacks = listeners.get(event) ?? new Set<EditorListener>()
      callbacks.add(callback)
      listeners.set(event, callbacks)
      return editor
    }) as typeof editor.on
    editor.off = ((event: string, callback: EditorListener) => {
      listeners.get(event)?.delete(callback)
      return editor
    }) as typeof editor.off
    Object.assign(editor.view, { dom, nodeDOM: () => nodeDom })

    const Host = defineComponent({
      setup() {
        visibility = useFloatingToolbarVisibility({
          editor: computed<Editor | null>(() => editorRef.value),
          extraHideWhen: computed(() => extraHide.value),
          isSelectionValid: (_instance, selection) => !(selection instanceof NodeSelection),
        })
        return () => h('div')
      },
    })
    wrappers.push(mount(Host))
    await nextTick()
    if (!visibility) throw new Error('Expected visibility composable')
    expect(visibility.shouldShow.value).toBe(true)

    for (const callback of listeners.get('transaction') ?? []) {
      callback({ transaction: { getMeta: () => true, selectionSet: false } })
    }
    selectBlock(editor, 0)
    for (const callback of listeners.get('selectionUpdate') ?? []) callback({})
    expect(visibility.shouldShow.value).toBe(false)

    dom.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(visibility.shouldShow.value).toBe(false)
    nodeDom.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(visibility.shouldShow.value).toBe(false)

    extraHide.value = true
    await nextTick()
    expect(visibility.shouldShow.value).toBe(false)
    extraHide.value = false
    await nextTick()
    expect(visibility.shouldShow.value).toBe(false)
    editor.on = originalOn
    editor.off = originalOff
  })
})
