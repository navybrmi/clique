import { Category, Entity } from '@prisma/client'

export type { Category, Entity }

export interface Restaurant {
  entityId: string
  cuisine: string | null
  location: string | null
  priceRange: string | null
  hours: string | null
  phoneNumber: string | null
  placeId: string | null
}

export interface Movie {
  entityId: string
  director: string | null
  year: number | null
  genre: string | null
  duration: string | null
  attributes: string[]
  tmdbId: string | null
  imdbId: string | null
}

export interface Fashion {
  entityId: string
  brand: string | null
  price: string | null
  size: string | null
  color: string | null
  season: string | null
  material: string | null
}

export interface Household {
  entityId: string
  productType: string | null
  model: string | null
  purchaseLink: string | null
  warranty: string | null
}

export interface Other {
  entityId: string
  customFields: Record<string, any> | null
}

export interface EntityWithDetails extends Entity {
  category: Category
  restaurant?: Restaurant | null
  movie?: Movie | null
  fashion?: Fashion | null
  household?: Household | null
  other?: Other | null
}

export interface RecommendationWithEntity {
  id: string
  tags: string[]
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
  entity: EntityWithDetails
  _count: {
    upvotes: number
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
