import type { Extensions } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tiptap/vue-3'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, type ComputedRef } from 'vue'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getAnchorNodeAndPos,
  useCopyAnchorLink,
  useCopyToClipboard,
  useDuplicate,
  useImageDownload,
  useTableFitToWidth,
  useTocShowTitle,
} from '../../../src/editor/composables/useNodeActions'

const editors: Editor[] = []
const wrappers: Array<{ unmount: () => void }> = []

function createEditor(content: string, extensions: Extensions = [StarterKit]) {
  const host = document.createElement('div')
  document.body.append(host)
  const editor = new Editor({ element: host, content, extensions })
  editors.push(editor)
  return editor
}

function useAction<T>(editor: Editor, factory: (editorRef: ComputedRef<Editor | null>) => T) {
  let action: T | undefined
  const Host = defineComponent({
    setup() {
      action = factory(computed(() => editor))
      return () => h('div')
    },
  })
  wrappers.push(mount(Host))
  if (!action) throw new Error('Expected action to initialize')
  return action
}

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
  while (editors.length) editors.pop()?.destroy()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('node action branch behavior', () => {
  it('uses the formatted clipboard API and rejects unavailable editor actions', async () => {
    const editor = createEditor('<p>Formatted copy</p>')
    const write = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write, writeText },
    })
    vi.stubGlobal(
      'ClipboardItem',
      class ClipboardItem {
        constructor(public readonly items: Record<string, Blob>) {}
      },
    )
    Object.assign(editor.view, {
      serializeForClipboard: () => {
        const dom = document.createElement('div')
        dom.innerHTML = '<strong>Formatted copy</strong>'
        return { dom }
      },
    })
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1, 10)),
    )

    const copy = useAction(editor, (editorRef) => useCopyToClipboard(editorRef, true))
    await expect(copy.handleCopyToClipboard()).resolves.toBe(true)
    expect(write).toHaveBeenCalledOnce()
    expect(getAnchorNodeAndPos(null)).toBeNull()
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1)))
    expect(getAnchorNodeAndPos(editor, false)).toBeNull()

    const missing = useAction(editor, () => useDuplicate(computed(() => null)))
    expect(missing.canDuplicate.value).toBe(false)
    expect(missing.handleDuplicate()).toBe(false)
  })

  it('returns safe fallbacks for unsupported anchor, TOC, and table operations', async () => {
    const editor = createEditor('<p>Plain block</p>')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })

    const anchor = useAction(editor, useCopyAnchorLink)
    await expect(anchor.handleCopyAnchorLink()).resolves.toBe(false)
    const toc = useAction(editor, useTocShowTitle)
    expect(toc.canToggle.value).toBe(false)
    expect(toc.isActive.value).toBe(false)
    expect(toc.handleToggle()).toBe(false)
    const fit = useAction(editor, useTableFitToWidth)
    expect(fit.canFitToWidth.value).toBe(false)
    expect(fit.handleFitToWidth()).toBe(false)
  })

  it('falls back to a direct image download when fetch fails', async () => {
    const editor = createEditor('<img src="https://example.test/photo" alt="">', [
      StarterKit,
      Image,
    ])
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const download = useAction(editor, useImageDownload)
    await expect(download.handleDownload()).resolves.toBe(true)
    expect(click).toHaveBeenCalledOnce()
  })
})
