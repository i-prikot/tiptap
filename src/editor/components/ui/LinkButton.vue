<template>
  <Button
    type="button"
    variant="ghost"
    role="button"
    :tabindex="-1"
    aria-label="Link"
    tooltip="Link"
  >
    <slot>
      <LinkIcon class="tiptap-button-icon" />
    </slot>
  </Button>
</template>

<script setup lang="ts">
// Кнопка-триггер ссылки (порт LinkButton из чанка 1mpndbcfk3lik).
import Button from '../primitives/Button.vue'
import { LinkIcon } from '../../icons'
</script>
