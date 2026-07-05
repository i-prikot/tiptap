/**
 * Состояние link-поповера: URL, установка/удаление/открытие ссылки.
 * Порт useLinkPopover/canSetLink из чанка 1mpndbcfk3lik (модуль 705258).
 */
import { computed, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { isMarkInSchema, isNodeTypeSelected, sanitizeUrl } from '../utils/tiptap-utils'
import { useEditorSelectionSignal } from './useEditorSelectionSignal'
import { LinkIcon } from '../icons'

export function canSetLink(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable || isNodeTypeSelected(editor, ['image'], true)) return false
  try {
    return editor.can().setMark('link')
  } catch {
    return false
  }
}

export function isLinkActive(editor: Editor | null): boolean {
  return !!editor && !!editor.isEditable && editor.isActive('link')
}

export interface UseLinkPopoverOptions {
  editor: ComputedRef<Editor | null>
  hideWhenUnavailable?: boolean
  onSetLink?: () => void
}

export function useLinkPopover(options: UseLinkPopoverOptions) {
  const { editor, hideWhenUnavailable = false, onSetLink } = options
  const signal = useEditorSelectionSignal(editor)

  const canSet = computed(() => (signal.value, canSetLink(editor.value)))
  const isActive = computed(() => (signal.value, isLinkActive(editor.value)))
  const isVisible = computed(() => {
    void signal.value
    const instance = editor.value
    if (!instance || !instance.isEditable) return false
    if (!hideWhenUnavailable) return true
    return isMarkInSchema('link', instance) && (!!instance.isActive('code') || canSetLink(instance))
  })

  // null — URL ещё не «захвачен» из активной ссылки.
  const url = ref<string | null>(null)

  watch(
    signal,
    () => {
      const instance = editor.value
      if (!instance) return
      const { href } = instance.getAttributes('link')
      url.value = href || ''
    },
    { immediate: true },
  )

  const setLink = () => {
    const instance = editor.value
    if (!url.value || !instance) return
    const { selection } = instance.state
    const isEmpty = selection.empty
    let chain = instance.chain().focus().extendMarkRange('link').setLink({ href: url.value })
    if (isEmpty) chain = chain.insertContent({ type: 'text', text: url.value })
    chain.run()
    url.value = null
    onSetLink?.()
  }

  const removeLink = () => {
    const instance = editor.value
    if (!instance) return
    instance.chain().focus().extendMarkRange('link').unsetLink().setMeta('preventAutolink', true).run()
    url.value = ''
  }

  const openLink = (target = '_blank', features = 'noopener,noreferrer') => {
    if (!url.value) return
    const safeUrl = sanitizeUrl(url.value, window.location.href)
    if (safeUrl !== '#') window.open(safeUrl, target, features)
  }

  return {
    isVisible,
    canSet,
    isActive,
    url,
    setUrl: (value: string | null) => (url.value = value),
    setLink,
    removeLink,
    openLink,
    label: 'Link',
    Icon: LinkIcon,
  }
}
