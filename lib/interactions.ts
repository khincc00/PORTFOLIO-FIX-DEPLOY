// Shared between the news interaction API routes and the client component

export const REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '👏'] as const
export type Reaction = (typeof REACTIONS)[number]

export const COMMENT_LIMITS = { nameMin: 2, nameMax: 40, bodyMin: 2, bodyMax: 1000, maxLinks: 2 }

export interface PublicComment {
  id: number
  author_name: string
  author_type: 'guest' | 'member' | 'admin'
  body: string
  created_at: string
  can_delete: boolean
}

export interface InteractionsPayload {
  comments: PublicComment[]
  reactions: Record<string, number>
  mine: string[]
  user: { id: number; username: string; display_name: string } | null
  isAdmin: boolean
}
