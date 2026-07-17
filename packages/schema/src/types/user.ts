export interface CollabUser {
  color: string
  id: string
  name: string
  avatar: string
}

export interface CaretUser {
  clientId: number
  id: string
  name: string
  color: string
}

export interface MentionUser {
  id: number
  name: string
  position: string
  avatarUrl: string
}
