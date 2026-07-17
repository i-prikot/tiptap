// Контекст меню (ariakit Menu → Vue): состояние открытия + reference.
import type { InjectionKey, Ref } from 'vue'
import type { Placement } from '@floating-ui/vue'

export interface MenuContext {
  open: Ref<boolean>
  setOpen: (value: boolean) => void
  reference: Ref<HTMLElement | null>
  placement: Placement
  /** Закрыть всю цепочку меню (включая родительские). */
  closeAll: () => void
  /** Является ли данное меню подменю (вложенным в другое меню). */
  isSubmenu: boolean
  /** Сбросить отложенное закрытие подменю по наведению. */
  cancelClose: () => void
  /** Запланировать закрытие подменю с задержкой после ухода курсора. */
  scheduleClose: () => void
}

export const menuInjectionKey: InjectionKey<MenuContext> = Symbol('menu')
