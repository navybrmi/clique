import { prisma } from "@/lib/prisma"
import type { CliqueFeedItem } from "@/types/clique"

/**
 * Returns the recommendation feed for a clique, ordered newest-first.
 *
 * Each item includes:
 * - The name of the member who added/bookmarked the recommendation (`addedByName`)
 * - The submitter's name (`submitterName`) — only populated when the original
 *   submitter is currently a member of the clique; null otherwise to preserve
 *   privacy for users who have since left or were never members.
 *
 * @param cliqueId     The clique whose feed to fetch
 * @param _currentUserId  Reserved for future per-user visibility rules (unused now)
 */
export async function getCliqueFeed(
  cliqueId: string,
  _currentUserId: string
): Promise<CliqueFeedItem[]> {
  const [rows, members] = await Promise.all([
    prisma.cliqueRecommendation.findMany({
      where: { cliqueId },
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
  ])

  const memberIds = new Set(members.map((m) => m.userId))

  return rows.map((row): CliqueFeedItem => ({
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
      },
      _count: {
        upvotes: row.recommendation._count.upvotes,
        comments: row.recommendation._count.comments,
      },
    },
  }))
}
