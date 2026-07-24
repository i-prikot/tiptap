import type { Editor } from '@tiptap/core'
import type { EditorView } from '@tiptap/pm/view'
import { computePosition, flip, offset } from '@floating-ui/dom'
import type { Middleware, Placement, Strategy } from '@floating-ui/dom'
import { throttledAutoUpdate } from '../throttle'
import type { MountOptions, SuggestionProps } from './types'

export interface SuggestionFloatingUiConfig {
  placement: Placement
  strategy: Strategy
  middleware: Middleware[]
}

interface FloatingUiOptions {
  placement: Placement
  offset: { mainAxis?: number; crossAxis?: number }
  flip: boolean
  floatingUi?: { strategy?: Strategy; middleware?: Middleware[] }
}

interface SuggestionClientRectConfig {
  editor: Editor
  view: EditorView
  decorationNode: Element | null
  getDecorationId: () => string | null | undefined
}

interface SuggestionMountConfig {
  getReferenceRect: () => DOMRect | null
  contextElement: HTMLElement
  floatingUi: SuggestionFloatingUiConfig
  container?: HTMLElement | string
  dismissOnOutsideClick: boolean
  onExit: () => void
}

/**
 * Возвращает контейнер для detached floating-элемента.
 *
 * Строковый selector проверяется через `querySelector`; невалидный selector и
 * отсутствие найденного элемента намеренно приводят к `document.body`.
 */
function resolveContainer(container: HTMLElement | string | undefined): HTMLElement {
  if (container instanceof HTMLElement) return container
  if (typeof container === 'string') {
    try {
      const found = document.querySelector<HTMLElement>(container)
      if (found) return found
    } catch {
      // невалидный селектор — fallback на body
    }
  }
  return document.body
}

/**
 * Формирует базовую конфигурацию floating-ui для suggestion-меню.
 *
 * Базовый `offset` всегда идёт первым, `flip` добавляется только при включённой
 * опции, а пользовательский middleware следует за ними. Это определяет порядок
 * вычислений и не заменяет параметры placement/strategy, переданные движком.
 */
export function createSuggestionFloatingUiConfig(
  options: FloatingUiOptions,
): SuggestionFloatingUiConfig {
  const middleware: Middleware[] = [
    offset({ mainAxis: options.offset.mainAxis ?? 4, crossAxis: options.offset.crossAxis ?? 0 }),
  ]
  if (options.flip) middleware.push(flip())
  if (options.floatingUi?.middleware?.length) middleware.push(...options.floatingUi.middleware)
  return {
    placement: options.placement,
    strategy: options.floatingUi?.strategy ?? ('absolute' as Strategy),
    middleware,
  }
}

/**
 * Создаёт ленивый источник прямоугольника для virtual reference.
 *
 * Если при создании отсутствует DOM-декорация, координаты берутся от текущего
 * anchor selection с безопасным fallback `null` при недоступном DOMRect. Если
 * декорация была найдена, её узел повторно ищется по стабильному id при каждом
 * вызове; после DOM-обновления отсутствие узла также возвращает `null`, а не
 * устаревшую геометрию.
 */
export function createSuggestionClientRect(
  config: SuggestionClientRectConfig,
): () => DOMRect | null {
  const { editor, view, decorationNode, getDecorationId } = config

  if (!decorationNode) {
    return () => {
      const pos = editor.state.selection.$anchor.pos
      const { top, right, bottom, left } = editor.view.coordsAtPos(pos)
      try {
        return new DOMRect(left, top, right - left, bottom - top)
      } catch {
        return null
      }
    }
  }

  return () => {
    const decorationId = getDecorationId()
    const node = view.dom.querySelector(`[data-decoration-id="${decorationId}"]`)
    return node?.getBoundingClientRect() || null
  }
}

/**
 * Создаёт `mount` для внешнего renderer-а floating suggestion-меню.
 *
 * Виртуальная reference использует актуальный прямоугольник триггера и DOM
 * редактора как context element. Detached элемент временно добавляется в
 * настроенный контейнер для измерения; без `onPosition` он скрыт до первого
 * расчёта. Возвращённый cleanup обязательно останавливает auto-update, снимает
 * capture-listener внешнего pointerdown и удаляет только самостоятельно
 * смонтированный элемент.
 */
export function createSuggestionMount(config: SuggestionMountConfig): SuggestionProps['mount'] {
  const { getReferenceRect, contextElement, floatingUi, container, dismissOnOutsideClick, onExit } =
    config

  return (element, mountOptions: MountOptions = {}) => {
    let outsideHandler: ((event: PointerEvent) => void) | undefined
    const virtualReference = {
      getBoundingClientRect: () => getReferenceRect() ?? new DOMRect(),
      contextElement,
    }
    let positioned = false
    const detached = !element.isConnected
    if (detached) {
      resolveContainer(container).appendChild(element)
      if (!mountOptions.onPosition) {
        element.style.visibility = 'hidden'
        element.style.width = 'max-content'
      }
    }
    const stopAutoUpdate = throttledAutoUpdate(
      virtualReference,
      element,
      () => {
        computePosition(virtualReference, element, {
          placement: floatingUi.placement,
          strategy: floatingUi.strategy,
          middleware: floatingUi.middleware,
        }).then(({ x, y, placement, strategy }) => {
          if (mountOptions.onPosition) {
            mountOptions.onPosition({ x, y, placement, strategy })
          } else {
            Object.assign(element.style, { position: strategy, left: `${x}px`, top: `${y}px` })
            if (!positioned) {
              positioned = true
              element.style.visibility = ''
            }
          }
        })
      },
      mountOptions.autoUpdate,
    )
    if (dismissOnOutsideClick) {
      /**
       * Закрывает меню только по указателю вне floating-элемента и редактора.
       * Capture-фаза нужна, чтобы закрытие не зависело от остановки всплытия
       * внутри пользовательского renderer-а.
       */
      outsideHandler = (event) => {
        const target = event.target
        if (
          !(target instanceof Node) ||
          element.contains(target) ||
          contextElement.contains(target)
        )
          return
        onExit()
      }
      document.addEventListener('pointerdown', outsideHandler, true)
    }
    return () => {
      stopAutoUpdate()
      if (outsideHandler) document.removeEventListener('pointerdown', outsideHandler, true)
      if (detached) element.remove()
    }
  }
}
