import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type { Placement } from '@floating-ui/vue'
import type { OverlayFocusTarget } from '../../../composables'

export interface MenuContext {
  open: Ref<boolean>
  setOpen: (value: boolean) => void
  reference: ShallowRef<HTMLElement | null>
  content: ShallowRef<HTMLElement | null>
  setContent: (element: HTMLElement | null) => void
  contentId: string
  placement: Placement
  closeAll: () => void
  isSubmenu: boolean
  cancelClose: () => void
  scheduleClose: () => void
  openFromKeyboard: (event: KeyboardEvent, target: OverlayFocusTarget) => void
  consumeFocusTarget: () => OverlayFocusTarget | null
  restoreTriggerFocus: () => Promise<boolean>
}

export const menuInjectionKey: InjectionKey<MenuContext> = Symbol('menu')
