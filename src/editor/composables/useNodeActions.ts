/**
 * Действия над текущим узлом/выделением для контекстного меню блока:
 * duplicate, copy to clipboard, copy anchor link, reset formatting,
 * delete, image download, TOC show title, table fit-to-width.
 * Порт хуков из чанков 1_-l0xapy_wlh, 34p294mqk5mqb, 094r3nrv45pwr.
 */
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { Fragment, Slice } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { isExtensionAvailable, isNodeTypeSelected, isValidPosition } from '../utils/tiptap-utils'
import { getEditorExtension } from './useScrollToHash'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import { getTable, RESIZE_MIN_WIDTH } from '../utils/table-utils'
import { CLEAR_ALL_LABEL, canClearAllTableContent, clearAllTableContent } from '../utils/table-actions'
import {
  ArrowDownToLineIcon,
  ClipboardIcon,
  CopyIcon,
  LinkIcon,
  ListIndentedIcon,
  MoveHorizontalIcon,
  RotateCcwIcon,
  SquareXIcon,
  TrashIcon,
} from '../icons'

export const DUPLICATE_SHORTCUT_KEY = 'mod+d'
export const COPY_TO_CLIPBOARD_SHORTCUT_KEY = 'mod+c'
export const COPY_ANCHOR_LINK_SHORTCUT_KEY = 'mod+ctrl+l'
export const RESET_ALL_FORMATTING_SHORTCUT_KEY = 'mod+r'
export const DELETE_NODE_SHORTCUT_KEY = 'backspace'
export const IMAGE_DOWNLOAD_SHORTCUT_KEY = 'mod+shift+d'
export const DEFAULT_RESET_PRESERVE_MARKS = ['inlineThread']

/** Узел уровня блока вокруг якоря выделения (или сам NodeSelection). */
export function getAnchorNodeAndPos(
  editor: Editor | null,
  allowEmptySelection = true,
): { node: ProseMirrorNode; pos: number } | null {
  if (!editor) return null
  const { selection } = editor.state
  if (selection instanceof NodeSelection) {
    const node = selection.node
    const pos = selection.from
    if (node && isValidPosition(pos)) return { node, pos }
  }
  if (selection.empty && !allowEmptySelection) return null
  const $anchor = selection.$anchor
  return { node: $anchor.node(1), pos: $anchor.before(1) }
}

// ---------------------------------------------------------------- duplicate

function canDuplicateNode(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  try {
    const { selection } = editor.state
    if (selection instanceof NodeSelection) return !!selection.node
    const $anchor = selection.$anchor
    for (let depth = 1; depth <= $anchor.depth; depth++) {
      const node = $anchor.node(depth)
      if (node.type.name !== 'doc' && node.type.spec.group) return true
    }
    return false
  } catch {
    return false
  }
}

export function useDuplicate(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canDuplicate = computed(() => (signal.value, canDuplicateNode(editor.value)))

  const handleDuplicate = (): boolean => {
    const instance = editor.value
    if (!instance || !instance.isEditable) return false
    try {
      const { state } = instance
      const { selection } = state
      const chain = instance.chain().focus()
      if (selection instanceof NodeSelection) {
        chain.insertContentAt(selection.to, selection.node.toJSON()).run()
        return true
      }
      const $anchor = selection.$anchor
      for (let depth = 1; depth <= $anchor.depth; depth++) {
        const node = $anchor.node(depth)
        if (node.type.name === 'doc' || !node.type.spec.group) continue
        const start = $anchor.start(depth)
        const insertPos = Math.min(start + node.nodeSize, state.doc.content.size)
        chain.insertContentAt(insertPos, node.toJSON()).run()
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return {
    canDuplicate,
    handleDuplicate,
    label: 'Duplicate node',
    shortcutKeys: DUPLICATE_SHORTCUT_KEY,
    Icon: CopyIcon,
  }
}

// ---------------------------------------------------------- copy to clipboard

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
    () => (signal.value, !!editor.value && !!editor.value.isEditable && !editor.value.state.selection.empty),
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
        ? ((instance.view as unknown as { serializeForClipboard: (slice: Slice) => { dom: HTMLElement } })
            .serializeForClipboard(slice).dom.innerHTML as string)
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

// ---------------------------------------------------------- copy anchor link

function getNodeIdInfo(editor: Editor | null) {
  if (!editor || !editor.isEditable) return null
  const anchor = getAnchorNodeAndPos(editor)
  if (!anchor) return null
  const attributeName = getEditorExtension(editor, 'uniqueID')?.options?.attributeName || 'data-id'
  const nodeId = (anchor.node.attrs?.[attributeName] as string | undefined) ?? null
  return { node: anchor.node, nodeId, hasNodeId: nodeId !== null }
}

export function useCopyAnchorLink(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canCopyAnchorLink = computed(() => (signal.value, getNodeIdInfo(editor.value)?.hasNodeId ?? false))

  const handleCopyAnchorLink = async (): Promise<boolean> => {
    const info = getNodeIdInfo(editor.value)
    if (!info || !info.hasNodeId || !info.nodeId) return false
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('source', 'copy_link')
      url.hash = info.nodeId
      await navigator.clipboard.writeText(url.toString())
      return true
    } catch (error) {
      console.error('Failed to copy node ID to clipboard:', error)
      return false
    }
  }

  return {
    canCopyAnchorLink,
    handleCopyAnchorLink,
    label: 'Copy anchor link',
    shortcutKeys: COPY_ANCHOR_LINK_SHORTCUT_KEY,
    Icon: LinkIcon,
  }
}

// --------------------------------------------------------- reset formatting

function selectionHasRemovableMarks(tr: Transaction, preserveMarks: string[]): boolean {
  const { selection } = tr
  if (selection.empty) return false
  for (const range of selection.ranges) {
    let found = false
    tr.doc.nodesBetween(range.$from.pos, range.$to.pos, node => {
      if (!node.isInline) return true
      for (const mark of node.marks) {
        if (!preserveMarks.includes(mark.type.name)) {
          found = true
          return false
        }
      }
      return true
    })
    if (found) return true
  }
  return false
}

export function useResetAllFormatting(
  editor: ComputedRef<Editor | null>,
  preserveMarks: string[] = DEFAULT_RESET_PRESERVE_MARKS,
) {
  const signal = useEditorSelectionSignal(editor)
  const canReset = computed(
    () =>
      (signal.value,
      !!editor.value && !!editor.value.isEditable && selectionHasRemovableMarks(editor.value.state.tr, preserveMarks)),
  )

  const handleResetFormatting = (): boolean => {
    const instance = editor.value
    if (!instance || !instance.isEditable) return false
    try {
      const { view, state } = instance
      const { tr } = state
      const { selection } = tr
      if (!selection.empty) {
        selection.ranges.forEach(range => {
          tr.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
            if (!node.isInline) return true
            node.marks.forEach(mark => {
              if (!preserveMarks.includes(mark.type.name)) tr.removeMark(pos, pos + node.nodeSize, mark.type)
            })
            return true
          })
        })
      }
      view.dispatch(tr)
      instance.commands.focus()
      return true
    } catch {
      return false
    }
  }

  return {
    canReset,
    handleResetFormatting,
    label: 'Reset formatting',
    shortcutKeys: RESET_ALL_FORMATTING_SHORTCUT_KEY,
    Icon: RotateCcwIcon,
  }
}

// ------------------------------------------------------------------- delete

function canDeleteCurrentNode(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  const { state } = editor
  const { selection } = state
  if (selection instanceof NodeSelection) return true
  const $anchor = selection.$anchor
  for (let depth = $anchor.depth; depth > 0; depth--) {
    const node = $anchor.node(depth)
    const before = $anchor.before(depth)
    if (state.tr.delete(before, before + node.nodeSize).doc !== state.doc) return true
  }
  return false
}

function deleteNodeRange(editor: Editor, from: number, size: number): boolean {
  const chain = editor.chain().focus()
  return !!chain.deleteRange({ from, to: from + size }).run() || chain.setNodeSelection(from).deleteSelection().run()
}

export function useDeleteNode(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canDeleteNode = computed(() => (signal.value, canDeleteCurrentNode(editor.value)))

  const handleDeleteNode = (): boolean => {
    const instance = editor.value
    if (!instance || !instance.isEditable) return false
    try {
      const { selection } = instance.state
      if (selection instanceof NodeSelection) {
        const node = selection.node
        if (!node) return false
        return deleteNodeRange(instance, selection.from, node.nodeSize)
      }
      const $from = selection.$from
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth)
        const before = $from.before(depth)
        if (
          node &&
          node.isBlock &&
          node.type.name !== 'tableRow' &&
          node.type.name !== 'tableHeader' &&
          node.type.name !== 'tableCell'
        ) {
          return deleteNodeRange(instance, before, node.nodeSize)
        }
      }
      return false
    } catch {
      return false
    }
  }

  return {
    canDeleteNode,
    handleDeleteNode,
    label: 'Delete',
    shortcutKeys: DELETE_NODE_SHORTCUT_KEY,
    Icon: TrashIcon,
  }
}

// ----------------------------------------------------------- image download

function fileExtensionFor(url: string, mimeType?: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/)
  if (match && match[1]) return `.${match[1].toLowerCase()}`
  if (mimeType) {
    const byMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
    }
    const ext = byMime[mimeType.toLowerCase()]
    if (ext) return ext
  }
  return '.jpg'
}

function canDownloadImage(editor: Editor | null): boolean {
  return (
    !!editor && !!editor.isEditable && !!isExtensionAvailable(editor, ['image']) && isNodeTypeSelected(editor, ['image'])
  )
}

function getSelectedImageAttrs(editor: Editor | null): { src: string; alt?: string; title?: string } | null {
  if (!editor || !canDownloadImage(editor)) return null
  const { selection } = editor.state
  if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
    const { src, alt, title } = selection.node.attrs
    return { src, alt, title }
  }
  return null
}

async function downloadViaFetch(url: string, fileName: string): Promise<boolean> {
  try {
    const response = await fetch(url)
    if (!response.ok) return false
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const name = /\.[a-zA-Z0-9]+$/.test(fileName)
      ? fileName
      : fileName + fileExtensionFor(url, response.headers.get('content-type') || undefined)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = name
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    return true
  } catch (error) {
    console.warn('Fetch download failed:', error)
    return false
  }
}

function downloadDirect(url: string, fileName: string): boolean {
  try {
    const name = /\.[a-zA-Z0-9]+$/.test(fileName) ? fileName : fileName + fileExtensionFor(url)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    return true
  } catch (error) {
    console.warn('Direct download failed:', error)
    return false
  }
}

export function useImageDownload(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canDownload = computed(() => (signal.value, canDownloadImage(editor.value)))

  const handleDownload = async (): Promise<boolean> => {
    const instance = editor.value
    if (!instance || !canDownloadImage(instance)) return false
    const attrs = getSelectedImageAttrs(instance)
    if (!attrs?.src) return false
    const fileName = attrs.title || attrs.alt || 'image'
    if (await downloadViaFetch(attrs.src, fileName)) return true
    if (downloadDirect(attrs.src, fileName)) return true
    try {
      window.open(attrs.src, '_blank')
      return true
    } catch (error) {
      console.error('Failed to open image:', error)
      return false
    }
  }

  return {
    canDownload,
    handleDownload,
    label: 'Download image',
    shortcutKeys: IMAGE_DOWNLOAD_SHORTCUT_KEY,
    Icon: ArrowDownToLineIcon,
  }
}

// ---------------------------------------------------------- toc show title

function canToggleTocTitle(editor: Editor | null): boolean {
  return !!editor && !!editor.isEditable && isNodeTypeSelected(editor, ['tocNode'])
}

export function useTocShowTitle(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canToggle = computed(() => (signal.value, canToggleTocTitle(editor.value)))
  const isActive = computed(() => {
    void signal.value
    const instance = editor.value
    if (!instance) return false
    try {
      const { selection } = instance.state
      return (
        selection instanceof NodeSelection &&
        selection.node.type.name === 'tocNode' &&
        selection.node.attrs.showTitle === true
      )
    } catch {
      return false
    }
  })

  const handleToggle = (): boolean => {
    const instance = editor.value
    if (!instance?.isEditable || !canToggleTocTitle(instance)) return false
    try {
      const { selection } = instance.state
      if (!(selection instanceof NodeSelection && selection.node.type.name === 'tocNode')) return false
      const showTitle = selection.node.attrs.showTitle === true
      return instance.chain().focus().updateAttributes('tocNode', { showTitle: !showTitle }).run()
    } catch {
      return false
    }
  }

  return { canToggle, isActive, handleToggle, label: 'Show title', Icon: ListIndentedIcon }
}

// -------------------------------------------------------- table fit to width

function canFitTableToWidth(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable || !isExtensionAvailable(editor, ['table', 'tableHandleExtension'])) return false
  try {
    return editor.isActive('table') || editor.isActive('tableCell') || editor.isActive('tableHeader')
  } catch {
    return false
  }
}

export function useTableFitToWidth(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canFitToWidth = computed(() => (signal.value, canFitTableToWidth(editor.value)))

  const handleFitToWidth = (): boolean => {
    const instance = editor.value
    if (!instance || !canFitTableToWidth(instance)) return false
    try {
      const table = getTable(instance)
      if (!table) return false
      const dom = instance.view.dom
      const style = getComputedStyle(dom)
      const paddingLeft = parseFloat(style.paddingLeft) || 0
      const paddingRight = parseFloat(style.paddingRight) || 0
      const available = dom.clientWidth - paddingLeft - paddingRight
      const columns = table.map.width
      if (columns === 0) return false
      const rawWidth = Math.floor((available - columns - 8) / columns)
      const columnWidth = Math.max(rawWidth, RESIZE_MIN_WIDTH)
      const tr = instance.state.tr
      table.node.descendants((node, pos) => {
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          const cellPos = table.start + pos
          const colspan = node.attrs.colspan || 1
          tr.setNodeMarkup(cellPos, undefined, { ...node.attrs, colwidth: Array(colspan).fill(columnWidth) })
        }
      })
      if (tr.docChanged) instance.view.dispatch(tr)
      return true
    } catch (error) {
      console.error('Error setting table auto width:', error)
      return false
    }
  }

  return { canFitToWidth, handleFitToWidth, label: 'Fit to width', Icon: MoveHorizontalIcon }
}

// ----------------------------------------------------- table clear contents

export function useTableClearAllContents(editor: ComputedRef<Editor | null>) {
  const signal = useEditorSelectionSignal(editor)
  const canClearAll = computed(() => (signal.value, canClearAllTableContent({ editor: editor.value })))

  const handleClearAll = (): boolean => {
    const instance = editor.value
    if (!instance) return false
    const cleared = clearAllTableContent({ editor: instance, resetAttrs: true })
    if (cleared) instance.commands.focus()
    return cleared
  }

  return { canClearAll, handleClearAll, label: CLEAR_ALL_LABEL, Icon: SquareXIcon }
}
