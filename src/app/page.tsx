import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, Star, MapPin } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Header } from "@/components/header"
import { AddRecommendationTrigger } from "@/components/add-recommendation-trigger"
import { AddToCliquesDialog } from "@/components/add-to-cliques-dialog"
import { CliqueSidebarWrapper } from "@/components/clique-sidebar-wrapper"
import { CliquePanelWrapper } from "@/components/clique-panel-wrapper"
import { UpvoteButton } from "@/components/upvote-button"
import { auth } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"
import { getCliqueFeed } from "@/lib/clique-service"
import { getMyRecommendations, getRecommendations, type RecommendationFeedItem } from "@/lib/recommendations"
import type { CliqueFeedItem } from "@/types/clique"
import { cn } from "@/lib/utils"

/**
 * Category emoji mapping for placeholder images
 */
const CATEGORY_EMOJIS: Record<string, string> = {
  Movie: "🎬",
  Restaurant: "🍽️",
  Fashion: "👗",
  Household: "🏠",
}

const getCategoryEmoji = (categoryName: string): string =>
  CATEGORY_EMOJIS[categoryName] || "⭐"

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

type HomeFeedItem = {
  id: string
  tags: string[]
  rating: number | null
  imageUrl: string | null
  link: string | null
  entity: RecommendationFeedItem["entity"]
  _count: {
    upvotes: number
    comments: number
  }
  attribution: string | null
  href: string
  /** Present only for clique feed items; enables interactive upvoting. */
  upvoteContext?: {
    cliqueId: string
    hasUpvoted: boolean
  }
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
        recommendations = cliqueFeed.map((item) =>
          normalizeCliqueFeedItem(
            item,
            activeCliqueId,
            upvotedIds.has(item.recommendation.id)
          )
        )
      } else {
        logCliqueFeedDelegateMismatch()
        cliqueError = getCliqueFeedUnavailableMessage()
      }
    } else {
      const clique =
        typeof cliqueDelegate.clique?.findUnique === "function"
          ? await cliqueDelegate.clique.findUnique({
              where: { id: activeCliqueId },
              select: { name: true },
            })
          : (
              await prisma.$queryRaw<{ name: string }[]>`
                SELECT c.name
                FROM "Clique" c
                WHERE c.id = ${activeCliqueId}
                LIMIT 1
              `
            )[0] ?? null
      cliqueError = clique
        ? "You do not have access to this clique feed."
        : "This clique could not be found."
    }
  } else if (activeMine && session?.user?.id) {
    const myFeed = await getMyRecommendations(session.user.id)
    recommendations = myFeed.map((item) => normalizePublicFeedItem(item, false))
  } else {
    const publicFeed = await getRecommendations()
    recommendations = publicFeed.map((item) =>
      normalizePublicFeedItem(item, Boolean(session?.user))
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
            mobileOnly
          />
        ) : undefined}
      />

      {session?.user?.id && (
        <div className="lg:hidden border-b bg-white px-4 py-2 dark:bg-black">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Feed:{" "}
            <span className="font-serif italic text-zinc-800 dark:text-zinc-200">
              {cliqueError
                ? "Unavailable"
                : activeClique?.name ?? (activeMine ? "My Recommendations" : "Public")}
            </span>
          </p>
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
            ) : isEmptyFeed ? (
              <div className="text-center">
                <p className="text-lg text-zinc-500">
                  {activeMine
                    ? "You haven't added any recommendations yet."
                    : "No recommendations yet. Be the first to add one!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {recommendations.map((rec, index) => (
                  <Card
                    key={rec.id}
                    className="group relative flex flex-col overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  >
                    {showAddToCliqueActions && (
                      <div className="pointer-events-auto absolute right-3 top-3 z-20 translate-y-0 opacity-100 transition-all duration-200 delay-100 md:pointer-events-none md:translate-y-1 md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100">
                        <div className="relative">
                          <div className="pointer-events-none absolute -inset-1 rounded-full border-2 border-zinc-400/40 border-t-white/80 opacity-0 transition-opacity duration-150 delay-200 md:group-hover:animate-spin md:group-hover:opacity-100" />
                          <AddToCliquesDialog
                            recommendationId={rec.id}
                            recommendationName={rec.entity.name}
                            variant="icon"
                          />
                        </div>
                      </div>
                    )}
                    <Link href={rec.href} className="flex h-full cursor-pointer flex-col">
                      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
                        {rec.imageUrl ? (
                          <>
                            <Image
                              src={rec.imageUrl}
                              alt=""
                              fill
                              className="scale-110 object-cover opacity-60 blur-2xl"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              aria-hidden="true"
                            />
                            <Image
                              src={rec.imageUrl}
                              alt={rec.entity.name}
                              fill
                              className="z-10 object-contain"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              priority={index === 0}
                            />
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="p-4 text-center">
                              <div className="mb-2 text-4xl" aria-hidden="true">
                                {getCategoryEmoji(rec.entity.category.displayName)}
                              </div>
                              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                {rec.entity.name}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <CardHeader className="pt-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium dark:bg-zinc-800">
                            {rec.entity.category.displayName}
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 flex-shrink-0 ${
                                    (rec.rating || 0) >= star
                                      ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_1px_2px_rgba(234,179,8,0.5)]"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="ml-1 whitespace-nowrap text-xs text-zinc-500">
                              {rec.rating || 0}/10
                            </span>
                          </div>
                        </div>
                        <CardTitle>{rec.entity.name}</CardTitle>
                        {rec.tags.length > 0 && (
                          <div className="mt-2">
                            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                              Why recommended:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {rec.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="px-2 py-0 text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {rec.tags.length > 3 && (
                                <Badge
                                  variant="secondary"
                                  className="px-2 py-0 text-xs"
                                >
                                  +{rec.tags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        {rec.entity.movie && (
                          <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {rec.entity.movie.director && (
                              <p>Director: {rec.entity.movie.director}</p>
                            )}
                            {rec.entity.movie.year && (
                              <p>Year: {rec.entity.movie.year}</p>
                            )}
                            {rec.entity.movie.genre && (
                              <p>Genre: {rec.entity.movie.genre}</p>
                            )}
                            {rec.entity.movie.duration && (
                              <p>Duration: {rec.entity.movie.duration}</p>
                            )}
                          </div>
                        )}
                        {rec.entity.restaurant && (
                          <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {rec.entity.restaurant.cuisine && (
                              <p>Cuisine: {rec.entity.restaurant.cuisine}</p>
                            )}
                            {rec.entity.restaurant.location && (
                              <p className="flex items-start gap-1">
                                <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                                <span>{rec.entity.restaurant.location}</span>
                              </p>
                            )}
                            {rec.entity.restaurant.priceRange && (
                              <p>Price: {rec.entity.restaurant.priceRange}</p>
                            )}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="mt-auto">
                        <div className="flex items-center justify-between text-sm text-zinc-500">
                          <div className="flex gap-4">
                            {rec.upvoteContext ? (
                              <UpvoteButton
                                recommendationId={rec.id}
                                cliqueId={rec.upvoteContext.cliqueId}
                                initialCount={rec._count.upvotes}
                                initialHasUpvoted={rec.upvoteContext.hasUpvoted}
                              />
                            ) : null}
                            {rec.upvoteContext && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      tabIndex={0}
                                      aria-label={`${rec._count.comments} comments`}
                                      className="flex items-center gap-1"
                                    >
                                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                                      {rec._count.comments}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Comments</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {rec.attribution && (
                            <span className="text-right text-xs">{rec.attribution}</span>
                          )}
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
            </div>

            {session?.user?.id && activeClique && (
              <CliquePanelWrapper
                cliqueId={activeClique.id}
                cliqueName={activeClique.name}
                currentUserId={session.user.id}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
