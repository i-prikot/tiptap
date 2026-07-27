import type { FunctionalComponent } from 'vue'
import {
  HeadingFiveIcon,
  HeadingFourIcon,
  HeadingOneIcon,
  HeadingSixIcon,
  HeadingThreeIcon,
  HeadingTwoIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
} from '../../icons'

export const TEXT_SHORTCUT_KEY = 'mod+alt+0'
export const HEADING_SHORTCUT_KEYS: Record<number, string> = {
  1: 'ctrl+alt+1',
  2: 'ctrl+alt+2',
  3: 'ctrl+alt+3',
  4: 'ctrl+alt+4',
  5: 'ctrl+alt+5',
  6: 'ctrl+alt+6',
}
export const LIST_SHORTCUT_KEYS: Record<ListType, string> = {
  bulletList: 'mod+shift+8',
  orderedList: 'mod+shift+7',
  taskList: 'mod+shift+9',
}
export const BLOCKQUOTE_SHORTCUT_KEY = 'mod+shift+b'
export const CODE_BLOCK_SHORTCUT_KEY = 'mod+alt+c'

export const headingIcons: Record<number, FunctionalComponent> = {
  1: HeadingOneIcon,
  2: HeadingTwoIcon,
  3: HeadingThreeIcon,
  4: HeadingFourIcon,
  5: HeadingFiveIcon,
  6: HeadingSixIcon,
}

export type ListType = 'bulletList' | 'orderedList' | 'taskList'

export const listIcons: Record<ListType, FunctionalComponent> = {
  bulletList: ListIcon,
  orderedList: ListOrderedIcon,
  taskList: ListTodoIcon,
}

export const LIST_LABELS: Record<ListType, string> = {
  bulletList: 'Bullet List',
  orderedList: 'Numbered List',
  taskList: 'To-do list',
}
