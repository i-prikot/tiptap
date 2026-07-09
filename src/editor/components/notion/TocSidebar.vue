<template>
  <div ref="rootRef" class="toc-sidebar">
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
import { useToc } from '../../composables/useToc'
import { getScrollableAncestor } from '../../utils/toc-utils'
import type { TocItem } from '../../types/toc'

const props = withDefaults(defineProps<{ maxShowCount?: number; topOffset?: number }>(), {
  maxShowCount: 20,
  topOffset: 0,
})

const { tocContent, navigateToHeading, normalizeHeadingDepths } = useToc()

const rootRef = ref<HTMLElement | null>(null)
const manualActiveId = ref<string | null>(null)
const initializedFromHash = ref(false)
let lastClickTime: number | null = null

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

// первичная подсветка по hash из URL
watch(
  items,
  (list) => {
    if (initializedFromHash.value || !list.length) return
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return
    const match = list.find((item) => item.id === hash)
    if (match) {
      manualActiveId.value = match.id
      initializedFromHash.value = true
    }
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
