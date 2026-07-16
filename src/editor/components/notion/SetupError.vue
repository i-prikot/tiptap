<template>
  <div class="tiptap-setup-error" role="alert" aria-live="assertive">
    <div class="tiptap-setup-error__container">
      <div class="tiptap-setup-error__content">
        <h2 class="tiptap-setup-error__title">Cloud Configuration Required</h2>
        <p class="tiptap-setup-error__message">
          Provide valid cloud configuration to the NotionEditor component.
        </p>
        <div class="tiptap-setup-error__variables">
          <ul class="tiptap-setup-error__variables-list">
            <li
              v-for="variable in variables"
              :key="variable.name"
              class="tiptap-setup-error__variable"
            >
              <code class="tiptap-setup-error__variable-name">{{ variable.name }}</code>
              <span class="tiptap-setup-error__variable-description">{{
                variable.description
              }}</span>
            </li>
          </ul>
        </div>
        <div class="tiptap-setup-error__actions">
          <Button data-style="primary" class="tiptap-setup-error__button" @click="openSetupGuide">
            <span class="tiptap-button-text">View Setup Guide</span>
            <svg
              class="tiptap-button-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 3C13.4477 3 13 3.44772 13 4C13 4.55228 13.4477 5 14 5H17.5858L9.29289 13.2929C8.90237 13.6834 8.90237 14.3166 9.29289 14.7071C9.68342 15.0976 10.3166 15.0976 10.7071 14.7071L19 6.41421V10C19 10.5523 19.4477 11 20 11C20.5523 11 21 10.5523 21 10V4C21 3.44772 20.5523 3 20 3H14Z"
                fill="currentColor"
              />
              <path
                d="M5 6C3.89543 6 3 6.89543 3 8V19C3 20.1046 3.89543 21 5 21H16C17.1046 21 18 20.1046 18 19V14C18 13.4477 17.5523 13 17 13C16.4477 13 16 13.4477 16 14V19H5V8H10C10.5523 8 11 7.55228 11 7C11 6.44772 10.5523 6 10 6H5Z"
                fill="currentColor"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Экран ошибки настройки Tiptap Cloud.
 * Порт SetupError из чанка 3xpmbr0kqzhen; подсказки отражают публичные
 * поля конфигурации редактора.
 */
import { computed } from 'vue'
import { Button } from '@/editor/components/primitives'

const props = defineProps<{
  collabSetupError?: boolean
  aiSetupError?: boolean
}>()

const variables = computed(() => {
  const list: Array<{ name: string; description: string }> = []
  if (props.collabSetupError) {
    list.push(
      {
        name: 'collaboration.appId',
        description: 'Your Document Server App ID',
      },
      {
        name: 'collaboration.token or collaboration.tokenUrl',
        description: 'A static development token or endpoint for short-lived collaboration tokens',
      },
    )
  }
  if (props.aiSetupError) {
    list.push(
      { name: 'ai.appId', description: 'Your AI App ID' },
      {
        name: 'ai.token or ai.tokenUrl',
        description: 'A static development token or endpoint for short-lived AI tokens',
      },
    )
  }
  return list
})

function openSetupGuide() {
  window.open('https://tiptap.dev/docs/ui-components/templates/notion-like-editor', '_blank')
}
</script>
