import type { Extensions } from '@tiptap/core'
import { Image, Indent, ImageUploadNode } from '@i-prikot/editor-schema'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, type ComputedRef, type Ref, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { useImageAlign } from '../../../packages/editor/src/composables/useImageAlign'
import { useImageCaption } from '../../../packages/editor/src/composables/useImageCaption'
import { useImageUploadButton } from '../../../packages/editor/src/composables/useImageUploadButton'
import { useIndent, type IndentAction } from '../../../packages/editor/src/composables/useIndent'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function createEditor(content: string, extensions: Extensions = []): Editor {
  const host = document.createElement('div')
  document.body.append(host)

  const editor = new Editor({
    element: host,
    content,
    extensions: [StarterKit, ...extensions],
  })
  editors.push(editor)
  return editor
}

function selectFirstNode(editor: Editor): void {
  editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))
}

function useComposable<T>(factory: (editor: ComputedRef<Editor | null>) => T, editor: Editor): T {
  let composable: T | undefined
  const Host = defineComponent({
    setup() {
      composable = factory(computed(() => editor))
      return () => h('div')
    },
  })
  wrappers.push(mount(Host))

  if (composable === undefined) throw new Error('Expected composable to initialize')
  return composable
}

function updateImageControl<T>(
  editor: Editor,
  factory: (editor: ComputedRef<Editor | null>, hideWhenUnavailable: Ref<boolean>) => T,
): T {
  const hideWhenUnavailable = ref(false)
  return useComposable((editorRef) => factory(editorRef, hideWhenUnavailable), editor)
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  document.body.replaceChildren()
})

describe('image and indentation command composables', () => {
  it('runs the selected indent command and updates its command metadata reactively', () => {
    const editor = createEditor('<p>Paragraph</p>', [Indent])
    const action = ref<IndentAction>('indent')
    const indent = useComposable(
      (editorRef) =>
        useIndent(
          editorRef,
          computed(() => action.value),
          computed(() => false),
        ),
      editor,
    )

    expect(indent.canIndent.value).toBe(true)
    expect(indent.label.value).toBe('Increase indent')
    expect(indent.shortcutKeys.value).toBe('Tab')
    expect(indent.execute()).toBe(true)
    expect(editor.state.doc.firstChild?.attrs.indent).toBe(1)

    action.value = 'outdent'
    expect(indent.label.value).toBe('Decrease indent')
    expect(indent.shortcutKeys.value).toBe('Shift-Tab')
    expect(indent.execute()).toBe(true)
    expect(editor.state.doc.firstChild?.attrs.indent).toBe(0)
  })

  it('aligns a selected image and restores its node selection', () => {
    const editor = createEditor('<img src="https://example.test/photo.png">', [Image])
    selectFirstNode(editor)
    const align = useComposable(
      (editorRef) =>
        useImageAlign({
          editor: editorRef,
          align: computed(() => 'center' as const),
          extensionName: computed(() => 'image'),
          attributeName: computed(() => 'data-align'),
          hideWhenUnavailable: computed(() => false),
        }),
      editor,
    )

    expect(align.canAlign.value).toBe(true)
    expect(align.isActive.value).toBe(false)
    expect(align.execute()).toBe(true)
    expect(editor.state.doc.firstChild?.attrs['data-align']).toBe('center')
    expect(editor.state.selection).toBeInstanceOf(NodeSelection)
    expect(editor.state.selection.from).toBe(0)
  })

  it('enables a caption for a selected image and moves focus into its caption content', () => {
    const editor = createEditor('<img src="https://example.test/photo.png">', [Image])
    selectFirstNode(editor)
    const caption = updateImageControl(editor, useImageCaption)

    expect(caption.canToggle.value).toBe(true)
    expect(caption.isActive.value).toBe(false)
    expect(caption.execute()).toBe(true)
    expect(editor.state.doc.firstChild?.attrs.showCaption).toBe(true)
    expect(editor.state.selection).not.toBeInstanceOf(NodeSelection)
  })

  it('inserts an image upload node and hides unavailable upload controls in code content', () => {
    const insertEditor = createEditor('<p>Paragraph</p>', [ImageUploadNode])
    const uploadButton = updateImageControl(insertEditor, useImageUploadButton)

    expect(uploadButton.canInsert.value).toBe(true)
    expect(uploadButton.execute()).toBe(true)
    expect(insertEditor.state.doc.firstChild?.type.name).toBe('imageUpload')

    const unavailableEditor = createEditor('<p><code>const image = true</code></p>')
    unavailableEditor.view.dispatch(
      unavailableEditor.state.tr.setSelection(TextSelection.create(unavailableEditor.state.doc, 2)),
    )
    const unavailableButton = useComposable(
      (editorRef) =>
        useImageUploadButton(
          editorRef,
          computed(() => true),
        ),
      unavailableEditor,
    )

    expect(unavailableEditor.isActive('code')).toBe(true)
    expect(unavailableButton.canInsert.value).toBe(false)
    expect(unavailableButton.isVisible.value).toBe(false)
    expect(unavailableButton.execute()).toBe(false)
  })
})
