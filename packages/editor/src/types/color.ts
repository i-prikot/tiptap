import type { EditorMessageKey } from '../i18n/types'

export type ColorMessageKey = Extract<EditorMessageKey, `colors.${string}`>

export interface TextColor {
  label?: string
  labelKey?: ColorMessageKey
  value: string
  border: string
}

export interface HighlightColor {
  label?: string
  labelKey?: ColorMessageKey
  value: string
  colorValue?: string
  border?: string
}

export type RecentColorType = 'text' | 'highlight'

export interface RecentColor {
  type: RecentColorType
  label: string
  value: string
}
