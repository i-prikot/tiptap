import type { Editor } from '@tiptap/core'

export const CANCEL_PENDING_UPDATE_META = 'notion-editor:cancel-pending-update'

export function cancelPendingUpdate(editor: Editor) {
  editor.chain().setMeta(CANCEL_PENDING_UPDATE_META, true).run()
}
