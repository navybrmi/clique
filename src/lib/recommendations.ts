import { prisma } from "@/lib/prisma"

export type RecommendationFeedItem = {
  id: string
  tags: string[]
  rating: number | null
  imageUrl: string | null
  link: string | null
  user: {
    name: string | null
  }
  entity: {
    name: string
    category: {
      displayName: string
    }
    restaurant?: {
      cuisine?: string | null
      location?: string | null
      priceRange?: string | null
    } | null
    movie?: {
      director?: string | null
      year?: number | null
      genre?: string | null
      duration?: string | null
    } | null
    fashion?: Record<string, unknown> | null
    household?: Record<string, unknown> | null
    other?: Record<string, unknown> | null
  }
  _count: {
    upvotes: number
    comments: number
  }
}

/**
 * Fetches the recommendation feed with related data, ordered by newest first.
 *
 * Each item includes:
 * - The recommending user's name
 * - The associated entity with its category and category-specific details
 *   (restaurant, movie, fashion, household, other)
 * - Aggregated counts for upvotes and comments
 *
 * Results are ordered by recommendation `createdAt` in descending order.
 *
 * @returns Promise that resolves to an array of recommendation feed items.
 */
export async function getRecommendations(): Promise<RecommendationFeedItem[]> {
  const rows = await prisma.recommendation.findMany({
    select: {
      id: true,
      tags: true,
      rating: true,
      imageUrl: true,
      link: true,
      user: {
        select: {
          name: true,
        },
      },
      entity: {
        select: {
          name: true,
          category: {
            select: {
              displayName: true,
            },
          },
          restaurant: {
            select: {
              cuisine: true,
              location: true,
              priceRange: true,
            },
          },
          movie: {
            select: {
              director: true,
              year: true,
              genre: true,
              duration: true,
            },
          },
          fashion: true,
          household: true,
          other: true,
        },
      },
      _count: {
        select: {
          upvotes: true,
          comments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
  return rows.map((row): RecommendationFeedItem => ({
    id: row.id,
    tags: row.tags,
    rating: row.rating,
    imageUrl: row.imageUrl,
    link: row.link,
    user: {
      name: row.user.name,
    },
    entity: {
      name: row.entity.name,
      category: {
        displayName: row.entity.category.displayName,
      },
      restaurant: row.entity.restaurant
        ? {
            cuisine: row.entity.restaurant.cuisine ?? null,
            location: row.entity.restaurant.location ?? null,
            priceRange: row.entity.restaurant.priceRange ?? null,
          }
        : null,
      movie: row.entity.movie
        ? {
            director: row.entity.movie.director ?? null,
            year: row.entity.movie.year ?? null,
            genre: row.entity.movie.genre ?? null,
            duration: row.entity.movie.duration ?? null,
          }
        : null,
      fashion: (row.entity.fashion ?? null) as Record<string, unknown> | null,
      household: (row.entity.household ?? null) as Record<string, unknown> | null,
      other: (row.entity.other ?? null) as Record<string, unknown> | null,
    },
    _count: {
      upvotes: row._count.upvotes,
      comments: row._count.comments,
    },
  }))
}
