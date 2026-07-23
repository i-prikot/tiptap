import type { EditorTranslationMessages } from '../types'
import { colors } from './colors'
import { common } from './common'
import { editor } from './editor'
import { errors } from './errors'
import { formatting } from './formatting'
import { image } from './image'
import { links } from './links'
import { menus } from './menus'
import { table } from './table'
import { toc } from './toc'
import { toolbar } from './toolbar'

export const en = {
  common,
  editor,
  toolbar,
  menus,
  formatting,
  colors,
  links,
  table,
  image,
  toc,
  errors,
} as const satisfies EditorTranslationMessages
