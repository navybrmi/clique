"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, MessageCircle, Star } from "lucide-react"
import { AddRecommendationDialog } from "@/components/add-recommendation-dialog"
import { Header } from "@/components/header"

/**
 * Recommendation data structure for the home page feed
 */
type Recommendation = {
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
    restaurant?: any
    movie?: any
    fashion?: any
    household?: any
    other?: any
  }
  _count: {
    upvotes: number
    comments: number
  }
}

/**
 * Category emoji mapping for placeholder images
 */
const CATEGORY_EMOJIS: Record<string, string> = {
  'Movie': '🎬',
  'Restaurant': '🍽️',
  'Fashion': '👗',
  'Household': '🏠',
}

/**
 * Get emoji for a category, with fallback for unknown categories
 * @param categoryName - Display name of the category
 * @returns Emoji representing the category
 */
const getCategoryEmoji = (categoryName: string): string => {
  return CATEGORY_EMOJIS[categoryName] || '⭐'
}

/**
 * Home page component - Main feed of recommendations.
 * 
 * Displays a grid of recommendation cards with:
 * - Category badges
 * - Entity images and names
 * - User ratings
 * - Tags
 * - Engagement metrics (upvotes, comments)
 * - Category-specific metadata (cuisine, genre, etc.)
 * 
 * Features:
 * - Automatic data fetching on mount
 * - Add new recommendation dialog
 * - Loading and error states
 * - Responsive grid layout
 * 
 * @returns The home page with recommendation feed
 */
export default function Home() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecommendations = () => {
    setLoading(true)
    fetch('/api/recommendations')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        // Ensure data is an array
        if (Array.isArray(data)) {
          setRecommendations(data)
        } else {
          console.error('Expected array, got:', data)
          setRecommendations([])
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching recommendations:', error)
        setRecommendations([])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <Header />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-5xl font-bold tracking-tight">
            Share Your Favorite Things
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-zinc-600 dark:text-zinc-400">
            Discover and share recommendations for restaurants, movies, fashion, household items, and more with your friends.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <AddRecommendationDialog onSuccess={fetchRecommendations} />
            <Button size="lg" variant="outline">
              Browse Categories
            </Button>
          </div>
        </div>

        {/* Recommendations */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg text-zinc-500">Loading recommendations...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-zinc-500">No recommendations yet. Be the first to add one!</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec) => (
              <Link key={rec.id} href={`/recommendations/${rec.id}`}>
                <Card className="overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                  <div className="relative h-48 w-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
                    {rec.imageUrl ? (
                      <Image
                        src={rec.imageUrl}
                        alt={rec.entity.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
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
                          {[1,2,3,4,5,6,7,8,9,10].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 flex-shrink-0 ${
                                (rec.rating || 0) >= star
                                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_1px_2px_rgba(234,179,8,0.5)]'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-zinc-500 ml-1 whitespace-nowrap">{rec.rating || 0}/10</span>
                      </div>
                    </div>
                    <CardTitle>{rec.entity.name}</CardTitle>
                    {rec.tags && rec.tags.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium mb-2 text-zinc-600 dark:text-zinc-400">Why recommended:</p>
                        <div className="flex flex-wrap gap-1">
                          {rec.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {rec.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">
                              +{rec.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {rec.entity.movie && (
                      <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {rec.entity.movie.director && <p>Director: {rec.entity.movie.director}</p>}
                        {rec.entity.movie.releaseYear && <p>Year: {rec.entity.movie.releaseYear}</p>}
                        {rec.entity.movie.genre && <p>Genre: {rec.entity.movie.genre}</p>}
                        {rec.entity.movie.duration && <p>Duration: {rec.entity.movie.duration} mins</p>}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      <div className="flex gap-4">
                        <button 
                          className="flex items-center gap-1 transition-colors hover:text-red-500"
                          onClick={(e) => {
                            e.preventDefault()
                            // UpVote functionality will be implemented later
                          }}
                        >
                          <ArrowUp className="h-4 w-4" />
                          {rec._count.upvotes}
                        </button>
                        <button 
                          className="flex items-center gap-1 transition-colors hover:text-blue-500"
                          onClick={(e) => {
                            e.preventDefault()
                            // Comment functionality will be implemented later
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {rec._count.comments}
                        </button>
                      </div>
                      <span className="text-xs">by {rec.user.name || 'Anonymous'}</span>
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

