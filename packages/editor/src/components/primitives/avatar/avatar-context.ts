// Контекст статуса загрузки изображения аватара (Avatar → AvatarImage/Fallback).
import type { InjectionKey, Ref } from 'vue'

export type AvatarImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error'

export interface AvatarContext {
  imageLoadingStatus: Ref<AvatarImageLoadingStatus>
  onImageLoadingStatusChange: (status: AvatarImageLoadingStatus) => void
}

export const avatarInjectionKey: InjectionKey<AvatarContext> = Symbol('avatar')
