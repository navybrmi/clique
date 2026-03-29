import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, MessageCircle, Star, MapPin } from "lucide-react"
import { Header } from "@/components/header"
import { AddRecommendationTrigger } from "@/components/add-recommendation-trigger"
import { getRecommendations } from "@/lib/recommendations"
import { auth } from "@/lib/auth"

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

/**
 * Home page — server component.
 *
 * Fetches the recommendations feed directly from the database before
 * sending HTML to the browser, eliminating the client-side fetch round-trip.
 */
export default async function Home() {
  const [recommendations, session] = await Promise.all([getRecommendations(), auth()])

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <Header session={session} />

      <main className="container mx-auto px-4 py-16">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-5xl font-bold tracking-tight">
            Share Your Favorite Things
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-zinc-600 dark:text-zinc-400">
            Discover and share recommendations for restaurants, movies, fashion,
            household items, and more with your friends.
          </p>
          <AddRecommendationTrigger userId={session?.user?.id ?? null} />
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-zinc-500">
              No recommendations yet. Be the first to add one!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec, index) => (
              <Link key={rec.id} href={`/recommendations/${rec.id}`}>
                <Card className="overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                  <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
                    {rec.imageUrl ? (
                      <>
                        <Image
                          src={rec.imageUrl}
                          alt=""
                          fill
                          className="object-cover blur-2xl scale-110 opacity-60"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          aria-hidden="true"
                        />
                        <Image
                          src={rec.imageUrl}
                          alt={rec.entity.name}
                          fill
                          className="object-contain z-10"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority={index === 0}
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-4">
                          <div className="text-4xl mb-2" aria-hidden="true">
                            {getCategoryEmoji(rec.entity.category.displayName)}
                          </div>
                          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            {rec.entity.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="mb-2 flex items-start justify-between gap-2 flex-wrap">
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium dark:bg-zinc-800">
                        {rec.entity.category.displayName}
                      </span>
                      <div className="flex items-center gap-1 min-w-fit">
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
                        <span className="text-xs text-zinc-500 ml-1 whitespace-nowrap">
                          {rec.rating || 0}/10
                        </span>
                      </div>
                    </div>
                    <CardTitle>{rec.entity.name}</CardTitle>
                    {rec.tags && rec.tags.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium mb-2 text-zinc-600 dark:text-zinc-400">
                          Why recommended:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {rec.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs px-2 py-0"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {rec.tags.length > 3 && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-2 py-0"
                            >
                              +{rec.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {rec.entity.movie && (
                      <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {rec.entity.movie.director && (
                          <p>Director: {rec.entity.movie.director}</p>
                        )}
                        {rec.entity.movie.releaseYear && (
                          <p>Year: {rec.entity.movie.releaseYear}</p>
                        )}
                        {rec.entity.movie.genre && (
                          <p>Genre: {rec.entity.movie.genre}</p>
                        )}
                        {rec.entity.movie.duration && (
                          <p>Duration: {rec.entity.movie.duration} mins</p>
                        )}
                      </div>
                    )}
                    {rec.entity.restaurant && (
                      <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {rec.entity.restaurant.cuisine && (
                          <p>Cuisine: {rec.entity.restaurant.cuisine}</p>
                        )}
                        {rec.entity.restaurant.location && (
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {rec.entity.restaurant.location}
                            </span>
                          </p>
                        )}
                        {rec.entity.restaurant.priceRange && (
                          <p>Price: {rec.entity.restaurant.priceRange}</p>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                          <ArrowUp className="h-4 w-4" />
                          {rec._count.upvotes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {rec._count.comments}
                        </span>
                      </div>
                      <span className="text-xs">
                        by {rec.user.name || "Anonymous"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
