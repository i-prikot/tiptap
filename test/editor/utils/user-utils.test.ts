import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getAvatar,
  getStoredOrCreate,
  randomUserColor,
  randomUserId,
  randomUserName,
} from '../../../src/editor/utils/user-utils'

describe('user utilities', () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('generates deterministic two-part and three-part names', () => {
    const random = vi.spyOn(Math, 'random')

    random.mockReturnValueOnce(0).mockReturnValueOnce(0.85).mockReturnValueOnce(0)
    expect(randomUserName()).toBe('John Smith')

    random.mockReset()
    random
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.86)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
    expect(randomUserName()).toBe('John John Smith')
  })

  it('selects a color from the palette and generates a valid UUID v4', () => {
    const random = vi.spyOn(Math, 'random')

    random.mockReturnValue(0.99)
    expect(randomUserColor()).toBe('#9ae6b4')

    random.mockReturnValue(0)
    const userId = randomUserId()

    expect(userId).toBe('00000000-0000-4000-8000-000000000000')
    expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('returns a repeatable avatar and uses the default for missing names', () => {
    expect(getAvatar('Ada')).toBe('/avatars/memoji_02.png')
    expect(getAvatar('Ada')).toBe('/avatars/memoji_02.png')
    expect(getAvatar(null)).toBe('/avatars/memoji_01.png')
    expect(getAvatar(undefined)).toBe('/avatars/memoji_01.png')
    expect(getAvatar('')).toBe('/avatars/memoji_01.png')
  })

  it('returns stored values without calling the factory', () => {
    window.localStorage.setItem('user-id', 'stored-user')
    const createUser = vi.fn(() => 'created-user')

    expect(getStoredOrCreate('user-id', createUser)).toBe('stored-user')
    expect(createUser).not.toHaveBeenCalled()
  })

  it('creates a value when storage is empty', () => {
    const createUser = vi.fn(() => 'created-user')

    expect(getStoredOrCreate('user-id', createUser)).toBe('created-user')
    expect(createUser).toHaveBeenCalledOnce()
  })

  it('bypasses storage when forceNew is enabled', () => {
    window.localStorage.setItem('user-id', 'stored-user')
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const createUser = vi.fn(() => 'created-user')

    expect(getStoredOrCreate('user-id', createUser, true)).toBe('created-user')
    expect(createUser).toHaveBeenCalledOnce()
    expect(getItem).not.toHaveBeenCalled()
  })
})
