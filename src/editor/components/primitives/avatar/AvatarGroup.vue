<template>
  <div class="tiptap-avatar-group" :data-max-user-visible="maxVisible">
    <template v-for="item in keyedVisibleChildren" :key="item.key">
      <component :is="item.child" />
    </template>
    <Avatar v-if="hiddenCount > 0">
      <AvatarFallback>+{{ hiddenCount }}</AvatarFallback>
    </Avatar>
  </div>
</template>

<script setup lang="ts">
/**
 * Группа аватаров: показывает первые maxVisible и счётчик «+N».
 * Порт AvatarGroup из чанка 34p294mqk5mqb.
 */
import { computed, useSlots } from 'vue'
import type { VNode } from 'vue'
import Avatar from './Avatar.vue'
import AvatarFallback from './AvatarFallback.vue'

const props = defineProps<{ maxVisible?: number }>()

const slots = useSlots()

const allChildren = computed<VNode[]>(() => {
  const children = slots.default?.() ?? []
  // разворачиваем фрагменты от v-for
  return children.flatMap((child) =>
    Array.isArray(child.children) ? (child.children as VNode[]) : [child],
  )
})

const visibleChildren = computed(() =>
  props.maxVisible ? allChildren.value.slice(0, props.maxVisible) : allChildren.value,
)
const hiddenCount = computed(() => allChildren.value.length - visibleChildren.value.length)

const keyedVisibleChildren = computed(() =>
  visibleChildren.value.map((child, index) => ({
    child,
    key: child.key ?? index,
  })),
)
</script>
