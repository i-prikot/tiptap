/**
 * Недавние цвета (localStorage `tiptapRecentlyUsedColors`).
 * Порт useRecentColors из чанка 2mux2p9tadf0h (модуль 959411).
 */
import { onMounted, ref } from 'vue'
import type { RecentColor } from '../types/color'

const STORAGE_KEY = 'tiptapRecentlyUsedColors'

export function useRecentColors(maxColors = 3) {
  const recentColors = ref<RecentColor[]>([])
  const isInitialized = ref(false)

  onMounted(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) recentColors.value = (JSON.parse(stored) as RecentColor[]).slice(0, maxColors)
    } catch (error) {
      console.error('Failed to load stored colors:', error)
    } finally {
      isInitialized.value = true
    }
  })

  const addRecentColor = (color: RecentColor) => {
    const rest = recentColors.value.filter(
      (item) => item.type !== color.type || item.value !== color.value,
    )
    const next = [color, ...rest].slice(0, maxColors)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch (error) {
      console.error('Failed to store colors:', error)
    }
    recentColors.value = next
  }

  return { recentColors, addRecentColor, isInitialized }
}

/** Цвет из палитры по значению; fallback — сырой value. */
export function getColorByValue(
  value: string,
  palette: ReadonlyArray<{ value: string; label: string }>,
): { value: string; label: string } {
  return palette.find((color) => color.value === value) ?? { value, label: value }
}
