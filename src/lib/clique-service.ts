import { getPrismaClient } from "@/lib/prisma"
import type { CliqueFeedItem } from "@/types/clique"

export interface CliqueFeedPage {
  items: CliqueFeedItem[]
  total: number
}

/**
 * Returns a paginated recommendation feed for a clique, ordered newest-first.
 *
 * Each item includes:
 * - The name of the member who added/bookmarked the recommendation (`addedByName`)
 * - The submitter's name (`submitterName`) — only populated when the original
 *   submitter is currently a member of the clique; null otherwise to preserve
 *   privacy for users who have since left or were never members.
 *
 * @param cliqueId       The clique whose feed to fetch
 * @param _currentUserId Reserved for future per-user visibility rules (unused now)
 * @param options        Optional pagination: skip (offset) and take (page size)
 */
export async function getCliqueFeed(
  cliqueId: string,
  _currentUserId: string,
  options: { skip?: number; take?: number } = {}
): Promise<CliqueFeedPage> {
  void _currentUserId
  const prisma = getPrismaClient()
  const { skip = 0, take } = options

  const [rows, members, total] = await Promise.all([
    prisma.cliqueRecommendation.findMany({
      where: { cliqueId },
      ...(skip > 0 ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
      include: {
        addedBy: { select: { name: true } },
        recommendation: {
          select: {
            id: true,
            tags: true,
            link: true,
            imageUrl: true,
            rating: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
            entity: {
              select: {
                id: true,
                name: true,
                category: {
                  select: { id: true, name: true, displayName: true },
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
            _count: { select: { upvotes: true, comments: true } },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    }),
    prisma.cliqueMember.findMany({
      where: { cliqueId },
      select: { userId: true },
    }),
    prisma.cliqueRecommendation.count({ where: { cliqueId } }),
  ])

  const memberIds = new Set(members.map((m) => m.userId))

  const items = rows.map((row): CliqueFeedItem => ({
    id: row.recommendationId,
    recommendationId: row.recommendationId,
    addedAt: row.addedAt,
    submitterName: memberIds.has(row.recommendation.user.id)
      ? row.recommendation.user.name
      : null,
    addedByName: row.addedBy.name,
    recommendation: {
      id: row.recommendation.id,
      tags: row.recommendation.tags,
      link: row.recommendation.link,
      imageUrl: row.recommendation.imageUrl,
      rating: row.recommendation.rating,
      createdAt: row.recommendation.createdAt,
      entity: {
        id: row.recommendation.entity.id,
        name: row.recommendation.entity.name,
        category: {
          id: row.recommendation.entity.category.id,
          name: row.recommendation.entity.category.name,
          displayName: row.recommendation.entity.category.displayName,
        },
        restaurant: row.recommendation.entity.restaurant
          ? {
              cuisine: row.recommendation.entity.restaurant.cuisine ?? null,
              location: row.recommendation.entity.restaurant.location ?? null,
              priceRange: row.recommendation.entity.restaurant.priceRange ?? null,
            }
          : null,
        movie: row.recommendation.entity.movie
          ? {
              director: row.recommendation.entity.movie.director ?? null,
              year: row.recommendation.entity.movie.year ?? null,
              genre: row.recommendation.entity.movie.genre ?? null,
              duration: row.recommendation.entity.movie.duration ?? null,
            }
          : null,
        fashion: (row.recommendation.entity.fashion ?? null) as Record<
          string,
          unknown
        > | null,
        household: (row.recommendation.entity.household ?? null) as Record<
          string,
          unknown
        > | null,
        other: (row.recommendation.entity.other ?? null) as Record<
          string,
          unknown
        > | null,
      },
      _count: {
        upvotes: row.recommendation._count.upvotes,
        comments: row.recommendation._count.comments,
      },
    },
  }))

  return { items, total }
}
