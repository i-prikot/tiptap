import { h } from 'vue'
import type { FunctionalComponent, SVGAttributes } from 'vue'

export type IconProps = SVGAttributes

export interface IconPath {
  d: string

  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeLinecap?: 'round' | 'butt' | 'square'
  strokeLinejoin?: 'round' | 'miter' | 'bevel'

  fillRule?: 'evenodd'
  clipRule?: 'evenodd'
  fillOpacity?: string
}

export function createIcon(
  name: string,
  viewBox: string,
  paths: IconPath[],
): FunctionalComponent<IconProps> {
  const [, , w, hgt] = viewBox.split(' ')
  const icon: FunctionalComponent<IconProps> = (props, { attrs }) =>
    h(
      'svg',
      {
        width: w,
        height: hgt,
        viewBox,
        fill: 'currentColor',
        xmlns: 'http://www.w3.org/2000/svg',
        ...props,
        ...attrs,
      },
      paths.map((p) =>
        h('path', {
          d: p.d,
          fill: p.fill ?? (p.stroke ? 'none' : 'currentColor'),
          stroke: p.stroke,
          'stroke-width': p.strokeWidth,
          'stroke-linecap': p.strokeLinecap,
          'stroke-linejoin': p.strokeLinejoin,
          'fill-rule': p.fillRule,
          'clip-rule': p.clipRule,
          'fill-opacity': p.fillOpacity,
        }),
      ),
    )
  icon.displayName = name
  return icon
}
