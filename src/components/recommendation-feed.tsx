"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { MessageCircle, Star, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CategoryFilter, FILTER_OPTIONS } from "@/components/category-filter"
import { AddToCliquesDialog } from "@/components/add-to-cliques-dialog"
import { UpvoteButton } from "@/components/upvote-button"
import { CliqueChips } from "@/components/clique-chips"
import { LikeCounts } from "@/components/like-counts"
import type { HomeFeedItem } from "@/types/feed"

const CATEGORY_EMOJIS: Record<string, string> = {
  Movie: "🎬",
  Restaurant: "🍽️",
  Fashion: "👗",
  Household: "🏠",
}

const getCategoryEmoji = (categoryName: string): string =>
  CATEGORY_EMOJIS[categoryName] || "⭐"

interface RecommendationFeedProps {
  recommendations: HomeFeedItem[]
  showAddToCliqueActions: boolean
  activeMine: boolean
}

export function RecommendationFeed({
  recommendations,
  showAddToCliqueActions,
  activeMine,
}: RecommendationFeedProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    FILTER_OPTIONS.map((o) => o.value)
  )

  const filteredRecommendations = useMemo(() => {
    if (
      selectedCategories.length === 0 ||
      selectedCategories.length === FILTER_OPTIONS.length
    ) {
      return recommendations
    }
    return recommendations.filter((rec) =>
      selectedCategories.includes(rec.entity.category.displayName)
    )
  }, [recommendations, selectedCategories])

  const isFeedEmpty = recommendations.length === 0
  const isFilterEmpty = !isFeedEmpty && filteredRecommendations.length === 0

  return (
    <div className="space-y-4">
      <CategoryFilter
        selectedCategories={selectedCategories}
        onChange={setSelectedCategories}
      />

      {isFeedEmpty ? (
        <div className="text-center">
          <p className="text-lg text-zinc-500">
            {activeMine
              ? "You haven't added any recommendations yet."
              : "No recommendations yet. Be the first to add one!"}
          </p>
        </div>
      ) : isFilterEmpty ? (
        <div className="text-center">
          <p className="text-lg text-zinc-500">No recommendations of this type yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredRecommendations.map((rec, index) => (
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
              <Link href={rec.href} className="flex flex-1 cursor-pointer flex-col">
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
              </Link>
              {/* Footer lives outside the card-wide Link so clique chips can be
                  their own links (no nested anchors). */}
              <CardContent className="mt-auto space-y-2">
                {!rec.upvoteContext && rec.cliqueChips && rec.cliqueChips.length > 0 && (
                  <CliqueChips chips={rec.cliqueChips} />
                )}
                <div className="flex items-center justify-between text-sm text-zinc-500">
                  <div className="flex gap-4">
                    {rec.upvoteContext ? (
                      <>
                        <UpvoteButton
                          recommendationId={rec.id}
                          cliqueId={rec.upvoteContext.cliqueId}
                          initialCount={rec._count.upvotes}
                          initialHasUpvoted={rec.upvoteContext.hasUpvoted}
                        />
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
                      </>
                    ) : rec.engagement ? (
                      <LikeCounts
                        total={rec.engagement.likeTotal}
                        secondary={rec.engagement.likeSecondary}
                      />
                    ) : null}
                  </div>
                  {rec.attribution && (
                    <span className="text-right text-xs">{rec.attribution}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
