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
      releaseYear?: number | null
      genre?: string | null
      duration?: number | null
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

export async function getRecommendations(): Promise<RecommendationFeedItem[]> {
  const rows = await prisma.recommendation.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      entity: {
        include: {
          category: true,
          restaurant: true,
          movie: true,
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
  return rows as unknown as RecommendationFeedItem[]
}
