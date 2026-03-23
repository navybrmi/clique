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
  /** Foreign key linking to the parent Entity record */
  entityId: string
  /** Cuisine type(s) derived from Google Places types, e.g. "italian, pizza" */
  cuisine: string | null
  /** Formatted street address from Google Places */
  location: string | null
  /** Price level as dollar signs, e.g. "$$" */
  priceRange: string | null
  /** Newline-separated weekly opening hours */
  hours: string | null
  /** Formatted phone number */
  phoneNumber: string | null
  /** Google Places Place ID used for refresh lookups */
  placeId: string | null
}

/**
 * Movie-specific details for recommendations.
 * Contains comprehensive movie metadata including director, genre, and external identifiers.
 */
export interface Movie {
  /** Foreign key linking to the parent Entity record */
  entityId: string
  /** Director's full name */
  director: string | null
  /** Four-digit release year */
  year: number | null
  /** Comma-separated genre names, e.g. "Action, Drama" */
  genre: string | null
  /** Human-readable runtime, e.g. "2h 28m" */
  duration: string | null
  /** Additional free-form attributes stored as an array of strings */
  attributes: string[]
  /** The Movie Database (TMDB) movie ID, used for data refresh */
  tmdbId: string | null
  /** IMDb title ID, e.g. "tt1375666" */
  imdbId: string | null
}

/**
 * Fashion item details for recommendations.
 * Contains apparel and accessory information including brand, size, and seasonal attributes.
 */
export interface Fashion {
  /** Foreign key linking to the parent Entity record */
  entityId: string
  /** Brand or designer name */
  brand: string | null
  /** Price or price range as a string, e.g. "$120" */
  price: string | null
  /** Size label, e.g. "M" or "US 8" */
  size: string | null
  /** Primary color or color description */
  color: string | null
  /** Season the item is intended for, e.g. "Winter" */
  season: string | null
  /** Fabric or material description, e.g. "100% cotton" */
  material: string | null
}

/**
 * Household item details for recommendations.
 * Contains product information for home goods and appliances.
 */
export interface Household {
  /** Foreign key linking to the parent Entity record */
  entityId: string
  /** Category of household product, e.g. "Kitchen appliance" */
  productType: string | null
  /** Manufacturer model number or product name */
  model: string | null
  /** URL where the item can be purchased */
  purchaseLink: string | null
  /** Warranty duration or description, e.g. "2-year limited" */
  warranty: string | null
}

/**
 * Generic category details for miscellaneous recommendations.
 * Provides flexible storage for recommendations that don't fit standard categories.
 */
export interface Other {
  /** Foreign key linking to the parent Entity record */
  entityId: string
  /** Flexible key-value storage for custom attributes */
  customFields: Record<string, any> | null
}

/**
 * Complete entity with all possible category-specific details.
 * Extends the base Entity model with relationships to category-specific data.
 */
export interface EntityWithDetails extends Entity {
  /** The category this entity belongs to */
  category: Category
  /** Present when the entity is in the RESTAURANT category */
  restaurant?: Restaurant | null
  /** Present when the entity is in the MOVIE category */
  movie?: Movie | null
  /** Present when the entity is in the FASHION category */
  fashion?: Fashion | null
  /** Present when the entity is in the HOUSEHOLD category */
  household?: Household | null
  /** Present when the entity is in the OTHER category */
  other?: Other | null
}

/**
 * Complete recommendation with entity details, user info, and engagement metrics.
 * This is the primary data structure for displaying recommendations throughout the app.
 */
export interface RecommendationWithEntity {
  /** Unique recommendation identifier */
  id: string
  /** User-supplied tags describing the recommendation */
  tags: string[]
  /** Optional external URL associated with the recommendation */
  link: string | null
  /** Optional image URL for the recommendation hero image */
  imageUrl: string | null
  /** User rating on a 0–5 scale */
  rating: number | null
  /** Timestamp when the recommendation was created */
  createdAt: Date
  /** Timestamp of the most recent update */
  updatedAt: Date
  /** Minimal user details of the recommendation author */
  user: {
    id: string
    name: string | null
    image: string | null
  }
  /** The associated entity with all category-specific sub-data */
  entity: EntityWithDetails
  /** Aggregated counts of social engagement */
  _count: {
    upvotes: number
    comments: number
  }
}

/**
 * Comment with associated user information.
 * Used for displaying comments on recommendations.
 */
export interface CommentWithUser {
  /** Unique comment identifier */
  id: string
  /** Text body of the comment (1–500 characters) */
  content: string
  /** Timestamp when the comment was posted */
  createdAt: Date
  /** Minimal user details of the comment author */
  user: {
    id: string
    name: string | null
    image: string | null
  }
}
