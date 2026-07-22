<template>
  <Card ref="cardRef" :tabindex="tabindex" v-bind="$attrs">
    <slot :selected-index="selectedIndex" />
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, toRef } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { Card } from '../../primitives'
import { useMenuNavigation } from '../../../composables'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    items: unknown[]
    onSelect?: (item: unknown) => void
    tabindex?: number
  }>(),
  { tabindex: 0 },
)

const cardRef = shallowRef<ComponentPublicInstance | null>(null)
const containerRef = computed(() => (cardRef.value?.$el as HTMLElement | null) ?? null)

const { selectedIndex } = useMenuNavigation<unknown>({
  editor: ref(null),
  containerRef: containerRef as never,
  query: ref(''),
  items: toRef(props, 'items'),
  orientation: 'both',
  autoSelectFirstItem: false,
  onSelect: (item) => {
    const highlighted = containerRef.value?.querySelector<HTMLElement>('[data-highlighted="true"]')
    highlighted?.click()
    props.onSelect?.(item)
  },
})
</script>
