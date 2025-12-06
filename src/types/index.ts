import { Category, Entity } from '@prisma/client'

/**
 * Re-exported Prisma types for Category and Entity models
 */
export type { Category, Entity }

/**
 * Restaurant-specific details for recommendations.
 * Contains information about dining establishments including location, cuisine, and contact details.
 */
export interface Restaurant {
  entityId: string
  cuisine: string | null
  location: string | null
  priceRange: string | null
  hours: string | null
  phoneNumber: string | null
  placeId: string | null
}

/**
 * Movie-specific details for recommendations.
 * Contains comprehensive movie metadata including director, genre, and external identifiers.
 */
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

/**
 * Fashion item details for recommendations.
 * Contains apparel and accessory information including brand, size, and seasonal attributes.
 */
export interface Fashion {
  entityId: string
  brand: string | null
  price: string | null
  size: string | null
  color: string | null
  season: string | null
  material: string | null
}

/**
 * Household item details for recommendations.
 * Contains product information for home goods and appliances.
 */
export interface Household {
  entityId: string
  productType: string | null
  model: string | null
  purchaseLink: string | null
  warranty: string | null
}

/**
 * Generic category details for miscellaneous recommendations.
 * Provides flexible storage for recommendations that don't fit standard categories.
 */
export interface Other {
  entityId: string
  /** Flexible key-value storage for custom attributes */
  customFields: Record<string, any> | null
}

/**
 * Complete entity with all possible category-specific details.
 * Extends the base Entity model with relationships to category-specific data.
 */
export interface EntityWithDetails extends Entity {
  category: Category
  restaurant?: Restaurant | null
  movie?: Movie | null
  fashion?: Fashion | null
  household?: Household | null
  other?: Other | null
}

/**
 * Complete recommendation with entity details, user info, and engagement metrics.
 * This is the primary data structure for displaying recommendations throughout the app.
 */
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

/**
 * Comment with associated user information.
 * Used for displaying threaded discussions on recommendations.
 */
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
