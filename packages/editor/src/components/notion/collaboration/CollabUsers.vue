<template>
  <DropdownMenu v-if="users.length">
    <DropdownMenuTrigger>
      <Button
        variant="ghost"
        data-appearence="subdued"
        style="padding: 0.25rem"
        :aria-label="collaboratorCountLabel"
      >
        <AvatarGroup :max-visible="3" :hidden-label="additionalCollaboratorCountLabel">
          <Avatar v-for="user in users" :key="user.id" :user-color="user.color">
            <AvatarImage
              :alt="t('common.avatarLabel', { name: user.name })"
              :src="getAvatar(user.name)"
            />
            <AvatarFallback>{{ user.name?.toUpperCase()[0] }}</AvatarFallback>
          </Avatar>
        </AvatarGroup>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuGroup>
        <DropdownMenuItem v-for="user in users" :key="user.id">
          <Button variant="ghost">
            <Avatar :user-color="user.color">
              <AvatarImage :src="getAvatar(user.name)" />
              <AvatarFallback>{{ user.name?.toUpperCase()[0] }}</AvatarFallback>
            </Avatar>
            <span class="tiptap-button-text">{{ user.name }}</span>
          </Button>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
/**
 * Аватары участников коллаборации в хедере: рендерится только при
 * активном collaborationCaret (в оффлайн-режиме — ничего).
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useEditorI18n, useTiptapEditor } from '../../../composables'
import { createDevelopmentDiagnostics } from '../../../utils/development-diagnostics'
import { getAvatar } from '../../../utils/user-utils'
import type { CaretUser } from '../../../types/user'
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../primitives'

const props = defineProps<{ editor?: Editor | null }>()
const editor = useTiptapEditor(computed(() => props.editor))
const { t, tPlural } = useEditorI18n()
const anonymousLabel = computed(() => t('common.anonymous'))
const users = ref<CaretUser[]>([])
const diagnostics = createDevelopmentDiagnostics('CollabUsers')
const collaboratorCountLabel = computed(() =>
  tPlural('common.collaboratorCount', users.value.length),
)
const additionalCollaboratorCountLabel = computed(() =>
  tPlural('common.additionalCollaboratorCount', Math.max(users.value.length - 3, 0)),
)

function areUsersEqual(previous: CaretUser[], next: CaretUser[]): boolean {
  return (
    previous.length === next.length &&
    previous.every(
      (user, index) =>
        user.id === next[index]?.id &&
        user.name === next[index]?.name &&
        user.color === next[index]?.color,
    )
  )
}

function readUsers(instance: Editor | null) {
  const caretStorage = instance?.storage.collaborationCaret as
    { users?: Array<Record<string, unknown>> } | undefined
  const nextUsers =
    !instance || !caretStorage
      ? []
      : (caretStorage.users ?? []).map((user) => ({
          clientId: user.clientId as number,
          id: String(user.clientId),
          name: (user.name as string) || anonymousLabel.value,
          color: (user.color as string) || '#000000',
        }))

  if (!areUsersEqual(users.value, nextUsers)) users.value = nextUsers
}

let unsubscribe: (() => void) | null = null
watch(
  [editor, anonymousLabel],
  ([instance]) => {
    unsubscribe?.()
    unsubscribe = null
    readUsers(instance)
    if (!instance) return
    const handler = () => readUsers(instance)
    instance.on('transaction', handler)
    unsubscribe = () => {
      instance.off('transaction', handler)
      diagnostics.debug('transaction subscription removed')
    }
    diagnostics.debug('transaction subscription added')
  },
  { immediate: true },
)
onBeforeUnmount(() => unsubscribe?.())
</script>
