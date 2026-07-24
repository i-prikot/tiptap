<template>
  <div :ref="floatingRef" :style="floatingStyle">
    <Menu :open="open" :placement="placement" @update:open="onOpenChange">
      <template #trigger>
        <button
          type="button"
          :class="[
            'tiptap-table-handle-menu',
            orientation,
            open && 'menu-opened',
            dragging && 'is-dragging',
          ]"
          draggable="true"
          :aria-label="ariaLabel"
          aria-haspopup="menu"
          :aria-expanded="open"
          @dragstart="onDragStart"
          @dragend="emit('drag-end')"
        >
          <MoreVerticalIcon class="tiptap-button-icon" />
        </button>
      </template>
      <MenuContent @close="onOpenChange(false)">
        <TableHandleMenuContent
          v-if="typeof index === 'number'"
          :index="index"
          :orientation="orientation"
          :table-pos="tablePos"
        />
      </MenuContent>
    </Menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ShallowRef } from 'vue'
import type { Placement } from '@floating-ui/vue'
import { Menu, MenuContent } from '../../primitives'
import { MoreVerticalIcon } from '../../../icons'
import TableHandleMenuContent from './TableHandleMenuContent.vue'
import { useEditorI18n } from '../../../composables'

const props = defineProps<{
  orientation: 'row' | 'column'
  open: boolean
  dragging: boolean
  floatingRef: ShallowRef<HTMLElement | null>
  floatingStyle: Record<string, string>
  index?: number
  tablePos: number
}>()

const emit = defineEmits<{
  'open-change': [value: boolean]
  'drag-start': [event: DragEvent]
  'drag-end': []
}>()

const placement = computed<Placement>(() =>
  props.orientation === 'row' ? 'top-start' : 'bottom-start',
)
const { t } = useEditorI18n()
const ariaLabel = computed(() =>
  props.orientation === 'row' ? t('table.rowActions') : t('table.columnActions'),
)

function onOpenChange(value: boolean) {
  emit('open-change', value)
}

function onDragStart(event: DragEvent) {
  emit('drag-start', event)
}
</script>
