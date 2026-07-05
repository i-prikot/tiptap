<template>
  <NodeViewWrapper
    class="tiptap-image"
    :data-align="align"
    :data-width="width"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @touchstart="handleTouchStart"
  >
    <div ref="containerRef" class="tiptap-image-container" :style="{ width: width ? `${width}px` : 'fit-content' }">
      <div class="tiptap-image-content">
        <img
          :src="src"
          :alt="alt"
          class="tiptap-image-img"
          contenteditable="false"
          draggable="false"
          :style="{ cursor: editor?.isEditable ? 'pointer' : 'default' }"
          @click="handleImageClick"
        >
        <template v-if="handlesVisible && editor?.isEditable">
          <div
            ref="leftHandleRef"
            class="tiptap-image-handle tiptap-image-handle-left"
            @mousedown.prevent.stop="startResize('left', $event.clientX)"
            @touchstart.prevent="startTouchResize('left', $event)"
          />
          <div
            ref="rightHandleRef"
            class="tiptap-image-handle tiptap-image-handle-right"
            @mousedown.prevent.stop="startResize('right', $event.clientX)"
            @touchstart.prevent="startTouchResize('right', $event)"
          />
        </template>
      </div>
      <NodeViewContent
        v-if="editor?.isEditable && captionVisible"
        as="div"
        class="tiptap-image-caption"
        data-placeholder="Add a caption..."
      />
    </div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
/**
 * NodeView изображения: клик выделяет узел, ручки по краям ресайзят
 * (для align=center дельта удваивается), подпись скрывается, когда
 * selection уходит за пределы узла и подпись пуста.
 * Порт React-компонента из чанка 34p294mqk5mqb.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NodeSelection } from '@tiptap/pm/state'
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { isValidPosition } from '../../utils/tiptap-utils'

const MIN_WIDTH = 96
const MAX_WIDTH = 800

const props = defineProps(nodeViewProps)

const editor = computed(() => props.editor)
const src = computed(() => props.node.attrs.src as string)
const alt = computed(() => (props.node.attrs.alt as string) || '')
const align = computed(() => (props.node.attrs['data-align'] as string | null) ?? 'left')
const showCaption = computed(() => (props.node.attrs.showCaption as boolean) ?? false)
const hasContent = computed(() => props.node.content.size > 0)
const captionVisible = computed(() => showCaption.value || hasContent.value)

const width = ref<number | undefined>((props.node.attrs.width as number | null) ?? undefined)
const handlesVisible = ref(false)

interface ResizeState {
  handleUsed: 'left' | 'right'
  initialWidth: number
  initialClientX: number
}
const resizeState = ref<ResizeState | undefined>()

const containerRef = ref<HTMLElement | null>(null)
const leftHandleRef = ref<HTMLElement | null>(null)
const rightHandleRef = ref<HTMLElement | null>(null)

// скрывать пустую подпись, когда выделение уходит за пределы узла
watch(
  [() => editor.value, showCaption],
  ([editorInstance, captionShown], _prev, onCleanup) => {
    if (!editorInstance || !captionShown) return
    const handleSelectionUpdate = () => {
      const pos = props.getPos()
      if (!isValidPosition(pos) || !props.node.nodeSize) return
      const { from, to } = editorInstance.state.selection
      const nodeEnd = pos + props.node.nodeSize
      if ((to < pos || from > nodeEnd) && !hasContent.value) {
        props.updateAttributes({ showCaption: false })
      }
    }
    editorInstance.on('selectionUpdate', handleSelectionUpdate)
    onCleanup(() => editorInstance.off('selectionUpdate', handleSelectionUpdate))
  },
  { immediate: true },
)

function handleImageClick(event: MouseEvent) {
  if (!editor.value || resizeState.value) return
  event.preventDefault()
  event.stopPropagation()
  const pos = props.getPos()
  if (isValidPosition(pos)) editor.value.chain().focus().setNodeSelection(pos).run()
}

function handleMouseEnter() {
  if (editor.value?.isEditable) handlesVisible.value = true
}

function handleMouseLeave(event: MouseEvent) {
  const related = event.relatedTarget as Node | null
  if (
    related !== leftHandleRef.value &&
    related !== rightHandleRef.value &&
    !resizeState.value &&
    editor.value?.isEditable
  ) {
    handlesVisible.value = false
  }
}

function handleTouchStart() {
  if (editor.value?.isEditable) handlesVisible.value = true
}

function startResize(handle: 'left' | 'right', clientX: number) {
  resizeState.value = {
    handleUsed: handle,
    initialWidth: containerRef.value?.clientWidth ?? MIN_WIDTH,
    initialClientX: clientX,
  }
}

function startTouchResize(handle: 'left' | 'right', event: TouchEvent) {
  const touch = event.touches[0]
  if (touch) startResize(handle, touch.clientX)
}

function handlePointerMove(event: MouseEvent | TouchEvent) {
  const state = resizeState.value
  if (!state || !editor.value) return
  const clientX = 'touches' in event ? (event.touches[0]?.clientX ?? 0) : event.clientX
  const fromLeft = state.handleUsed === 'left'
  // при выравнивании по центру картинка растёт в обе стороны
  const multiplier = align.value === 'center' ? 2 : 1
  const delta = fromLeft ? (state.initialClientX - clientX) * multiplier : (clientX - state.initialClientX) * multiplier
  const maxWidth = editor.value.view.dom?.firstElementChild?.clientWidth || MAX_WIDTH
  const nextWidth = Math.min(Math.max(state.initialWidth + delta, MIN_WIDTH), maxWidth)
  width.value = nextWidth
  if (containerRef.value) containerRef.value.style.width = `${nextWidth}px`
}

function handlePointerUp(event: MouseEvent | TouchEvent) {
  if (!editor.value) return

  const target =
    'changedTouches' in event
      ? document.elementFromPoint(event.changedTouches[0]?.clientX ?? 0, event.changedTouches[0]?.clientY ?? 0)
      : (event.target as Element | null)
  if ((!(target && containerRef.value?.contains(target)) || !editor.value.isEditable) && handlesVisible.value) {
    handlesVisible.value = false
  }

  if (!resizeState.value) return

  const hadNodeSelection =
    editor.value.state.selection instanceof NodeSelection && editor.value.state.selection.node.type.name === 'image'

  resizeState.value = undefined
  props.updateAttributes({ width: width.value })

  const pos = props.getPos()
  if (isValidPosition(pos) && hadNodeSelection) {
    editor.value.chain().focus().setNodeSelection(pos).run()
  }
}

onMounted(() => {
  window.addEventListener('mousemove', handlePointerMove)
  window.addEventListener('mouseup', handlePointerUp)
  window.addEventListener('touchmove', handlePointerMove, { passive: false })
  window.addEventListener('touchend', handlePointerUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handlePointerMove)
  window.removeEventListener('mouseup', handlePointerUp)
  window.removeEventListener('touchmove', handlePointerMove)
  window.removeEventListener('touchend', handlePointerUp)
})
</script>
