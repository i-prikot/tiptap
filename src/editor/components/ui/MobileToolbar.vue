<template>
  <Teleport :to="teleportTarget">
    <Toolbar
      v-if="isMobile && editor && editor.isEditable"
      ref="toolbarRef"
      :style="{ bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)` }"
    >
      <!-- Главный вид -->
      <template v-if="viewId === 'main'">
        <ToolbarGroup>
          <SlashCommandTriggerButton :editor="editor" />
          <!-- «Ещё»: меню действий узла -->
          <Menu v-model:open="menuOpen">
            <template #trigger>
              <Button variant="ghost" data-appearance="subdued">
                <MoreVerticalIcon class="tiptap-button-icon" />
              </Button>
            </template>
            <MenuContent>
              <div class="tiptap-combobox-list" :style="{ minWidth: '15rem' }">
                <MenuGroupLabel>{{ nodeDisplayName }}</MenuGroupLabel>
                <MenuGroup>
                  <ColorMenu :editor="editor" />
                  <Menu v-if="turnIntoItems.length" placement="right">
                    <template #trigger>
                      <MenuItem submenu-trigger>
                        <Button variant="ghost">
                          <Repeat2Icon class="tiptap-button-icon" />
                          <span class="tiptap-button-text">Turn into</span>
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
                          >
                            <component :is="item.icon" class="tiptap-button-icon" />
                            <span class="tiptap-button-text">{{ item.label }}</span>
                          </Button>
                        </MenuItem>
                      </MenuGroup>
                    </MenuContent>
                  </Menu>
                  <MenuItem
                    v-if="resetFormatting.canReset.value"
                    @select="resetFormatting.handleResetFormatting"
                  >
                    <Button variant="ghost" data-active-state="off">
                      <component :is="resetFormatting.Icon" class="tiptap-button-icon" />
                      <span class="tiptap-button-text">Reset formatting</span>
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
                      <span class="tiptap-button-text">Duplicate node</span>
                    </Button>
                  </MenuItem>
                  <MenuItem
                    :disabled="!copyToClipboard.canCopyToClipboard.value"
                    @select="copyToClipboard.handleCopyToClipboard"
                  >
                    <Button variant="ghost" :disabled="!copyToClipboard.canCopyToClipboard.value">
                      <component :is="copyToClipboard.Icon" class="tiptap-button-icon" />
                      <span class="tiptap-button-text">Copy to clipboard</span>
                    </Button>
                  </MenuItem>
                  <MenuItem
                    :disabled="!copyAnchorLink.canCopyAnchorLink.value"
                    @select="copyAnchorLink.handleCopyAnchorLink"
                  >
                    <Button variant="ghost" :disabled="!copyAnchorLink.canCopyAnchorLink.value">
                      <component :is="copyAnchorLink.Icon" class="tiptap-button-icon" />
                      <span class="tiptap-button-text">Copy anchor link</span>
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
                      <span class="tiptap-button-text">Delete</span>
                    </Button>
                  </MenuItem>
                </MenuGroup>
              </div>
            </MenuContent>
          </Menu>
          <ToolbarSeparator />
        </ToolbarGroup>

        <template v-if="hasSelectionOrText">
          <!-- Марки -->
          <ToolbarGroup>
            <MarkButton :editor="editor" type="bold" hide-when-unavailable />
            <MarkButton :editor="editor" type="italic" hide-when-unavailable />
            <MarkButton :editor="editor" type="strike" hide-when-unavailable />
            <MarkButton :editor="editor" type="code" hide-when-unavailable />
          </ToolbarGroup>
          <ToolbarSeparator />

          <!-- Переход в под-виды -->
          <template v-if="canHighlight || canLink">
            <ColorHighlightPopoverButton v-if="canHighlight" @click="viewId = 'highlighter'" />
            <LinkButton v-if="canLink" @click="viewId = 'link'" />
            <ToolbarSeparator />
          </template>

          <ImageNodeFloating :editor="editor" />

          <ToolbarGroup>
            <MarkButton :editor="editor" type="superscript" hide-when-unavailable />
            <MarkButton :editor="editor" type="subscript" hide-when-unavailable />
          </ToolbarGroup>
          <ToolbarSeparator />

          <ToolbarGroup>
            <TextAlignButton :editor="editor" align="left" hide-when-unavailable />
            <TextAlignButton :editor="editor" align="center" hide-when-unavailable />
            <TextAlignButton :editor="editor" align="right" hide-when-unavailable />
            <TextAlignButton :editor="editor" align="justify" hide-when-unavailable />
          </ToolbarGroup>
          <ToolbarSeparator />

          <ToolbarGroup>
            <IndentButton :editor="editor" action="outdent" hide-when-unavailable />
            <IndentButton :editor="editor" action="indent" hide-when-unavailable />
          </ToolbarGroup>
          <ToolbarSeparator />

          <ToolbarGroup>
            <ImageUploadButton :editor="editor" text="Add" />
            <ToolbarSeparator />
          </ToolbarGroup>
        </template>

        <ToolbarGroup>
          <MoveNodeButton :editor="editor" direction="down" />
          <MoveNodeButton :editor="editor" direction="up" />
        </ToolbarGroup>
      </template>

      <!-- Под-виды: highlighter / link -->
      <template v-else>
        <ToolbarGroup>
          <Button variant="ghost" @click="viewId = 'main'">
            <ArrowLeftIcon class="tiptap-button-icon" />
            <HighlighterIcon v-if="viewId === 'highlighter'" class="tiptap-button-icon" />
            <LinkIcon v-else class="tiptap-button-icon" />
          </Button>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ColorHighlightPopoverContent v-if="viewId === 'highlighter'" :editor="editor" />
        <LinkContent v-else :editor="editor" @set-link="viewId = 'main'" />
      </template>
    </Toolbar>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Мобильный тулбар (≤480px), прижат к нижней границе видимой области;
 * виды main/highlighter/link.
 * Порт MobileToolbar (функции et/t6/t3/t8/t5) из чанка 3xpmbr0kqzhen.
 * AI-пункты (ImproveDropdown, Ask AI) не переносятся (Tiptap Pro).
 */
import { computed, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { TurnIntoMenuItem } from '../../types/menu'
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
  Button,
  Spacer,
  Separator,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
} from '@/editor/components/primitives'

import SlashCommandTriggerButton from './SlashCommandTriggerButton.vue'
import MarkButton from './MarkButton.vue'
import TextAlignButton from './TextAlignButton.vue'
import IndentButton from './IndentButton.vue'
import ImageUploadButton from './ImageUploadButton.vue'
import ImageNodeFloating from './ImageNodeFloating.vue'
import MoveNodeButton from './MoveNodeButton.vue'
import ColorMenu from './ColorMenu.vue'
import ColorHighlightPopoverButton from './ColorHighlightPopoverButton.vue'
import ColorHighlightPopoverContent from './ColorHighlightPopoverContent.vue'
import LinkButton from './LinkButton.vue'
import LinkContent from './LinkContent.vue'
import {
  useTiptapEditor,
  useEditorOverlayTarget,
  useIsBreakpoint,
  useEditorSelectionSignal,
  useWindowSize,
  useCursorVisibility,
  canColorHighlight,
  canSetLink,
  useBlockquoteBlock,
  useCodeBlockBlock,
  useHeadingBlock,
  useListBlock,
  useTextBlock,
  useCopyAnchorLink,
  useCopyToClipboard,
  useDeleteNode,
  useDuplicate,
  useResetAllFormatting,
} from '@/editor/composables'

import { getNodeDisplayName } from '../../utils/selection-utils'
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  HighlighterIcon,
  LinkIcon,
  MoreVerticalIcon,
  Repeat2Icon,
} from '../../icons'

type MobileToolbarView = 'main' | 'highlighter' | 'link'

const props = defineProps<{ editor?: Editor | null }>()

const editor = useTiptapEditor(computed(() => props.editor))
const overlayTarget = useEditorOverlayTarget()
const teleportTarget = computed(() => overlayTarget?.value ?? 'body')
const isMobile = useIsBreakpoint('max', 480)
const signal = useEditorSelectionSignal(editor)

const viewId = ref<MobileToolbarView>('main')
const menuOpen = ref(false)

// при выходе из мобильного режима возвращаемся в main
watch(isMobile, (mobile) => {
  if (!mobile) viewId.value = 'main'
})

const toolbarRef = ref<ComponentPublicInstance | null>(null)
const windowSize = useWindowSize()
const overlayHeight = computed(
  () => (toolbarRef.value?.$el as HTMLElement | null)?.getBoundingClientRect().height ?? 0,
)
const bodyRect = useCursorVisibility({ editor, overlayHeight })

const hasSelectionOrText = computed(() => {
  void signal.value
  const instance = editor.value
  if (!instance || !instance.isEditable) return false
  return !instance.state.selection.empty || (instance.getText().length ?? 0) > 0
})

const canHighlight = computed(() => (signal.value, canColorHighlight(editor.value)))
const canLink = computed(() => (signal.value, canSetLink(editor.value)))

const nodeDisplayName = computed(() => (signal.value, getNodeDisplayName(editor.value)))

// Turn into (как в DragContextMenu)
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

const resetFormatting = useResetAllFormatting(editor, ['inlineThread'])
const duplicate = useDuplicate(editor)
const copyToClipboard = useCopyToClipboard(editor)
const copyAnchorLink = useCopyAnchorLink(editor)
const deleteNode = useDeleteNode(editor)
</script>
