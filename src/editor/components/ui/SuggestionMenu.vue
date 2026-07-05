<template>
  <Teleport to="body">
    <div
      v-if="open && editor"
      ref="menuRef"
      :style="floatingStyles"
      :data-selector="selector"
      class="tiptap-suggestion-menu"
      role="listbox"
      aria-label="Suggestions"
      @pointerdown.prevent
    >
      <slot :items="items" :selected-index="selectedIndex" :on-select="handleSelect" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Универсальное suggestion-меню: регистрирует suggestion-плагин
 * по символу-триггеру, позиционирует контент floating-ui, ведёт
 * клавиатурную навигацию. Порт SuggestionMenu из чанка 3qxxh2m8wjeqx
 * (модуль 619184).
 */
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { PluginKey } from '@tiptap/pm/state'
import { flip, offset as offsetMiddleware, shift, size, autoUpdate, useFloating } from '@floating-ui/vue'
import type { Editor } from '@tiptap/vue-3'
import { useTiptapEditor } from '../../composables/useTiptapEditor'
import { useMenuNavigation } from '../../composables/useMenuNavigation'
import { Suggestion, calculateStartPosition } from '../../utils/suggestion/suggestion'
import type { SuggestionItem, SuggestionProps } from '../../utils/suggestion/suggestion'

const props = withDefaults(
  defineProps<{
    editor?: Editor | null
    char?: string
    pluginKey?: string
    decorationClass?: string
    decorationContent?: string
    selector?: string
    maxHeight?: number
    items: (args: { query: string; editor: Editor }) => SuggestionItem[] | Promise<SuggestionItem[]>
  }>(),
  {
    editor: undefined,
    char: '@',
    pluginKey: 'suggestionMenu',
    decorationClass: 'suggestion',
    decorationContent: '',
    selector: 'tiptap-suggestion-menu',
    maxHeight: 384,
  },
)

const editor = useTiptapEditor(computed(() => props.editor))

const open = ref(false)
const referenceRect = shallowRef<(() => DOMRect | null) | null>(null)
const commandFn = shallowRef<((item: SuggestionItem) => void) | null>(null)
const items = shallowRef<SuggestionItem[]>([])
const query = ref('')

const menuRef = ref<HTMLElement | null>(null)

// виртуальный reference для floating-ui на основе rect декорации
const virtualReference = computed(() => {
  const getRect = referenceRect.value
  if (!getRect) return null
  return { getBoundingClientRect: () => getRect() ?? new DOMRect() }
})

const { floatingStyles: rawFloatingStyles } = useFloating(virtualReference, menuRef, {
  placement: 'bottom-start',
  whileElementsMounted: autoUpdate,
  middleware: [
    offsetMiddleware(10),
    flip({ mainAxis: true, crossAxis: false }),
    shift(),
    size({
      apply({ availableHeight, elements }) {
        if (elements.floating) {
          const height = props.maxHeight ? Math.min(props.maxHeight, availableHeight) : availableHeight
          elements.floating.style.setProperty('--suggestion-menu-max-height', `${height}px`)
        }
      },
    }),
  ],
})

const floatingStyles = computed<CSSProperties>(() => ({ ...rawFloatingStyles.value, zIndex: 1000 }))

function close() {
  open.value = false
}

function handleSelect(item: SuggestionItem) {
  close()
  commandFn.value?.(item)
}

const { selectedIndex } = useMenuNavigation<SuggestionItem>({
  editor,
  query,
  items,
  onSelect: handleSelect,
})

let registeredKey: PluginKey | null = null

watch(
  editor,
  instance => {
    if (registeredKey && instance && !instance.isDestroyed) {
      instance.unregisterPlugin(registeredKey)
      registeredKey = null
    }
    if (!instance || instance.isDestroyed) return

    const key = new PluginKey(props.pluginKey)
    registeredKey = key
    const triggerChar = props.char

    // если mention-расширение обслуживает этот символ — его настройки наследуются
    const mentionServesChar = (candidate: Editor) =>
      candidate.extensionManager.extensions.some(extension => {
        if (extension.name !== 'mention') return false
        const suggestions = (extension.options as Record<string, any>)?.suggestions
        if (suggestions?.length) return suggestions.some((s: { char?: string }) => (s.char ?? '@') === triggerChar)
        return ((extension.options as Record<string, any>)?.suggestion?.char ?? '@') === triggerChar
      })

    const plugin = Suggestion<SuggestionItem, SuggestionItem>({
      pluginKey: key,
      editor: instance,
      char: triggerChar,
      decorationClass: props.decorationClass,
      decorationContent: props.decorationContent,
      items: ({ query: itemsQuery, editor: itemsEditor }) =>
        props.items({ query: itemsQuery, editor: itemsEditor as Editor }),
      allow({ range }) {
        // внутри image-узлов меню не открывается
        const $pos = instance.state.doc.resolve(range.from)
        for (let depth = $pos.depth; depth > 0; depth--) {
          if ($pos.node(depth).type.name === 'image') return false
        }
        return true
      },
      command({ editor: cmdEditor, range, props: item }) {
        if (!range) return
        const { view, state } = cmdEditor
        const { selection } = state
        // без mention-расширения триггер удаляется вручную
        if (!mentionServesChar(cmdEditor as Editor)) {
          const pos = selection.$from.pos
          const nodeBefore = selection.$head?.nodeBefore
          const start = nodeBefore ? calculateStartPosition(pos, nodeBefore, triggerChar) : selection.$from.start()
          view.dispatch(state.tr.deleteRange(start, pos))
        }
        const adjustedRange = { ...range }
        const nodeAfter = view.state.selection.$to.nodeAfter
        if (nodeAfter?.text?.startsWith(' ')) adjustedRange.to += 1
        item.onSelect({ editor: cmdEditor as Editor, range: adjustedRange, context: item.context })
      },
      render: () => ({
        onStart: state => {
          applyState(state)
          open.value = true
        },
        onUpdate: state => {
          applyState(state)
        },
        onKeyDown: ({ event }) => {
          if (event.key === 'Escape') {
            close()
            return true
          }
          return false
        },
        onExit: () => {
          referenceRect.value = null
          commandFn.value = null
          items.value = []
          query.value = ''
          open.value = false
        },
      }),
    })

    function applyState(state: SuggestionProps<SuggestionItem, SuggestionItem>) {
      referenceRect.value = state.clientRect
      commandFn.value = state.command
      items.value = state.items
      query.value = state.query
    }

    instance.registerPlugin(plugin)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  const instance = editor.value
  if (registeredKey && instance && !instance.isDestroyed) instance.unregisterPlugin(registeredKey)
})
</script>
