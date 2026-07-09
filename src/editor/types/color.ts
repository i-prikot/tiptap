export interface TextColor {
  label: string
  value: string
  border: string
}

export interface HighlightColor {
  label: string
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
