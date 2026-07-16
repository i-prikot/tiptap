<template>
  <div
    ref="rootRef"
    class="toc-sidebar"
    :style="{ '--toc-sidebar-sticky-top': `${props.stickyTopOffset}px` }"
  >
    <div class="toc-sidebar-wrapper">
      <div class="toc-sidebar-inner">
        <div class="toc-sidebar-progress">
          <div
            v-for="entry in visibleWithDepth"
            :key="entry.item.id"
            class="toc-sidebar-progress-line"
            :class="{ 'toc-sidebar-progress-line--active': activeId === entry.item.id }"
            :data-depth="entry.depth"
            :style="{ '--toc-depth': entry.depth }"
          />
        </div>
        <nav
          class="toc-sidebar-nav"
          :class="{ 'toc-sidebar-nav--hidden': !hasItems }"
          aria-label="Table of contents"
        >
          <div class="toc-sidebar-popover">
            <a
              v-for="entry in visibleWithDepth"
              :key="entry.item.id"
              :href="`#${entry.item.id}`"
              rel="noopener noreferrer"
              class="toc-sidebar-item notranslate"
              :class="{ 'toc-sidebar-item--active': activeId === entry.item.id }"
              :data-depth="entry.depth"
              :style="{ '--toc-depth': entry.depth }"
              :aria-current="activeId === entry.item.id ? 'location' : undefined"
              @click="handleItemClick($event, entry.item)"
            >
              {{ entry.item.textContent }}
            </a>
          </div>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Боковая панель оглавления: прогресс-линии + всплывающий список,
 * подсветка активного заголовка (клик фиксирует выбор на 500мс,
 * скролл сбрасывает ручной выбор).
 * Порт TocSidebar из чанка 094r3nrv45pwr (модуль 305472).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useToc, useAnchorNavigation } from '@/editor/composables'

import { getScrollableAncestor } from '../../utils/toc-utils'
import type { TocItem } from '../../types/toc'

const props = withDefaults(
  defineProps<{ maxShowCount?: number; topOffset?: number; stickyTopOffset?: number }>(),
  {
    maxShowCount: 20,
    topOffset: 0,
    stickyTopOffset: 0,
  },
)

const { tocContent, navigateToHeading, normalizeHeadingDepths } = useToc()
const { currentAnchor } = useAnchorNavigation()

const rootRef = ref<HTMLElement | null>(null)
const manualActiveId = ref<string | null>(null)
let lastClickTime: number | null = null
let lastObservedAnchor: string | undefined
let lastAppliedAnchor: string | undefined

const items = computed<TocItem[]>(() => tocContent.value ?? [])
const visibleItems = computed(() => items.value.slice(0, props.maxShowCount))
const visibleWithDepth = computed(() => {
  const depths = normalizeHeadingDepths(visibleItems.value)
  return visibleItems.value.map((item, index) => ({ item, depth: depths[index] ?? 1 }))
})
const hasItems = computed(() => items.value.length > 0)

const lastActiveItem = computed(
  () => [...items.value].reverse().find((item) => item.isActive) ?? null,
)
const firstActiveId = computed(() => items.value.find((item) => item.isActive)?.id ?? null)
const activeId = computed(
  () =>
    manualActiveId.value ||
    (lastActiveItem.value?.id
      ? lastActiveItem.value.id
      : firstActiveId.value || items.value[0]?.id),
)

function handleItemClick(event: MouseEvent, item: TocItem) {
  event.preventDefault()
  event.stopPropagation()
  manualActiveId.value = item.id
  lastClickTime = Date.now()
  navigateToHeading(item, { topOffset: props.topOffset })
}

watch(
  [items, currentAnchor],
  ([list, anchor]) => {
    const anchorChanged = anchor !== lastObservedAnchor
    lastObservedAnchor = anchor

    if (!anchor || !list.length) return
    const match = list.find((item) => item.id === anchor)
    if (!match || (!anchorChanged && lastAppliedAnchor === anchor)) return

    manualActiveId.value = match.id
    lastAppliedAnchor = anchor
  },
  { immediate: true },
)

function handleScroll() {
  const now = Date.now()
  if (lastClickTime && now - lastClickTime < 500) return
  if (manualActiveId.value !== null) manualActiveId.value = null
}

let scrollParent: HTMLElement | Window | null = null
onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  scrollParent = rootRef.value ? getScrollableAncestor(rootRef.value) : null
  if (scrollParent && !(scrollParent instanceof Window)) {
    scrollParent.addEventListener('scroll', handleScroll, { passive: true })
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  if (scrollParent && !(scrollParent instanceof Window)) {
    scrollParent.removeEventListener('scroll', handleScroll)
  }
})
</script>
