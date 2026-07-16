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
                <!-- Show title (только для tocNode) -->
                <MenuItem v-if="tocShowTitle.canToggle.value" @select="tocShowTitle.handleToggle">
                  <Button
                    variant="ghost"
                    :data-active-state="tocShowTitle.isActive.value ? 'on' : 'off'"
                  >
                    <component :is="tocShowTitle.Icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ tocShowTitle.label }}</span>
                  </Button>
                </MenuItem>

                <!-- Таблица: fit to width -->
                <MenuItem
                  v-if="tableFitToWidth.canFitToWidth.value"
                  @select="tableFitToWidth.handleFitToWidth"
                >
                  <Button variant="ghost" data-active-state="off">
                    <component :is="tableFitToWidth.Icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ tableFitToWidth.label }}</span>
                  </Button>
                </MenuItem>

                <!-- Таблица: очистить всё содержимое -->
                <MenuItem
                  v-if="tableClearAllContents.canClearAll.value"
                  @select="tableClearAllContents.handleClearAll"
                >
                  <Button variant="ghost" data-active-state="off">
                    <component :is="tableClearAllContents.Icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ tableClearAllContents.label }}</span>
                  </Button>
                </MenuItem>

                <!-- Turn into -->
                <Menu v-if="turnIntoItems.length" placement="right">
                  <template #trigger>
                    <MenuItem submenu-trigger>
                      <Button variant="ghost">
                        <Repeat2Icon class="tiptap-button-icon" />
                        <span class="tiptap-button-text">Turn Into</span>
                        <Spacer />
                        <ChevronRightIcon class="tiptap-button-icon" />
                      </Button>
                    </MenuItem>
                  </template>
                  <MenuContent>
                    <MenuGroup>
                      <MenuGroupLabel>Turn into</MenuGroupLabel>
                      <MenuItem
                        v-for="item in turnIntoItems"
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

                <!-- Color (текст + фон блока) -->
                <ColorMenu />

                <!-- Alignment (ячейки таблицы) -->
                <TableAlignMenu />

                <!-- Reset formatting -->
                <MenuItem
                  v-if="resetFormatting.canReset.value"
                  @select="resetFormatting.handleResetFormatting"
                >
                  <Button variant="ghost" data-active-state="off">
                    <component :is="resetFormatting.Icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ resetFormatting.label }}</span>
                  </Button>
                </MenuItem>

                <!-- Download image (только для image) -->
                <MenuItem
                  v-if="imageDownload.canDownload.value"
                  @select="imageDownload.handleDownload"
                >
                  <Button variant="ghost" data-active-state="off">
                    <component :is="imageDownload.Icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ imageDownload.label }}</span>
                  </Button>
                </MenuItem>
              </MenuGroup>

              <Separator orientation="horizontal" />
              <MenuGroup>
                <MenuItem
                  :disabled="!duplicate.canDuplicate.value"
                  @select="duplicate.handleDuplicate"
                >
                  <Button variant="ghost" :disabled="!duplicate.canDuplicate.value">
                    <component :is="duplicate.Icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ duplicate.label }}</span>
                    <Spacer />
                    <Badge>{{ formatShortcut(duplicate.shortcutKeys) }}</Badge>
                  </Button>
                </MenuItem>
                <MenuItem
                  :disabled="!copyToClipboard.canCopyToClipboard.value"
                  @select="copyToClipboard.handleCopyToClipboard"
                >
                  <Button variant="ghost" :disabled="!copyToClipboard.canCopyToClipboard.value">
                    <component :is="copyToClipboard.Icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ copyToClipboard.label }}</span>
                    <Spacer />
                    <Badge>{{ formatShortcut(copyToClipboard.shortcutKeys) }}</Badge>
                  </Button>
                </MenuItem>
                <MenuItem
                  :disabled="!copyAnchorLink.canCopyAnchorLink.value"
                  @select="copyAnchorLink.handleCopyAnchorLink"
                >
                  <Button variant="ghost" :disabled="!copyAnchorLink.canCopyAnchorLink.value">
                    <component :is="copyAnchorLink.Icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ copyAnchorLink.label }}</span>
                    <Spacer />
                    <Badge>{{ formatShortcut(copyAnchorLink.shortcutKeys) }}</Badge>
                  </Button>
                </MenuItem>
              </MenuGroup>
              <Separator orientation="horizontal" />

              <MenuGroup>
                <MenuItem
                  :disabled="!deleteNode.canDeleteNode.value"
                  @select="deleteNode.handleDeleteNode"
                >
                  <Button variant="ghost" :disabled="!deleteNode.canDeleteNode.value">
                    <component :is="deleteNode.Icon" class="tiptap-button-icon" />
                    <span class="tiptap-button-text">{{ deleteNode.label }}</span>
                    <Spacer />
                    <Badge>{{ formatShortcut(deleteNode.shortcutKeys) }}</Badge>
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
/**
 * Контекстное меню блока на drag-handle: «+» (слэш-команда) и грип-кнопка
 * с меню (Turn into, Reset formatting, Duplicate/Copy/Anchor, Delete,
 * узкоспециальные пункты для toc/table/image).
 * Порт DragContextMenu из чанка 1_-l0xapy_wlh (модуль 549337).
 *
 * Отличие: AI-пункт скрыт без расширения `ai`
 * (как в оригинале через useAiAsk → canAiAsk=false).
 */
import { computed, ref, shallowRef, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { TurnIntoMenuItem } from '../../types/menu'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { offset } from '@floating-ui/dom'
import { DragHandle } from '@tiptap/extension-drag-handle-vue-3'
import {
  useTiptapEditor,
  useUiEditorState,
  useIsBreakpoint,
  useEditorSelectionSignal,
  useBlockquoteBlock,
  useCodeBlockBlock,
  useHeadingBlock,
  useListBlock,
  useTextBlock,
  useCopyAnchorLink,
  useCopyToClipboard,
  useDeleteNode,
  useDuplicate,
  useImageDownload,
  useResetAllFormatting,
  useTableClearAllContents,
  useTableFitToWidth,
  useTocShowTitle,
} from '@/editor/composables'

import { getNodeDisplayName, isTextSelectionValid } from '../../utils/selection-utils'
import { parseShortcutKeys } from '../../utils/tiptap-utils'
import { selectNodeAndHideFloating } from '../../utils/toc-utils'
import { ChevronRightIcon, GripVerticalIcon, Repeat2Icon } from '../../icons'
import {
  Button,
  Badge,
  Separator,
  Spacer,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
} from '@/editor/components/primitives'

import SlashCommandTriggerButton from './SlashCommandTriggerButton.vue'
import ColorMenu from './ColorMenu.vue'
import TableAlignMenu from './TableAlignMenu.vue'

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

const menuOpen = ref(false)
const currentNode = shallowRef<ProseMirrorNode | null>(null)
const currentNodePos = ref(-1)

// пока меню открыто — ручка заморожена
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

// Turn into: собирается из block-conversion composables
const textBlock = useTextBlock(editor)
const heading1 = useHeadingBlock(editor, 1)
const heading2 = useHeadingBlock(editor, 2)
const heading3 = useHeadingBlock(editor, 3)
const bulletList = useListBlock(editor, 'bulletList')
const orderedList = useListBlock(editor, 'orderedList')
const taskList = useListBlock(editor, 'taskList')
const blockquote = useBlockquoteBlock(editor)
const codeBlock = useCodeBlockBlock(editor)

const turnIntoItems = computed<TurnIntoMenuItem[]>(() => {
  const conversions = [
    textBlock,
    heading1,
    heading2,
    heading3,
    bulletList,
    orderedList,
    taskList,
    blockquote,
    codeBlock,
  ]
  const items = conversions.map((conversion) => ({
    icon: conversion.Icon,
    label: conversion.label,
    onClick: conversion.handleToggle,
    disabled: !conversion.canToggle.value,
    isActive: conversion.isActive.value,
  }))
  return items.every((item) => item.disabled) ? [] : items
})

const tocShowTitle = useTocShowTitle(editor)
const tableFitToWidth = useTableFitToWidth(editor)
const tableClearAllContents = useTableClearAllContents(editor)
const resetFormatting = useResetAllFormatting(editor, ['inlineThread'])
const imageDownload = useImageDownload(editor)
const duplicate = useDuplicate(editor)
const copyToClipboard = useCopyToClipboard(editor)
const copyAnchorLink = useCopyAnchorLink(editor)
const deleteNode = useDeleteNode(editor)

function formatShortcut(shortcutKeys: string | undefined) {
  return parseShortcutKeys({ shortcutKeys }).join('')
}
</script>
