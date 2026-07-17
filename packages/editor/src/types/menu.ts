import type { FunctionalComponent } from 'vue'

export interface EditorMenuActionItem {
  icon: FunctionalComponent
  label: string
  disabled: boolean
  onClick: () => unknown
}

export interface TurnIntoMenuItem {
  icon: FunctionalComponent
  label: string
  onClick: () => void
  disabled: boolean
  isActive: boolean
}
