<template>
  <div v-if="editor" :style="{ '--drag-handle-main-axis-offset': '16px' }">
    <DragHandle
      :editor="editor"
      :compute-position-config="computePositionConfig"
      :on-node-change="handleNodeChange"
      :on-element-drag-start="handleDragStart"
      :on-element-drag-end="handleDragEnd"
    >
      <div style="display: flex; flex-direction: row" :style="handleVisibilityStyle">
        <SlashCommandTriggerButton
          v-if="withSlashCommandTrigger"
          :node="currentNode"
          :node-pos="currentNodePos"
          data-weight="small"
        />
        <Menu v-model:open="menuOpen" placement="left">
          <template #trigger>
            <Button
              variant="ghost"
              :tabindex="-1"
              data-weight="small"
              :style="{ cursor: 'grab', ...(menuOpen ? { pointerEvents: 'none' } : {}) }"
              tooltip="Click for options"
              @mousedown="handleGripMouseDown"
            >
              <GripVerticalIcon class="tiptap-button-icon" />
            </Button>
          </template>
          <MenuContent @close="handleMenuClose">
            <div class="tiptap-combobox-list" :style="{ minWidth: '15rem' }">
              <MenuGroupLabel>{{ nodeDisplayName }}</MenuGroupLabel>
              <MenuGroup>
                <MenuItem
                  v-for="item in preSubmenuNodeActionItems"
                  :key="item.label"
                  @select="item.onClick"
                >
                  <Button variant="ghost" :data-active-state="item.isActive ? 'on' : 'off'">
                    <component :is="item.icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ item.label }}</span>
                  </Button>
                </MenuItem>

                <DragContextMenuTurnInto :items="turnIntoItems" />
                <ColorMenu />
                <TableAlignMenu />

                <MenuItem
                  v-for="item in postSubmenuNodeActionItems"
                  :key="item.label"
                  @select="item.onClick"
                >
                  <Button variant="ghost" :data-active-state="item.isActive ? 'on' : 'off'">
                    <component :is="item.icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ item.label }}</span>
                  </Button>
                </MenuItem>
              </MenuGroup>

              <Separator orientation="horizontal" />
              <MenuGroup>
                <MenuItem
                  v-for="item in clipboardItems"
                  :key="item.label"
                  :disabled="item.disabled"
                  @select="item.onClick"
                >
                  <Button variant="ghost" :disabled="item.disabled">
                    <component :is="item.icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ item.label }}</span>
                    <Spacer />
                    <Badge>{{ item.shortcut }}</Badge>
                  </Button>
                </MenuItem>
              </MenuGroup>
              <Separator orientation="horizontal" />

              <MenuGroup>
                <MenuItem :disabled="deleteItem.disabled" @select="deleteItem.onClick">
                  <Button variant="ghost" :disabled="deleteItem.disabled">
                    <component :is="deleteItem.icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ deleteItem.label }}</span>
                    <Spacer />
                    <Badge>{{ deleteItem.shortcut }}</Badge>
                  </Button>
                </MenuItem>
              </MenuGroup>
            </div>
          </MenuContent>
        </Menu>
      </div>
    </DragHandle>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { offset } from '@floating-ui/dom'
import { DragHandle } from '@tiptap/extension-drag-handle-vue-3'
import {
  useDragContextMenuItems,
  useEditorSelectionSignal,
  useIsBreakpoint,
  useTiptapEditor,
  useUiEditorState,
} from '../../../composables'
import { getNodeDisplayName, isTextSelectionValid } from '../../../utils/selection-utils'
import { selectNodeAndHideFloating } from '../../../utils/toc-utils'
import { GripVerticalIcon } from '../../../icons'
import {
  Badge,
  Button,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  Separator,
  Spacer,
} from '../../primitives'

import { ColorMenu } from '../color'
import DragContextMenuTurnInto from './DragContextMenuTurnInto.vue'
import { SlashCommandTriggerButton } from '../slash-menu'
import { TableAlignMenu } from '../../table'

const props = withDefaults(
  defineProps<{
    withSlashCommandTrigger?: boolean
    mobileBreakpoint?: number
    aiEnabled?: boolean
  }>(),
  {
    withSlashCommandTrigger: true,
    mobileBreakpoint: 768,
    aiEnabled: false,
  },
)

const editor = useTiptapEditor()
const uiState = useUiEditorState(editor)
const isMobile = useIsBreakpoint('max', props.mobileBreakpoint)
const selectionSignal = useEditorSelectionSignal(editor)
const {
  clipboardItems,
  deleteItem,
  postSubmenuNodeActionItems,
  preSubmenuNodeActionItems,
  turnIntoItems,
} = useDragContextMenuItems(editor)

const menuOpen = ref(false)
const currentNode = shallowRef<ProseMirrorNode | null>(null)
const currentNodePos = ref(-1)

watch(menuOpen, (isOpen) => {
  const instance = editor.value
  if (!instance) return
  instance.commands.setLockDragHandle(isOpen)
  instance.commands.setMeta('lockDragHandle', isOpen)
})

function handleNodeChange(data: { node: ProseMirrorNode | null; pos: number }) {
  if (data.node) currentNode.value = data.node
  currentNodePos.value = data.pos
}

const computePositionConfig = {
  middleware: [
    offset(({ rects }) => {
      const referenceHeight = rects.reference.height
      const floatingHeight = rects.floating.height
      return {
        mainAxis: 16,
        crossAxis: referenceHeight > 40 ? 0 : referenceHeight / 2 - floatingHeight / 2,
      }
    }),
  ],
}

function handleDragStart() {
  editor.value?.commands.setIsDragging(true)
}

function handleDragEnd() {
  const instance = editor.value
  if (!instance) return
  instance.commands.setIsDragging(false)
  setTimeout(() => {
    ;(instance.view.dom as HTMLElement).blur()
    instance.view.focus()
  }, 0)
}

function handleMenuClose() {
  editor.value?.commands.setMeta('hideDragHandle', true)
}

function handleGripMouseDown() {
  const instance = editor.value
  if (instance) selectNodeAndHideFloating(instance, currentNodePos.value)
}

const handleVisibilityStyle = computed<CSSProperties>(() => {
  void selectionSignal.value
  const instance = editor.value
  const hidden =
    (props.aiEnabled && uiState.aiGenerationActive) ||
    isMobile.value ||
    (instance && isTextSelectionValid(instance))
  return {
    ...(hidden ? { opacity: 0, pointerEvents: 'none' } : {}),
    ...(uiState.isDragging ? { opacity: 0 } : {}),
  }
})

const nodeDisplayName = computed(() => (selectionSignal.value, getNodeDisplayName(editor.value)))
</script>
