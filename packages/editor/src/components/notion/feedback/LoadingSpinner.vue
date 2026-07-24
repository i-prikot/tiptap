<template>
  <div class="spinner-container">
    <div class="spinner-content">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <div class="spinner-loading-text">{{ resolvedText }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEditorI18n } from '../../../composables'

const props = defineProps<{ text?: string }>()
const { t } = useEditorI18n()
const resolvedText = computed(() => props.text ?? t('common.connecting'))
</script>
