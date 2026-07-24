<template>
  <Menu v-if="items.length" placement="right">
    <template #trigger>
      <MenuItem submenu-trigger>
        <Button variant="ghost">
          <Repeat2Icon class="tiptap-button-icon" />
          <span class="tiptap-button-text">{{ t('toolbar.turnInto') }}</span>
          <Spacer />
          <ChevronRightIcon class="tiptap-button-icon" />
        </Button>
      </MenuItem>
    </template>
    <MenuContent>
      <MenuGroup>
        <MenuGroupLabel>{{ t('toolbar.turnInto') }}</MenuGroupLabel>
        <MenuItem
          v-for="item in items"
          :key="item.label"
          :disabled="item.disabled"
          @select="item.onClick"
        >
          <Button
            variant="ghost"
            :data-active-state="item.isActive ? 'on' : 'off'"
            :disabled="item.disabled"
            :data-disabled="item.disabled"
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
import type { TurnIntoMenuItem } from '../../../types/menu'
import { ChevronRightIcon, Repeat2Icon } from '../../../icons'
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
  items: TurnIntoMenuItem[]
}>()

const { t } = useEditorI18n()
</script>
