<template>
  <main class="tinyfy-editor" :class="{ dark: isDarkMode }">
    <div ref="hostOverlayTarget" data-tiptap-overlay-root=""></div>
    <NotionEditorHeader
      :editor="editor"
      :is-dark-mode="isDarkMode"
      :locale="editorLocale"
      @toggle-theme="toggleTheme"
      @update-locale="handleLocaleChange"
    />
    <NotionEditor
      :key="editorSessionKey"
      :document-id="documentId"
      :base-url="baseUrl"
      :current-anchor="currentAnchor"
      :features="{ tocSidebar: true }"
      :toc-sidebar-sticky-top-offset="130"
      :image-upload="imageUpload"
      :collaboration="collaboration"
      :ai="ai"
      :locale="editorLocale"
      :development-diagnostics="isDevelopment"
      @ready="handleReady"
      @anchor-change="handleAnchorChange"
    />
    <CtaPopup />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { Editor as CoreEditor } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import NotionEditor, {
  provideEditorOverlayTarget,
  defaultEditorLocale,
  type AiOptions,
  type CollaborationOptions,
  type EditorLocale,
  type ImageUploadAdapter,
} from '@i-prikot/editor'
import NotionEditorHeader from './components/NotionEditorHeader.vue'
import CtaPopup from './components/CtaPopup.vue'
import { useDemoDocumentSeed } from './composables/useDemoDocumentSeed'
import { getDocumentId } from './utils/document-id'

const isDevelopment = import.meta.env.DEV
const collaborationAppId = import.meta.env.VITE_TIPTAP_COLLAB_APP_ID
const aiAppId = import.meta.env.VITE_TIPTAP_AI_APP_ID
const PLAYGROUND_EDITOR_LOCALE_STORAGE_KEY = 'i-prikot.playground.editor-locale'

function isSupportedEditorLocale(locale: unknown): locale is 'en' | 'ru' {
  return locale === 'en' || locale === 'ru'
}

function getStoredEditorLocale(): EditorLocale {
  try {
    const storedLocale = window.localStorage.getItem(PLAYGROUND_EDITOR_LOCALE_STORAGE_KEY)
    return isSupportedEditorLocale(storedLocale) ? storedLocale : defaultEditorLocale
  } catch {
    return defaultEditorLocale
  }
}

function getBaseUrlFromLocation(): string {
  return window.location.href
}

function getAnchorFromLocation(): string | undefined {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return undefined

  try {
    return decodeURIComponent(hash)
  } catch {
    return hash
  }
}

function getCollaborationOptions(): CollaborationOptions | undefined {
  const collaborationDisabled = new URLSearchParams(window.location.search).get('noCollab') === '1'
  if (!collaborationAppId || collaborationDisabled) return undefined

  return {
    appId: collaborationAppId,
    tokenUrl: import.meta.env.VITE_TIPTAP_COLLAB_TOKEN_URL || undefined,
    token: isDevelopment ? import.meta.env.VITE_TIPTAP_COLLAB_TOKEN || undefined : undefined,
    documentNamePrefix: import.meta.env.VITE_TIPTAP_COLLAB_DOC_PREFIX || undefined,
  }
}

const documentId = ref(getDocumentId())
const { initializeDemoDocumentSeed, cleanupDemoDocumentSeed } = useDemoDocumentSeed(documentId)
const baseUrl = ref(getBaseUrlFromLocation())
const currentAnchor = ref(getAnchorFromLocation())
const collaboration = shallowRef<CollaborationOptions | undefined>(getCollaborationOptions())
const editorSessionKey = ref(0)
const editorLocale = ref<EditorLocale>(getStoredEditorLocale())
const ai: AiOptions | undefined = aiAppId
  ? {
      appId: aiAppId,
      tokenUrl: import.meta.env.VITE_TIPTAP_AI_TOKEN_URL || undefined,
    }
  : undefined
const PLAYGROUND_IMAGE_UPLOAD_DELAY_MS = 500
const PLAYGROUND_IMAGE_URL = '/images/tiptap-ui-placeholder-image.jpg'
const imageUpload: ImageUploadAdapter = async (_file, { onProgress, abortSignal }) => {
  for (let progress = 0; progress <= 100; progress += 10) {
    if (abortSignal.aborted) throw new Error('Upload cancelled')
    await new Promise((resolve) => setTimeout(resolve, PLAYGROUND_IMAGE_UPLOAD_DELAY_MS))
    if (abortSignal.aborted) throw new Error('Upload cancelled')
    onProgress({ progress })
  }

  if (abortSignal.aborted) throw new Error('Upload cancelled')
  return PLAYGROUND_IMAGE_URL
}
const editor = shallowRef<Editor | null>(null)
const isDarkMode = ref(false)
const hostOverlayTarget = shallowRef<HTMLElement | null>(null)
provideEditorOverlayTarget(hostOverlayTarget)
const hasThemeOverride = ref(false)

let mediaQuery: MediaQueryList | null = null

function handleSystemThemeChange(event: MediaQueryListEvent) {
  if (!hasThemeOverride.value) isDarkMode.value = event.matches
}

function toggleTheme() {
  hasThemeOverride.value = true
  isDarkMode.value = !isDarkMode.value
}

function handleLocaleChange(locale: EditorLocale) {
  if (!isSupportedEditorLocale(locale)) return

  editorLocale.value = locale

  try {
    window.localStorage.setItem(PLAYGROUND_EDITOR_LOCALE_STORAGE_KEY, locale)
  } catch {
    return
  }
}

async function handleReady(instance: CoreEditor) {
  cleanupDemoDocumentSeed()
  editor.value = instance as Editor
  await initializeDemoDocumentSeed(instance)
}

function syncUrlContext() {
  const nextDocumentId = getDocumentId()
  const nextCollaboration = getCollaborationOptions()
  const shouldRecreateEditor =
    nextDocumentId !== documentId.value ||
    Boolean(nextCollaboration) !== Boolean(collaboration.value)

  documentId.value = nextDocumentId
  baseUrl.value = getBaseUrlFromLocation()
  currentAnchor.value = getAnchorFromLocation()
  collaboration.value = nextCollaboration

  if (shouldRecreateEditor) {
    cleanupDemoDocumentSeed()
    editorSessionKey.value += 1
  }
}

function handleAnchorChange(anchor: string) {
  const url = new URL(window.location.href)
  url.hash = anchor
  window.history.replaceState(null, '', url.toString())
  baseUrl.value = url.toString()
  currentAnchor.value = anchor
}

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  isDarkMode.value = mediaQuery.matches
  mediaQuery.addEventListener('change', handleSystemThemeChange)
  window.addEventListener('hashchange', syncUrlContext)
  window.addEventListener('pageshow', syncUrlContext)
  window.addEventListener('popstate', syncUrlContext)
})

onBeforeUnmount(() => {
  cleanupDemoDocumentSeed()
  mediaQuery?.removeEventListener('change', handleSystemThemeChange)
  mediaQuery = null
  window.removeEventListener('hashchange', syncUrlContext)
  window.removeEventListener('pageshow', syncUrlContext)
  window.removeEventListener('popstate', syncUrlContext)
  editor.value = null
})
</script>
