<template>
  <Card :style="isMobile ? { boxShadow: 'none', border: 0 } : {}">
    <CardBody :style="isMobile ? { padding: 0 } : {}">
      <CardItemGroup orientation="horizontal">
        <Input
          type="url"
          placeholder="Paste a link..."
          class="tiptap-link-input"
          :value="link.url.value ?? ''"
          autofocus
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          @input="link.setUrl(($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="applyLink"
        />
        <ButtonGroup>
          <Button
            type="button"
            title="Apply link"
            variant="ghost"
            :disabled="!link.url.value && !link.isActive.value"
            @click="applyLink"
          >
            <CornerDownLeftIcon class="tiptap-button-icon" />
          </Button>
        </ButtonGroup>
        <Separator />
        <ButtonGroup orientation="horizontal">
          <Button
            type="button"
            title="Open in new window"
            variant="ghost"
            :disabled="!link.url.value && !link.isActive.value"
            @click="link.openLink()"
          >
            <ExternalLinkIcon class="tiptap-button-icon" />
          </Button>
          <Button
            type="button"
            title="Remove link"
            variant="ghost"
            :disabled="!link.url.value && !link.isActive.value"
            @click="link.removeLink()"
          >
            <TrashIcon class="tiptap-button-icon" />
          </Button>
        </ButtonGroup>
      </CardItemGroup>
    </CardBody>
  </Card>
</template>

<script setup lang="ts">
/**
 * Панель редактирования ссылки: URL-инпут + apply/open/remove.
 * Порт LinkContent (LinkMain) из чанка 1mpndbcfk3lik.
 */
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import Card from '../primitives/card/Card.vue'
import CardBody from '../primitives/card/CardBody.vue'
import CardItemGroup from '../primitives/card/CardItemGroup.vue'
import ButtonGroup from '../primitives/ButtonGroup.vue'
import Button from '../primitives/Button.vue'
import Separator from '../primitives/Separator.vue'
import Input from '../primitives/input/Input.vue'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useLinkPopover } from '../../composables/useLinkPopover'
import { useIsBreakpoint } from '../../composables/useIsBreakpoint'
import { CornerDownLeftIcon, ExternalLinkIcon, TrashIcon } from '../../icons'

const props = defineProps<{ editor?: Editor | null }>()
const emit = defineEmits<{ setLink: [] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const link = useLinkPopover({ editor, onSetLink: () => emit('setLink') })
const isMobile = useIsBreakpoint()

function applyLink() {
  link.setLink()
}
</script>
