import { Category } from '@prisma/client'

export type { Category }

export interface RecommendationWithUser {
  id: string
  title: string
  description: string | null
  category: Category
  link: string | null
  imageUrl: string | null
  rating: number | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    image: string | null
  }
  _count: {
    likes: number
    comments: number
  }
}

export interface CommentWithUser {
  id: string
  content: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    image: string | null
  }
}
