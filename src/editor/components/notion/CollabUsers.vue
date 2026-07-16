<template>
  <DropdownMenu v-if="users.length">
    <DropdownMenuTrigger>
      <Button variant="ghost" data-appearence="subdued" style="padding: 0.25rem">
        <AvatarGroup :max-visible="3">
          <Avatar v-for="user in users" :key="user.id" :user-color="user.color">
            <AvatarImage :src="getAvatar(user.name)" />
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
 * Порт CollabUsers из чанка 3xpmbr0kqzhen.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useTiptapEditor } from '@/editor/composables'
import { getAvatar } from '../../utils/user-utils'
import type { CaretUser } from '../../types/user'
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
} from '@/editor/components/primitives'

const props = defineProps<{ editor?: Editor | null }>()
const editor = useTiptapEditor(computed(() => props.editor))
const users = ref<CaretUser[]>([])

function readUsers() {
  const instance = editor.value
  const caretStorage = instance?.storage.collaborationCaret as
    { users?: Array<Record<string, unknown>> } | undefined
  if (!instance || !caretStorage) {
    users.value = []
    return
  }
  users.value = (caretStorage.users ?? []).map((user) => ({
    clientId: user.clientId as number,
    id: String(user.clientId),
    name: (user.name as string) || 'Anonymous',
    color: (user.color as string) || '#000000',
  }))
}

let unsubscribe: (() => void) | null = null
watch(
  editor,
  (instance) => {
    unsubscribe?.()
    unsubscribe = null
    readUsers()
    if (!instance) return
    const handler = () => readUsers()
    instance.on('transaction', handler)
    unsubscribe = () => instance.off('transaction', handler)
  },
  { immediate: true },
)
onBeforeUnmount(() => unsubscribe?.())
</script>
