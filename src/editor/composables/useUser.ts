/**
 * Пользователь коллаборации: случайные имя/цвет/id, сохраняемые
 * в localStorage (_tiptap_username / _tiptap_color / _tiptap_user_id).
 * Vue-эквивалент UserProvider/useUser из чанка 1-1gopd-oz05f.
 */
import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'
import type { CollabUser } from '../types/user'
import {
  getAvatar,
  getStoredOrCreate,
  randomUserColor,
  randomUserId,
  randomUserName,
} from '../utils/user-utils'

interface UserContext {
  user: CollabUser
}

const userInjectionKey: InjectionKey<UserContext> = Symbol('user')

export function provideUser(): UserContext {
  const name = getStoredOrCreate('_tiptap_username', randomUserName)
  const user: CollabUser = {
    color: getStoredOrCreate('_tiptap_color', randomUserColor),
    name,
    id: getStoredOrCreate('_tiptap_user_id', randomUserId),
    avatar: getAvatar(name),
  }

  window.localStorage.setItem('_tiptap_username', user.name)
  window.localStorage.setItem('_tiptap_color', user.color)
  window.localStorage.setItem('_tiptap_user_id', user.id)

  const context: UserContext = { user }
  provide(userInjectionKey, context)
  return context
}

export function useUser(): UserContext {
  const context = inject(userInjectionKey)
  if (!context) throw new Error('useUser must be used inside provideUser()')
  return context
}
