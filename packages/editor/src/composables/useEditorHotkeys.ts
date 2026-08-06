import { onBeforeUnmount, onMounted } from 'vue'
import type { ComputedRef } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { createDevelopmentDiagnostics } from '../utils/development-diagnostics'

export type EditorHotkeyShortcut =
  | 'mod+shift+h'
  | 'mod+shift+t'
  | 'mod+shift+i'
  | 'mod+shift+ArrowUp'
  | 'mod+shift+ArrowDown'
  | 'backspace'

export interface EditorHotkeyCommand {
  shortcut: EditorHotkeyShortcut
  isEnabled: () => boolean
  execute: () => boolean
}

const diagnostics = createDevelopmentDiagnostics('useEditorHotkeys')

function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
}

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

function matchesShortcut(event: KeyboardEvent, shortcut: EditorHotkeyShortcut): boolean {
  const key = event.key.toLowerCase()
  const isModPressed = isApplePlatform()
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey

  if (shortcut === 'backspace') {
    return (
      key === 'backspace' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey
    )
  }

  if (!isModPressed || !event.shiftKey || event.altKey) return false

  return (
    (shortcut === 'mod+shift+h' && key === 'h') ||
    (shortcut === 'mod+shift+t' && key === 't') ||
    (shortcut === 'mod+shift+i' && key === 'i') ||
    (shortcut === 'mod+shift+ArrowUp' && key === 'arrowup') ||
    (shortcut === 'mod+shift+ArrowDown' && key === 'arrowdown')
  )
}

function getEditorHost(editor: Editor): HTMLElement {
  const editorElement = editor.view.dom
  return editorElement.closest<HTMLElement>('.notion-like-editor-wrapper') ?? editorElement
}

function isEligibleTarget(event: KeyboardEvent, editor: Editor): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false

  const host = getEditorHost(editor)
  if (!host.contains(target)) return false

  return !(target.isContentEditable && isMobileViewport())
}

function executeCommand(command: EditorHotkeyCommand): boolean {
  try {
    return command.execute()
  } catch {
    return false
  }
}

export function useEditorHotkeys(
  editor: ComputedRef<Editor | null>,
  commands: readonly EditorHotkeyCommand[],
) {
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return

    const instance = editor.value
    if (!instance || !isEligibleTarget(event, instance)) return

    const command = commands.find(
      (candidate) => matchesShortcut(event, candidate.shortcut) && candidate.isEnabled(),
    )
    if (!command) return

    const executed = executeCommand(command)
    diagnostics.debug('shortcut-dispatched', { shortcut: command.shortcut, executed })
    if (executed) event.preventDefault()
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown, true)
    diagnostics.debug('listener-attached', {})
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown, true)
    diagnostics.debug('listener-detached', {})
  })
}
