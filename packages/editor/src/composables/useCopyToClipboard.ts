import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { Fragment, Slice } from '@tiptap/pm/model'
import { TextSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/vue-3'
import { ClipboardIcon } from '../icons'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'

export const COPY_TO_CLIPBOARD_SHORTCUT_KEY = 'mod+c'

async function writeToClipboard(text: string, html?: string) {
  try {
    if (html && navigator.clipboard && 'write' in navigator.clipboard) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })
      await navigator.clipboard.write([item])
    } else {
      await navigator.clipboard.writeText(text)
    }
  } catch {
    await navigator.clipboard.writeText(text)
  }
}

export function useCopyToClipboard(editor: ComputedRef<Editor | null>, copyWithFormatting = true) {
  const signal = useEditorSelectionSignal(editor)
  const canCopyToClipboard = computed(
    () => (
      signal.value,
      !!editor.value && !!editor.value.isEditable && !editor.value.state.selection.empty
    ),
  )

  const handleCopyToClipboard = async (): Promise<boolean> => {
    const instance = editor.value
    if (!instance || !instance.isEditable) return false
    try {
      const { selection } = instance.state
      let slice = selection.content()
      // пустое или текстовое выделение → копируем блок целиком
      if (selection.empty || selection instanceof TextSelection) {
        const block = selection.$anchor.node(1)
        slice = new Slice(Fragment.from(block), 0, 0)
      }
      const textContent = slice.content.textBetween(0, slice.content.size, '\n')
      const htmlContent = copyWithFormatting
        ? ((
            instance.view as unknown as {
              serializeForClipboard: (slice: Slice) => { dom: HTMLElement }
            }
          ).serializeForClipboard(slice).dom.innerHTML as string)
        : undefined
      await writeToClipboard(textContent, htmlContent)
      return true
    } catch {
      return false
    }
  }

  return {
    canCopyToClipboard,
    handleCopyToClipboard,
    label: 'Copy to clipboard',
    shortcutKeys: COPY_TO_CLIPBOARD_SHORTCUT_KEY,
    Icon: ClipboardIcon,
  }
}
