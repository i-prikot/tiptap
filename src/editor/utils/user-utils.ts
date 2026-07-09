/**
 * Генерация случайного пользователя и детерминированный выбор аватара.
 * Порт из чанков 1-1gopd-oz05f (имена/цвета) и 3qxxh2m8wjeqx (getAvatar).
 */

const FIRST_NAMES = [
  'John',
  'Jane',
  'Alice',
  'Bob',
  'Eve',
  'Charlie',
  'David',
  'Frank',
  'Grace',
  'Helen',
  'Rob Lowe',
  'Rob',
]

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Jones',
  'Brown',
  'Davis',
  'Miller',
  'Wilson',
  'Moore',
  'Taylor',
  'Anderson',
  'Thomas',
  'Lowe',
]

const USER_COLORS = [
  '#fb7185',
  '#fdba74',
  '#d9f99d',
  '#a7f3d0',
  '#a5f3fc',
  '#a5b4fc',
  '#f0abfc',
  '#fda58d',
  '#f2cc8f',
  '#9ae6b4',
]

function randomItem<T>(items: T[]): T {
  if (items.length === 0) throw new Error('Cannot get random item from empty array')
  return items[Math.floor(Math.random() * items.length)]
}

export function randomUserName(): string {
  const parts = [randomItem(FIRST_NAMES)]
  if (Math.random() > 0.85) parts.push(randomItem(FIRST_NAMES))
  parts.push(randomItem(LAST_NAMES))
  return parts.join(' ')
}

export function randomUserColor(): string {
  return randomItem(USER_COLORS) ?? '#9ae6b4'
}

export function randomUserId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (16 * Math.random()) | 0
    return (char === 'x' ? random : (3 & random) | 8).toString(16)
  })
}

/** Детерминированный аватар по хэшу имени (memoji_01..memoji_20). */
export function getAvatar(name: string | null | undefined): string {
  if (!name) return '/avatars/memoji_01.png'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash &= hash
  }
  const index = (1 + Math.floor(((Math.abs(hash) % 1e6) / 1e6) * 20)).toString().padStart(2, '0')
  return `/avatars/memoji_${index}.png`
}

/** Читает значение из localStorage либо создаёт новое. */
export function getStoredOrCreate(key: string, create: () => string, forceNew = false): string {
  if (forceNew) return create()
  const stored = window.localStorage.getItem(key)
  return stored !== null ? stored : create()
}
