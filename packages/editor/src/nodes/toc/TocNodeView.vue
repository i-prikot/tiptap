<template>
  <NodeViewWrapper
    class="tiptap-table-of-contents-node"
    :style="{ backgroundColor: backgroundColor || undefined }"
  >
    <template v-if="visibleItems.length">
      <div v-if="showTitle" class="tiptap-table-of-contents-title">Table of contents</div>
      <nav aria-label="Table of contents" class="tiptap-table-of-contents-list">
        <a
          v-for="(entry, index) in itemsWithDepth"
          :key="entry.item.id ?? `${index}-${entry.item.textContent}`"
          :href="`#${entry.item.id}`"
          rel="noopener noreferrer"
          class="tiptap-table-of-contents-item notranslate"
          :data-depth="entry.depth"
          :style="{ '--toc-depth': entry.depth }"
          @click="handleItemClick($event, entry.item)"
        >
          {{ entry.item.textContent }}
        </a>
      </nav>
    </template>
    <div v-else class="tiptap-table-of-contents-empty">
      Add headings to create a table of contents.
    </div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
// NodeView блока TOC. Порт React-компонента из чанка 094r3nrv45pwr.
import { computed } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { useToc } from '../../composables'
import type { TocItem } from '../../types/toc'

const props = defineProps(nodeViewProps)

const { tocContent, navigateToHeading, normalizeHeadingDepths } = useToc()

const options = computed(
  () =>
    props.extension.options as {
      topOffset: number
      maxShowCount: number
      showTitle: boolean
    },
)

const backgroundColor = computed(() => (props.node.attrs.backgroundColor as string | null) ?? null)
const topOffset = computed(
  () => (props.node.attrs.topOffset as number | null) ?? options.value.topOffset ?? 0,
)
const maxShowCount = computed(
  () => (props.node.attrs.maxShowCount as number | null) ?? options.value.maxShowCount ?? 20,
)
const showTitle = computed(
  () => (props.node.attrs.showTitle as boolean | null) ?? options.value.showTitle ?? true,
)

const visibleItems = computed<TocItem[]>(() =>
  (tocContent.value ?? []).slice(0, maxShowCount.value),
)
const itemsWithDepth = computed(() => {
  const depths = normalizeHeadingDepths(visibleItems.value)
  return visibleItems.value.map((item, index) => ({ item, depth: depths[index] ?? 1 }))
})

function handleItemClick(event: MouseEvent, item: TocItem) {
  event.preventDefault()
  event.stopPropagation()
  navigateToHeading(item, { topOffset: topOffset.value })
}
</script>
