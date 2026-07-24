<template>
  <Menu v-if="canShow" placement="right">
    <template #trigger>
      <MenuItem submenu-trigger>
        <Button variant="ghost">
          <PaintBucketIcon class="tiptap-button-icon" />
          <span class="tiptap-button-text">{{ resolvedLabel }}</span>
          <Spacer />
          <ChevronRightIcon class="tiptap-button-icon" />
        </Button>
      </MenuItem>
    </template>
    <MenuContent>
      <div class="tiptap-combobox-list">
        <MenuGroup v-if="isInitialized && recentColors.length">
          <MenuGroupLabel>{{ t('colors.recentColors') }}</MenuGroupLabel>
          <MenuItem
            v-for="recent in recentItems"
            :key="`recent-${recent.type}-${recent.value}`"
            @select="recent.apply"
          >
            <Button variant="ghost" :data-active-state="recent.isActive ? 'on' : 'off'">
              <span
                v-if="recent.type === 'text'"
                class="tiptap-button-color-text"
                :style="{ color: recent.value }"
              >
                <TextColorSmallIcon
                  class="tiptap-button-icon"
                  :style="{ color: recent.value, flexGrow: 1 }"
                />
              </span>
              <span
                v-else
                class="tiptap-button-highlight"
                :style="{ '--highlight-color': recent.value }"
              />
              <span class="tiptap-button-text">{{ recent.label }}</span>
            </Button>
          </MenuItem>
          <Separator orientation="horizontal" />
        </MenuGroup>
        <MenuGroup>
          <MenuGroupLabel>{{ t('colors.textColor') }}</MenuGroupLabel>
          <MenuItem v-for="item in textItems" :key="item.value" @select="item.apply">
            <Button variant="ghost" :data-active-state="item.isActive ? 'on' : 'off'">
              <span class="tiptap-button-color-text" :style="{ color: item.value }">
                <TextColorSmallIcon
                  class="tiptap-button-icon"
                  :style="{ color: item.value, flexGrow: 1 }"
                />
              </span>
              <span class="tiptap-button-text">{{ item.label }}</span>
            </Button>
          </MenuItem>
        </MenuGroup>
        <Separator orientation="horizontal" />
        <MenuGroup>
          <MenuGroupLabel>{{ t('colors.backgroundColor') }}</MenuGroupLabel>
          <MenuItem v-for="item in backgroundItems" :key="item.value" @select="item.apply">
            <Button variant="ghost" :data-active-state="item.isActive ? 'on' : 'off'">
              <span class="tiptap-button-highlight" :style="{ '--highlight-color': item.value }" />
              <span class="tiptap-button-text">{{ item.label }}</span>
            </Button>
          </MenuItem>
        </MenuGroup>
      </div>
    </MenuContent>
  </Menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  Button,
  Spacer,
  Separator,
} from '../../primitives'
import { useColorMenu, useEditorI18n, useTiptapEditor } from '../../../composables'
import { ChevronRightIcon, PaintBucketIcon, TextColorSmallIcon } from '../../../icons'

const props = defineProps<{ editor?: Editor | null; label?: string }>()
const editor = useTiptapEditor(computed(() => props.editor))
const { t } = useEditorI18n()
const resolvedLabel = computed(() => props.label ?? t('colors.menu'))
const { canShow, isInitialized, recentColors, recentItems, textItems, backgroundItems } =
  useColorMenu(editor, t)
</script>
