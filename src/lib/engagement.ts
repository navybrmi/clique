import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Engagement read helpers for the clique-scoped feed.
 *
 * Every helper is **batched**: it accepts a list of recommendation ids and
 * returns a `Map` keyed by recommendation id, so a feed render issues a single
 * query per metric rather than one query per card (no N+1).
 *
 * Relational aggregates (co-member like counts, member-count ranking) are
 * expressed as `$queryRaw` using the repo convention — `IN (${Prisma.join(ids)})`
 * — because they are awkward to express through the Prisma query API. The two
 * plain counts use `groupBy`. All helpers short-circuit on an empty id list so
 * `Prisma.join` is never handed an empty array.
 */

/** A clique the current user belongs to, with its total member count. */
export interface CliqueRef {
  id: string
  name: string
  memberCount: number
}

/**
 * Global upvote totals per recommendation — counts every like across all
 * cliques, including cliques the current user is not a member of.
 *
 * @param recIds - Recommendation ids to aggregate
 * @returns Map of recommendation id -> total like count (absent ids imply 0)
 */
export async function getLikeTotals(
  recIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (recIds.length === 0) return result

  const rows = await prisma.upVote.groupBy({
    by: ["recommendationId"],
    where: { recommendationId: { in: recIds } },
    _count: { _all: true },
  })
  for (const row of rows) {
    result.set(row.recommendationId, row._count._all)
  }
  return result
}

/**
 * "My-cliques" like counts — the number of **distinct** users who liked a
 * recommendation and who share at least one clique (that contains the
 * recommendation) with the current user. A user in multiple shared cliques is
 * counted once, so the total never double-counts.
 *
 * @param recIds - Recommendation ids to aggregate
 * @param userId - The current user whose shared cliques scope the count
 * @returns Map of recommendation id -> distinct shared-clique liker count
 */
export async function getMyCliquesLikeCounts(
  recIds: string[],
  userId: string
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (recIds.length === 0) return result

  const rows = await prisma.$queryRaw<
    Array<{ recommendationId: string; cnt: bigint }>
  >(Prisma.sql`
    SELECT uv."recommendationId" AS "recommendationId",
           COUNT(DISTINCT uv."userId") AS cnt
    FROM "UpVote" uv
    WHERE uv."recommendationId" IN (${Prisma.join(recIds)})
      AND EXISTS (
        SELECT 1
        FROM "CliqueRecommendation" cr
        JOIN "CliqueMember" cm_liker
          ON cm_liker."cliqueId" = cr."cliqueId"
         AND cm_liker."userId" = uv."userId"
        JOIN "CliqueMember" cm_me
          ON cm_me."cliqueId" = cr."cliqueId"
         AND cm_me."userId" = ${userId}
        WHERE cr."recommendationId" = uv."recommendationId"
      )
    GROUP BY uv."recommendationId"
  `)
  for (const row of rows) {
    result.set(row.recommendationId, Number(row.cnt))
  }
  return result
}

/**
 * Within-clique like counts — the number of likers on a recommendation who are
 * members of the given clique. Used for the "likes within this clique" figure
 * on clique-feed cards and the clique-context detail view.
 *
 * @param recIds - Recommendation ids to aggregate
 * @param cliqueId - The active clique scoping the count
 * @returns Map of recommendation id -> like count from that clique's members
 */
export async function getWithinCliqueLikeCounts(
  recIds: string[],
  cliqueId: string
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (recIds.length === 0) return result

  const rows = await prisma.$queryRaw<
    Array<{ recommendationId: string; cnt: bigint }>
  >(Prisma.sql`
    SELECT uv."recommendationId" AS "recommendationId",
           COUNT(*) AS cnt
    FROM "UpVote" uv
    JOIN "CliqueMember" cm
      ON cm."userId" = uv."userId"
     AND cm."cliqueId" = ${cliqueId}
    WHERE uv."recommendationId" IN (${Prisma.join(recIds)})
    GROUP BY uv."recommendationId"
  `)
  for (const row of rows) {
    result.set(row.recommendationId, Number(row.cnt))
  }
  return result
}

/**
 * For each recommendation, the cliques the current user belongs to that contain
 * it, ranked by total member count (descending, then name ascending for stable
 * ties). Feed cards slice this to the top 2 chips; the detail view lists all.
 *
 * @param recIds - Recommendation ids to look up
 * @param userId - The current user whose memberships scope the result
 * @returns Map of recommendation id -> ranked list of the user's cliques
 */
export async function getUserCliquesForRecommendations(
  recIds: string[],
  userId: string
): Promise<Map<string, CliqueRef[]>> {
  const result = new Map<string, CliqueRef[]>()
  if (recIds.length === 0) return result

  const rows = await prisma.$queryRaw<
    Array<{ recommendationId: string; id: string; name: string; memberCount: bigint }>
  >(Prisma.sql`
    SELECT cr."recommendationId" AS "recommendationId",
           c."id" AS id,
           c."name" AS name,
           COUNT(cm_all."userId") AS "memberCount"
    FROM "CliqueRecommendation" cr
    JOIN "Clique" c
      ON c."id" = cr."cliqueId"
    JOIN "CliqueMember" cm_me
      ON cm_me."cliqueId" = c."id"
     AND cm_me."userId" = ${userId}
    LEFT JOIN "CliqueMember" cm_all
      ON cm_all."cliqueId" = c."id"
    WHERE cr."recommendationId" IN (${Prisma.join(recIds)})
    GROUP BY cr."recommendationId", c."id", c."name"
    ORDER BY COUNT(cm_all."userId") DESC, c."name" ASC
  `)
  for (const row of rows) {
    const list = result.get(row.recommendationId) ?? []
    list.push({ id: row.id, name: row.name, memberCount: Number(row.memberCount) })
    result.set(row.recommendationId, list)
  }
  return result
}

/**
 * Per-clique comment thread sizes — the number of comments on each
 * recommendation that belong to the given clique's exclusive thread.
 *
 * @param recIds - Recommendation ids to aggregate
 * @param cliqueId - The clique whose thread sizes to count
 * @returns Map of recommendation id -> comment count in that clique's thread
 */
export async function getCliqueCommentCounts(
  recIds: string[],
  cliqueId: string
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (recIds.length === 0) return result

  const rows = await prisma.comment.groupBy({
    by: ["recommendationId"],
    where: { recommendationId: { in: recIds }, cliqueId },
    _count: { _all: true },
  })
  for (const row of rows) {
    result.set(row.recommendationId, row._count._all)
  }
  return result
}
