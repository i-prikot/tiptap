<template>
  <Menu v-if="items.length" placement="right">
    <template #trigger>
      <MenuItem submenu-trigger>
        <Button variant="ghost">
          <TypeIcon class="tiptap-button-icon" />
          <span class="tiptap-button-text">{{ t('toolbar.blockRole') }}</span>
          <Spacer />
          <ChevronRightIcon class="tiptap-button-icon" />
        </Button>
      </MenuItem>
    </template>
    <MenuContent>
      <MenuGroup>
        <MenuGroupLabel>{{ t('toolbar.blockRole') }}</MenuGroupLabel>
        <MenuItem
          v-for="item in items"
          :key="item.value"
          :disabled="item.disabled"
          @select="item.onClick"
        >
          <Button
            variant="ghost"
            :disabled="item.disabled"
            :data-active-state="item.isActive ? 'on' : 'off'"
          >
            <component :is="item.icon" class="tiptap-button-icon" />
            <span class="tiptap-button-text">{{ item.label }}</span>
          </Button>
        </MenuItem>
      </MenuGroup>
    </MenuContent>
  </Menu>
</template>

<script setup lang="ts">
import type { BlockRoleOption } from '@i-prikot/editor-schema'
import type { EditorMenuActionItem } from '../../../types/menu'
import { ChevronRightIcon, TypeIcon } from '../../../icons'
import { useEditorI18n } from '../../../composables'
import {
  Button,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  Spacer,
} from '../../primitives'

defineProps<{
  items: Array<
    EditorMenuActionItem & {
      isActive: boolean
      value: BlockRoleOption['value']
    }
  >
}>()

const { t } = useEditorI18n()
</script>
