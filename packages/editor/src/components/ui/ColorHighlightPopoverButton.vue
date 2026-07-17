<template>
  <Button
    type="button"
    variant="ghost"
    data-appearance="default"
    role="button"
    :tabindex="-1"
    aria-label="Highlight text"
    tooltip="Highlight"
  >
    <slot>
      <HighlighterIcon class="tiptap-button-icon" />
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка-триггер вида «Highlighter» в мобильном тулбаре
// (порт ColorHighlightPopoverButton из чанка 3jdxmcvhjtoe-).
import { Button } from '../primitives'
import { HighlighterIcon } from '../../icons'
</script>
