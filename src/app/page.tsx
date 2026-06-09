import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { AddRecommendationTrigger } from "@/components/add-recommendation-trigger"
import { CliqueSidebarWrapper } from "@/components/clique-sidebar-wrapper"
import { CliquePanelWrapper } from "@/components/clique-panel-wrapper"
import { MobileCliqueActions } from "@/components/mobile-clique-actions"
import { RecommendationFeed } from "@/components/recommendation-feed"
import { auth } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { getCliqueFeed } from "@/lib/clique-service"
import { getMyRecommendations, getRecommendations, type RecommendationFeedItem } from "@/lib/recommendations"
import {
  getLikeTotals,
  getMyCliquesLikeCounts,
  getUserCliquesForRecommendations,
  getWithinCliqueLikeCounts,
  getCliqueCommentCounts,
} from "@/lib/engagement"
import type { CliqueFeedItem } from "@/types/clique"
import type { HomeFeedItem } from "@/types/feed"
import { cn } from "@/lib/utils"

const CLIQUE_FEED_UNAVAILABLE_MESSAGE =
  "Clique feed is temporarily unavailable. Please try again shortly."

const CLIQUE_FEED_DEVELOPMENT_MESSAGE =
  "Clique feed is temporarily unavailable in development. Check the server logs for more details."

/**
 * Returns the user-facing clique feed fallback message for the current environment.
 *
 * @returns Safe clique feed error copy for the homepage UI
 */
function getCliqueFeedUnavailableMessage(): string {
  return process.env.NODE_ENV === "production"
    ? CLIQUE_FEED_UNAVAILABLE_MESSAGE
    : CLIQUE_FEED_DEVELOPMENT_MESSAGE
}

/**
 * Logs the server-side remediation for a missing clique feed Prisma delegate.
 */
function logCliqueFeedDelegateMismatch(): void {
  console.error(
    "Clique feed is temporarily unavailable because the Prisma client is out of date. Run `npx prisma generate` and restart the dev server."
  )
}

interface HomePageProps {
  /** Search params forwarded by the App Router. */
  searchParams?: Promise<{ cliqueId?: string | string[]; mine?: string }>
}

/**
 * Normalizes the public feed shape to the shared homepage card format.
 *
 * @param recommendation - Public feed item
 * @param isAuthenticated - Whether submitter attribution can be shown
 * @returns Shared homepage feed item
 */
function normalizePublicFeedItem(
  recommendation: RecommendationFeedItem,
  isAuthenticated: boolean
): HomeFeedItem {
  return {
    id: recommendation.id,
    tags: recommendation.tags,
    rating: recommendation.rating,
    imageUrl: recommendation.imageUrl,
    link: recommendation.link,
    entity: recommendation.entity,
    _count: recommendation._count,
    attribution: null,
    href: `/recommendations/${recommendation.id}`,
  }
}

/**
 * Builds the public / "My Recommendations" feed cards, enriching each with
 * display-only engagement: the global like total, the "my-cliques" like count
 * (logged-in only), and up to two shared-clique chips (largest by member count).
 *
 * All engagement is computed in batched queries over the visible reco set to
 * avoid per-card round-trips.
 *
 * @param feedItems - Public feed rows from the data layer
 * @param userId - The current user id, or null when logged out
 * @returns Home feed items ready to render
 */
async function buildPublicFeedItems(
  feedItems: RecommendationFeedItem[],
  userId: string | null
): Promise<HomeFeedItem[]> {
  const base = feedItems.map((item) =>
    normalizePublicFeedItem(item, Boolean(userId))
  )
  const recIds = base.map((item) => item.id)

  const [likeTotals, myCliqueLikes, userCliques] = await Promise.all([
    getLikeTotals(recIds),
    userId ? getMyCliquesLikeCounts(recIds, userId) : Promise.resolve(null),
    userId
      ? getUserCliquesForRecommendations(recIds, userId)
      : Promise.resolve(null),
  ])

  return base.map((item) => ({
    ...item,
    engagement: {
      likeTotal: likeTotals.get(item.id) ?? 0,
      likeSecondary: myCliqueLikes ? myCliqueLikes.get(item.id) ?? 0 : null,
    },
    cliqueChips: userCliques
      ? (userCliques.get(item.id) ?? [])
          .slice(0, 2)
          .map((clique) => ({ id: clique.id, name: clique.name }))
      : [],
  }))
}

/**
 * Normalizes the clique feed shape to the shared homepage card format.
 *
 * @param item - Clique feed item
 * @param cliqueId - Active clique ID
 * @param hasUpvoted - Whether the current user has upvoted this recommendation
 * @returns Shared homepage feed item
 */
function normalizeCliqueFeedItem(
  item: CliqueFeedItem,
  cliqueId: string,
  hasUpvoted: boolean
): HomeFeedItem {
  const submitterName = item.submitterName || null
  const addedByName = item.addedByName || null
  const attribution =
    submitterName && addedByName && submitterName !== addedByName
      ? `Submitted by ${submitterName} · Added by ${addedByName}`
      : submitterName
        ? `Submitted by ${submitterName}`
        : addedByName
          ? `Added by ${addedByName}`
          : null

  return {
    id: item.recommendation.id,
    tags: item.recommendation.tags,
    rating: item.recommendation.rating,
    imageUrl: item.recommendation.imageUrl,
    link: item.recommendation.link,
    entity: item.recommendation.entity,
    _count: item.recommendation._count,
    attribution,
    href: `/recommendations/${item.recommendation.id}?cliqueId=${cliqueId}`,
    upvoteContext: { cliqueId, hasUpvoted },
  }
}

/**
 * Home page — server component.
 *
 * Fetches the recommendations feed directly from the database before
 * sending HTML to the browser, eliminating the client-side fetch round-trip.
 */
export default async function Home({ searchParams }: HomePageProps = {}) {
  const [resolvedSearchParams, session] = await Promise.all([
    (searchParams ?? Promise.resolve({})) as Promise<{
      cliqueId?: string | string[]
      mine?: string
    }>,
    auth(),
  ])
  const rawCliqueId = resolvedSearchParams.cliqueId
  const activeCliqueId =
    typeof rawCliqueId === "string"
      ? rawCliqueId
      : Array.isArray(rawCliqueId)
        ? rawCliqueId[0]
        : undefined
  const activeMine = resolvedSearchParams.mine === "true" && Boolean(session?.user?.id)

  let cliqueError: string | null = null
  let recommendations: HomeFeedItem[] = []
  let activeClique: { id: string; name: string } | null = null
  const prisma = getPrismaClient()

  // Fetch the user's cliques once and share across both sidebar instances
  // to avoid a duplicate DB query.
  let userCliques: { id: string; name: string }[] = []
  if (session?.user?.id) {
    const cliqueDelegate = (
      prisma as unknown as {
        clique?: {
          findMany?: (args: {
            where: { members: { some: { userId: string } } }
            select: { id: true; name: true }
            orderBy: { createdAt: "desc" }
          }) => Promise<{ id: string; name: string }[]>
        }
      }
    ).clique
    const userId = session.user.id
    userCliques =
      typeof cliqueDelegate?.findMany === "function"
        ? await cliqueDelegate.findMany({
            where: { members: { some: { userId } } },
            select: { id: true, name: true },
            orderBy: { createdAt: "desc" },
          })
        : await prisma.$queryRaw<{ id: string; name: string }[]>`
            SELECT c.id, c.name
            FROM "Clique" c
            INNER JOIN "CliqueMember" cm ON cm."cliqueId" = c.id
            WHERE cm."userId" = ${userId}
            ORDER BY c."createdAt" DESC
          `
  }

  if (session?.user?.id && activeCliqueId) {
    const userId = session.user.id
    const cliqueDelegate = (
      prisma as unknown as {
        clique?: {
          findFirst?: (args: {
            where: { id: string; members: { some: { userId: string } } }
            select: { id: true; name: true }
          }) => Promise<{ id: string; name: string } | null>
          findUnique?: (args: {
            where: { id: string }
            select: { name: true }
          }) => Promise<{ name: string } | null>
        }
        cliqueRecommendation?: {
          findMany?: unknown
        }
        cliqueMember?: {
          findMany?: unknown
        }
      }
    )

    activeClique =
      typeof cliqueDelegate.clique?.findFirst === "function"
        ? await cliqueDelegate.clique.findFirst({
            where: {
              id: activeCliqueId,
              members: {
                some: { userId },
              },
            },
            select: {
              id: true,
              name: true,
            },
          })
        : (
            await prisma.$queryRaw<{ id: string; name: string }[]>`
              SELECT c.id, c.name
              FROM "Clique" c
              INNER JOIN "CliqueMember" cm ON cm."cliqueId" = c.id
              WHERE c.id = ${activeCliqueId}
                AND cm."userId" = ${userId}
              LIMIT 1
            `
          )[0] ?? null

    if (activeClique) {
      if (
        typeof cliqueDelegate.cliqueRecommendation?.findMany === "function" &&
        typeof cliqueDelegate.cliqueMember?.findMany === "function"
      ) {
        const { items: cliqueFeed } = await getCliqueFeed(activeCliqueId, userId)
        const recIds = cliqueFeed.map((item) => item.recommendation.id)
        const userUpvoteRows =
          recIds.length > 0
            ? await prisma.upVote.findMany({
                where: { userId, recommendationId: { in: recIds } },
                select: { recommendationId: true },
              })
            : []
        const upvotedIds = new Set(userUpvoteRows.map((r) => r.recommendationId))
        const [withinCliqueLikes, cliqueCommentCounts] = await Promise.all([
          getWithinCliqueLikeCounts(recIds, activeCliqueId),
          getCliqueCommentCounts(recIds, activeCliqueId),
        ])
        recommendations = cliqueFeed.map((item) => {
          const base = normalizeCliqueFeedItem(
            item,
            activeCliqueId,
            upvotedIds.has(item.recommendation.id)
          )
          return {
            ...base,
            engagement: {
              likeTotal: item.recommendation._count.upvotes,
              likeSecondary: withinCliqueLikes.get(item.recommendation.id) ?? 0,
            },
            _count: {
              ...base._count,
              comments: cliqueCommentCounts.get(item.recommendation.id) ?? 0,
            },
          }
        })
      } else {
        logCliqueFeedDelegateMismatch()
        cliqueError = getCliqueFeedUnavailableMessage()
      }
    } else {
      const [clique, pendingRows] = await Promise.all([
        typeof cliqueDelegate.clique?.findUnique === "function"
          ? cliqueDelegate.clique.findUnique({
              where: { id: activeCliqueId },
              select: { name: true },
            })
          : prisma.$queryRaw<{ name: string }[]>`
              SELECT c.name FROM "Clique" c WHERE c.id = ${activeCliqueId} LIMIT 1
            `.then((rows) => rows[0] ?? null),
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) AS count
          FROM "CliqueMembershipRequest"
          WHERE "cliqueId" = ${activeCliqueId}
            AND "userId" = ${userId}
            AND status = 'PENDING'
        `,
      ])
      const hasPendingRequest = Number(pendingRows[0]?.count ?? 0) > 0
      cliqueError = hasPendingRequest
        ? "Your request to join this clique is pending approval from the creator."
        : clique
          ? "You do not have access to this clique feed."
          : "This clique could not be found."
    }
  } else if (activeMine && session?.user?.id) {
    const myFeed = await getMyRecommendations(session.user.id)
    recommendations = await buildPublicFeedItems(myFeed, session.user.id)
  } else {
    const publicFeed = await getRecommendations()
    recommendations = await buildPublicFeedItems(
      publicFeed,
      session?.user?.id ?? null
    )
  }
  const isEmptyFeed = !cliqueError && recommendations.length === 0
  const showAddToCliqueActions = Boolean(session?.user?.id) && !activeCliqueId

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <Header
        session={session}
        showCliqueHint
        pageTitle="Share Your Favorite Things"
        mobileMenuSlot={session?.user?.id ? (
          <CliqueSidebarWrapper
            userId={session.user.id}
            activeCliqueId={activeCliqueId}
            activeMine={activeMine}
            currentCliqueId={activeCliqueId}
            prefetchedCliques={userCliques}
            mobileOnly
          />
        ) : undefined}
      />

      {session?.user?.id && (
        <div className="lg:hidden sticky top-[60px] z-40 flex items-center justify-between border-b bg-white px-4 py-2 dark:bg-black">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Feed:{" "}
            <span className="font-serif italic text-zinc-800 dark:text-zinc-200">
              {cliqueError
                ? "Unavailable"
                : activeClique?.name ?? (activeMine ? "My Recommendations" : "Public")}
            </span>
          </p>
          {activeClique && session.user?.id && (
            <MobileCliqueActions
              cliqueId={activeClique.id}
              cliqueName={activeClique.name}
              currentUserId={session.user.id}
            />
          )}
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {!session?.user?.id && (
            <div className="mb-6 text-center">
              <p className="mx-auto max-w-2xl text-xl text-zinc-600 dark:text-zinc-400">
                Discover and share recommendations for restaurants, movies, fashion,
                household items, and more with your friends.
              </p>
              <AddRecommendationTrigger
                userId={null}
                currentCliqueId={activeCliqueId}
              />
            </div>
          )}

          <div
            className={cn(
              "space-y-8",
              session?.user?.id &&
                "lg:grid lg:items-start lg:gap-10 lg:space-y-0",
              session?.user?.id && !activeClique &&
                "lg:grid-cols-[260px_minmax(0,1fr)]",
              session?.user?.id && activeClique &&
                "lg:grid-cols-[260px_minmax(0,1fr)_220px]"
            )}
          >
            {session?.user?.id && (
              <CliqueSidebarWrapper
                userId={session.user.id}
                activeCliqueId={activeCliqueId}
                activeMine={activeMine}
                currentCliqueId={activeCliqueId}
                prefetchedCliques={userCliques}
              />
            )}

            <div
              data-testid="feed-content-container"
              className={cn(isEmptyFeed && session?.user?.id && !activeClique && "lg:col-span-2")}
            >
              {cliqueError ? (
                <Card className="mx-auto max-w-2xl">
                  <CardHeader>
                    <CardTitle>Unable to open this clique feed</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-zinc-600 dark:text-zinc-400">{cliqueError}</p>
                    <Button asChild>
                      <Link href="/">Back to Public Feed</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <RecommendationFeed
                  recommendations={recommendations}
                  showAddToCliqueActions={showAddToCliqueActions}
                  activeMine={activeMine}
                />
              )}
            </div>

            {session?.user?.id && activeClique && (
              <div className="hidden lg:block">
                <CliquePanelWrapper
                  cliqueId={activeClique.id}
                  cliqueName={activeClique.name}
                  currentUserId={session.user.id}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
