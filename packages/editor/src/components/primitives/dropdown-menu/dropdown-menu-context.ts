import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type { OverlayFocusTarget } from '../../../composables'

export interface DropdownMenuContext {
  open: Ref<boolean>
  setOpen: (value: boolean) => void
  reference: ShallowRef<HTMLElement | null>
  setTrigger: (element: Element | null | undefined) => void
  contentId: string
  openFromKeyboard: (event: KeyboardEvent, target: OverlayFocusTarget) => void
  recordOpenEvent: (event?: Event) => void
  focusContent: (container: HTMLElement | null, target: OverlayFocusTarget) => Promise<boolean>
  restoreTriggerFocus: (content: HTMLElement | null) => Promise<boolean>
  consumeFocusTarget: () => OverlayFocusTarget | null
}

export const dropdownMenuInjectionKey: InjectionKey<DropdownMenuContext> = Symbol('dropdown-menu')
