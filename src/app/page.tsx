import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, MessageCircle, Plus } from "lucide-react"

export default function Home() {
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
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Add Recommendation
            </Button>
            <Button size="lg" variant="outline">
              Browse Categories
            </Button>
          </div>
        </div>

        {/* Sample Recommendations */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sampleRecommendations.map((rec) => (
            <Card key={rec.id} className="overflow-hidden transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium dark:bg-zinc-800">
                    {rec.category}
                  </span>
                  <div className="flex items-center gap-1 text-sm text-zinc-500">
                    ⭐ {rec.rating}
                  </div>
                </div>
                <CardTitle>{rec.title}</CardTitle>
                <CardDescription>{rec.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-zinc-500">
                  <div className="flex gap-4">
                    <button className="flex items-center gap-1 transition-colors hover:text-red-500">
                      <Heart className="h-4 w-4" />
                      {rec.likes}
                    </button>
                    <button className="flex items-center gap-1 transition-colors hover:text-blue-500">
                      <MessageCircle className="h-4 w-4" />
                      {rec.comments}
                    </button>
                  </div>
                  <span className="text-xs">by {rec.user}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}

const sampleRecommendations = [
  {
    id: 1,
    title: "The Italian Corner",
    description: "Amazing authentic pasta and incredible tiramisu!",
    category: "Restaurant",
    rating: 4.8,
    likes: 24,
    comments: 8,
    user: "Sarah M."
  },
  {
    id: 2,
    title: "Oppenheimer",
    description: "A masterpiece of cinema. Must watch in IMAX!",
    category: "Movie",
    rating: 4.9,
    likes: 42,
    comments: 15,
    user: "John D."
  },
  {
    id: 3,
    title: "Minimalist Backpack",
    description: "Perfect for daily commute, durable and stylish.",
    category: "Fashion",
    rating: 4.5,
    likes: 18,
    comments: 5,
    user: "Emma K."
  }
]

