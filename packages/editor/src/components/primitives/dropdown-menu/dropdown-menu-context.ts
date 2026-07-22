// Контекст выпадающего меню: открытие/закрытие + элементы позиционирования.
import type { InjectionKey, Ref, ShallowRef } from 'vue'

export interface DropdownMenuContext {
  open: Ref<boolean>
  setOpen: (value: boolean) => void
  reference: ShallowRef<HTMLElement | null>
}

export const dropdownMenuInjectionKey: InjectionKey<DropdownMenuContext> = Symbol('dropdown-menu')
