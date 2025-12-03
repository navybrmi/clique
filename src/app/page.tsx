"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, MessageCircle } from "lucide-react"
import { AddRecommendationDialog } from "@/components/add-recommendation-dialog"

type Recommendation = {
  id: string
  title: string
  description: string | null
  category: string
  rating: number | null
  user: {
    name: string | null
  }
  _count: {
    likes: number
    comments: number
  }
}

export default function Home() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecommendations = () => {
    setLoading(true)
    fetch('/api/recommendations')
      .then(res => res.json())
      .then(data => {
        setRecommendations(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching recommendations:', error)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-black/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-2xl font-bold">Clique</h1>
          <nav className="flex items-center gap-4">
            <Button variant="ghost">Sign In</Button>
            <Button>Get Started</Button>
          </nav>
        </div>
      </header>

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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec) => (
              <Link key={rec.id} href={`/recommendations/${rec.id}`}>
                <Card className="overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium dark:bg-zinc-800">
                        {rec.category}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-zinc-500">
                        ⭐ {rec.rating || 0}
                      </div>
                    </div>
                    <CardTitle>{rec.title}</CardTitle>
                    <CardDescription>{rec.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                      <div className="flex gap-4">
                        <button 
                          className="flex items-center gap-1 transition-colors hover:text-red-500"
                          onClick={(e) => {
                            e.preventDefault()
                            // Like functionality will be implemented later
                          }}
                        >
                          <Heart className="h-4 w-4" />
                          {rec._count.likes}
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

