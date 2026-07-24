<template>
  <Button
    type="button"
    variant="ghost"
    data-appearance="default"
    role="button"
    :tabindex="-1"
    :aria-label="t('colors.highlightText')"
    :tooltip="t('colors.highlight')"
  >
    <slot>
      <HighlighterIcon class="tiptap-button-icon" />
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка-триггер вида «Highlighter» в мобильном тулбаре
import { Button } from '../../primitives'
import { HighlighterIcon } from '../../../icons'
import { useEditorI18n } from '../../../composables'

const { t } = useEditorI18n()
</script>
