<template>
  <Button
    type="button"
    variant="ghost"
    role="button"
    :tabindex="-1"
    :aria-label="t('links.link')"
    :tooltip="t('links.link')"
  >
    <slot>
      <LinkIcon class="tiptap-button-icon" />
    </slot>
  </Button>
</template>

<script setup lang="ts">
import { Button } from '../../primitives'
import { LinkIcon } from '../../../icons'
import { useEditorI18n } from '../../../composables'

const { t } = useEditorI18n()
</script>
