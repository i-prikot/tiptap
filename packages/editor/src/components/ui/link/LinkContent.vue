<template>
  <Card :style="isMobile ? { boxShadow: 'none', border: 0 } : {}">
    <CardBody :style="isMobile ? { padding: 0 } : {}">
      <CardItemGroup orientation="horizontal">
        <Input
          type="url"
          :placeholder="t('links.placeholder')"
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
            :title="t('links.apply')"
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
            :title="t('links.openInNewWindow')"
            variant="ghost"
            :disabled="!link.url.value && !link.isActive.value"
            @click="link.openLink()"
          >
            <ExternalLinkIcon class="tiptap-button-icon" />
          </Button>
          <Button
            type="button"
            :title="t('links.remove')"
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
import {
  Card,
  CardBody,
  CardItemGroup,
  ButtonGroup,
  Button,
  Separator,
  Input,
} from '../../primitives'

import {
  useEditorI18n,
  useTiptapEditor,
  useLinkPopover,
  useIsBreakpoint,
} from '../../../composables'

import { CornerDownLeftIcon, ExternalLinkIcon, TrashIcon } from '../../../icons'

const props = defineProps<{ editor?: Editor | null }>()
const emit = defineEmits<{ setLink: [] }>()

const editor = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()
const link = useLinkPopover({ editor, onSetLink: () => emit('setLink') })
const isMobile = useIsBreakpoint()

function applyLink() {
  link.setLink()
}
</script>
