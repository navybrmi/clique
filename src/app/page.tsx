"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, MessageCircle, Star } from "lucide-react"
import { AddRecommendationDialog } from "@/components/add-recommendation-dialog"
import { Header } from "@/components/header"

type Recommendation = {
  id: string
  title: string
  description: string | null
  category: string
  rating: number | null
  imageUrl: string | null
  director?: string | null
  year?: number | null
  genre?: string | null
  duration?: string | null
  movieAttributes?: string[]
  user: {
    name: string | null
  }
  _count: {
    upvotes: number
    comments: number
  }
}

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
            <div className="mt-4">
              <AddRecommendationDialog onSuccess={fetchRecommendations} />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec) => (
              <Link key={rec.id} href={`/recommendations/${rec.id}`}>
                <Card className="overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                  {(rec.category === 'MOVIE' || rec.category === 'RESTAURANT') && rec.imageUrl && (
                    <div className="relative h-48 w-full">
                      <Image
                        src={rec.imageUrl}
                        alt={rec.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="mb-2 flex items-start justify-between gap-2 flex-wrap">
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium dark:bg-zinc-800">
                        {rec.category}
                      </span>
                      <div className="flex items-center gap-1 min-w-fit">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
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
                    <CardTitle>{rec.title}</CardTitle>
                    <CardDescription>{rec.description}</CardDescription>
                    {rec.category === 'MOVIE' && (
                      <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {rec.director && <p>Director: {rec.director}</p>}
                        {rec.year && <p>Year: {rec.year}</p>}
                        {rec.genre && <p>Genre: {rec.genre}</p>}
                        {rec.duration && <p>Duration: {rec.duration}</p>}
                        {rec.movieAttributes && rec.movieAttributes.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium mb-1">Why watch:</p>
                            <div className="flex flex-wrap gap-1">
                              {rec.movieAttributes.slice(0, 3).map((attr) => (
                                <Badge key={attr} variant="secondary" className="text-xs px-2 py-0">
                                  {attr}
                                </Badge>
                              ))}
                              {rec.movieAttributes.length > 3 && (
                                <Badge variant="secondary" className="text-xs px-2 py-0">
                                  +{rec.movieAttributes.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
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

