/**
 * Пользователь коллаборации: случайные имя/цвет/id, сохраняемые через
 * настроенное хранилище идентичности.
 * Vue-эквивалент UserProvider/useUser из чанка 1-1gopd-oz05f.
 */
import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'
import type { CollabUser } from '../types/user'
import type { IdentityStorage } from '../utils/storage'
import {
  getAvatar,
  getStoredOrCreate,
  randomUserColor,
  randomUserId,
  randomUserName,
  setStoredValue,
} from '../utils/user-utils'

const USER_NAME_STORAGE_KEY = '_tiptap_username'
const USER_COLOR_STORAGE_KEY = '_tiptap_color'
const USER_ID_STORAGE_KEY = '_tiptap_user_id'

interface UserContext {
  user: CollabUser
}

const userInjectionKey: InjectionKey<UserContext> = Symbol('user')

function resolveIdentityStorage(
  identityStorage?: IdentityStorage | false,
): IdentityStorage | false {
  return identityStorage === false ? false : (identityStorage ?? window.localStorage)
}

export function provideUser(identityStorage?: IdentityStorage | false): UserContext {
  const storage = resolveIdentityStorage(identityStorage)
  const name = getStoredOrCreate(storage, USER_NAME_STORAGE_KEY, randomUserName)
  const user: CollabUser = {
    color: getStoredOrCreate(storage, USER_COLOR_STORAGE_KEY, randomUserColor),
    name,
    id: getStoredOrCreate(storage, USER_ID_STORAGE_KEY, randomUserId),
    avatar: getAvatar(name),
  }

  setStoredValue(storage, USER_NAME_STORAGE_KEY, user.name)
  setStoredValue(storage, USER_COLOR_STORAGE_KEY, user.color)
  setStoredValue(storage, USER_ID_STORAGE_KEY, user.id)

  const context: UserContext = { user }
  provide(userInjectionKey, context)
  return context
}

export function useUser(): UserContext {
  const context = inject(userInjectionKey)
  if (!context) throw new Error('useUser must be used inside provideUser()')
  return context
}
